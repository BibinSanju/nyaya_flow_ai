import os
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environments
load_dotenv()

from schemas import (
    UserAuthRequest, UserAuthResponse,
    CaseClassifyRequest, CaseClassifyResponse,
    DocumentAuditRequest, DocumentAuditResponse,
    BnsSuggestionRequest, BnsSuggestionResponse,
    CaseSummaryRequest, CaseSummaryResponse,
    ArchiveRequest, CourtOrderRequest,
    UpdateAdvocateRequest, UpdateCnrRequest
)
from services.gemini import GeminiService
from db.database import DatabaseManager

app = FastAPI(
    title="NyayaFlow AI Backend Service",
    description="Sovereign AI advisory engine for Indian Judiciary workflows, utilizing Gemini LLM. Human in the Loop.",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
gemini_service = GeminiService()
db = DatabaseManager()

# Helper for IP extraction
def get_ip(request: Request) -> str:
    client = request.client
    return client.host if client else "127.0.0.1"

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Simple status probe for container deployments (Vercel/Railway)."""
    return {
        "status": "healthy",
        "sovereign_node": "active",
        "gemini_connection": "sandbox" if not gemini_service.has_api_key else "authenticated"
    }

@app.post("/api/auth/login", response_model=UserAuthResponse)
async def login_or_register(req: UserAuthRequest, request: Request):
    """Authenticate or register system users."""
    try:
        user = db.get_or_create_user(req.email, req.full_name, req.role, req.phone)
        db.create_audit_log(user["id"], f"User login / registration role: {req.role}", get_ip(request))
        return UserAuthResponse(
            success=True,
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            phone=user.get("phone")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication nodes down: {str(e)}"
        )

@app.get("/api/advocates")
async def list_advocates(request: Request):
    """List matching advocate profiles."""
    try:
        return db.get_advocate_profiles()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch advocates ledger: {str(e)}"
        )

@app.get("/api/petitions")
async def list_petitions():
    """List all registered petitions."""
    try:
        return db.get_petitions()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch petitions index: {str(e)}"
        )

@app.post("/api/case/classify", response_model=CaseClassifyResponse)
async def classify_case(req: CaseClassifyRequest, request: Request):
    """Citizen entrypoint to classify text description into legal categories, courts, and acts checklists."""
    try:
        result = gemini_service.classify_petition(req.description, req.language)
        
        # If citizen_id is supplied, auto-create petition row in DB
        petition_id = None
        if req.citizen_id:
            petition_id = db.create_petition(
                req.citizen_id,
                result.get("category", "Property Dispute (Civil)"),
                req.description,
                req.language or "auto",
                result.get("suggested_court", "Subordinate Court"),
                result.get("confidence", "90%")
            )
            db.create_audit_log(req.citizen_id, f"Created new petition ID: {petition_id} (AI Classified)", get_ip(request))
            
        return CaseClassifyResponse(
            success=True,
            id=petition_id,
            category=result.get("category", "Property dispute"),
            confidence=result.get("confidence", "90%"),
            suggested_court=result.get("suggested_court", "Subordinate Court"),
            acts=result.get("acts", []),
            required_documents=result.get("required_documents", []),
            timeline=result.get("timeline", "6 Months"),
            simple_explanation=result.get("simple_explanation", "")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification processing failed: {str(e)}"
        )

@app.post("/api/document/audit", response_model=DocumentAuditResponse)
async def audit_document(req: DocumentAuditRequest, request: Request):
    """Scrutinizes uploaded document scans for missing signatures, blurred scans, or formatting errors."""
    try:
        result = gemini_service.audit_document_health(req.document_name, req.ocr_text, req.category)
        
        # If petition_id is supplied, record document details in DB
        if req.petition_id:
            db.create_document(
                req.petition_id,
                req.document_name,
                f"https://nyayaflow.in/files/{req.document_name}",
                req.category,
                req.ocr_text,
                result.get("health_score", 85)
            )
            db.create_audit_log(None, f"Audited document health for petition: {req.petition_id}. Score: {result.get('health_score')}%", get_ip(request))
            
        return DocumentAuditResponse(
            success=True,
            health_score=result.get("health_score", 85),
            issues=result.get("issues", [])
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document audit processing failed: {str(e)}"
        )

@app.post("/api/police/bns-suggest", response_model=BnsSuggestionResponse)
async def suggest_bns(req: BnsSuggestionRequest):
    """Police endpoint to search incident descriptions and suggest matching Bharatiya Nyaya Sanhita chapters."""
    try:
        result = gemini_service.suggest_bns_sections(req.incident_report)
        suggestions = result.get("suggestions", [])
        return BnsSuggestionResponse(
            success=True,
            suggestions=suggestions
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"BNS indexing failed: {str(e)}"
        )

@app.post("/api/judge/case-summary", response_model=CaseSummaryResponse)
async def summarize_case(req: CaseSummaryRequest):
    """Judge workspace helper to compile case file transcripts into structured brief cause-list digests."""
    try:
        result = gemini_service.summarize_cause_list_case(req.petition_text, req.hearings_summary)
        return CaseSummaryResponse(
            success=True,
            brief_digest=result.get("brief_digest", ""),
            legal_statutes=result.get("legal_statutes", [])
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Case summarization failed: {str(e)}"
        )

@app.put("/api/petitions/{petition_id}/advocate")
async def update_advocate(petition_id: str, req: UpdateAdvocateRequest, request: Request):
    """Assign advocate representation to a petition."""
    try:
        db.assign_petition_advocate(petition_id, req.advocate_id)
        db.create_audit_log(req.advocate_id, f"Advocate accepted representation of case: {petition_id}", get_ip(request))
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Representation link failed: {str(e)}"
        )

@app.put("/api/petitions/{petition_id}/cnr")
async def update_cnr(petition_id: str, req: UpdateCnrRequest, request: Request):
    """Assign official court CNR numbers."""
    try:
        db.assign_petition_cnr(petition_id, req.cnr_number)
        db.create_audit_log(None, f"Registrar linked CNR: {req.cnr_number} to case: {petition_id}", get_ip(request))
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CNR linkage failed: {str(e)}"
        )

@app.put("/api/petitions/{petition_id}/status")
async def update_status(petition_id: str, status: str, request: Request):
    """Update petition status."""
    try:
        db.update_petition_status(petition_id, status)
        db.create_audit_log(None, f"Updated case status: {petition_id} to: {status}", get_ip(request))
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status update failed: {str(e)}"
        )

@app.post("/api/archive")
async def save_archive(req: ArchiveRequest, request: Request):
    """Log physical storage locations for case dossiers."""
    try:
        archive_id = db.create_physical_archive(
            req.petition_id, req.building, req.floor, req.room_number,
            req.rack_number, req.cupboard_number, req.shelf_number,
            req.box_number, req.file_barcode, req.logged_by
        )
        db.create_audit_log(req.logged_by, f"Logged archive location. Barcode: {req.file_barcode} linked to case {req.petition_id}", get_ip(request))
        return {"success": True, "id": archive_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Archival indexing failed: {str(e)}"
        )

@app.post("/api/orders")
async def save_order(req: CourtOrderRequest, request: Request):
    """Log official judicial bench orders."""
    try:
        order_id = db.create_court_order(
            req.petition_id, req.judge_id, req.action_taken, req.order_text
        )
        db.create_audit_log(req.judge_id, f"Judge signed bench order: {req.action_taken} for petition: {req.petition_id}", get_ip(request))
        return {"success": True, "id": order_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recording bench order failed: {str(e)}"
        )

@app.get("/api/audit-logs")
async def list_audit_logs():
    """Retrieve database audit log records."""
    try:
        return db.get_audit_logs()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fetching database ledger failed: {str(e)}"
        )

@app.get("/api/stats")
async def list_stats():
    """Get active caseload telemetry statistics."""
    try:
        return db.get_caseload_statistics()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Caseload calculations offline: {str(e)}"
        )
# Gateway Wrapper to handle routing both with and without prefix on Vercel/Local
backend_app = app
app = FastAPI(
    title="NyayaFlow AI Gateway",
    description="Gateway to access NyayaFlow backend service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/api/backend", backend_app)
app.mount("/", backend_app)

if __name__ == "__main__":
    import uvicorn
    # Start webserver locally on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

