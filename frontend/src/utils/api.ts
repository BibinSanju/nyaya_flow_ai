/**
 * Centralized API Client for NyayaFlow Judicial Platform
 * Fully integrated with Node.js/Express Backend & Real Database / File Store
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "" : "http://127.0.0.1:5000");

// Helper for standard JSON fetch requests
async function jsonFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : API_BASE_URL
    ? `${API_BASE_URL}${endpoint}`
    : endpoint;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("nyayaflow_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("nyayaflow_token");
    localStorage.removeItem("nyayaflow_user");
    if (!window.location.pathname.startsWith("/auth")) {
      window.location.href = "/auth";
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Server request failed with status ${res.status}`);
  }

  return data;
}

// -------------------------------------------------------------
// Authentication & Real OTP API
// -------------------------------------------------------------

export async function apiSendOTP(
  contact: string,
  type: "email" | "sms" = "email",
  role: string = "citizen"
) {
  return await jsonFetch("/api/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ contact, type, role }),
  });
}

export async function apiVerifyOTP(
  contact: string,
  otp: string,
  role: string = "citizen",
  fullName?: string
) {
  const res = await jsonFetch("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ contact, otp, role, fullName }),
  });

  if (res.token && typeof window !== "undefined") {
    localStorage.setItem("nyayaflow_token", res.token);
    localStorage.setItem("nyayaflow_user", JSON.stringify(res.user));
  }

  return res;
}

export async function apiAuthLogin(email: string, fullName: string, role: string, phone?: string) {
  return await jsonFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, full_name: fullName, role, phone }),
  });
}

export async function apiAuthLogout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("nyayaflow_token");
    localStorage.removeItem("nyayaflow_user");
  }
  return await jsonFetch("/api/auth/logout", { method: "POST" });
}

// -------------------------------------------------------------
// Real Document Upload API (Multer multipart/form-data)
// -------------------------------------------------------------

export interface UploadProgressCallback {
  (percent: number): void;
}

export async function apiUploadDocument(
  file: File,
  userId: string = "litigant_current_user",
  petitionId?: string | null,
  onProgress?: UploadProgressCallback
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}/api/documents/upload`;

    xhr.open("POST", url);

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("nyayaflow_token");
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(response);
        } else {
          reject(new Error(response.error || `Upload failed with HTTP ${xhr.status}`));
        }
      } catch (err) {
        reject(new Error("Failed to parse upload server response"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network connection error during document upload"));
    };

    const formData = new FormData();
    formData.append("document", file);
    formData.append("userId", userId);
    if (petitionId) formData.append("petitionId", petitionId);

    xhr.send(formData);
  });
}

export async function apiGetDocuments(petitionId?: string, userId?: string) {
  const params = new URLSearchParams();
  if (petitionId) params.append("petitionId", petitionId);
  if (userId) params.append("userId", userId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return await jsonFetch(`/api/documents${query}`);
}

export async function apiGetDocumentById(id: string) {
  return await jsonFetch(`/api/documents/${id}`);
}

export async function apiDeleteDocument(id: string) {
  return await jsonFetch(`/api/documents/${id}`, { method: "DELETE" });
}

// -------------------------------------------------------------
// Real Document Scanning & OCR API
// -------------------------------------------------------------

export async function apiScanDocument(documentId: string) {
  return await jsonFetch(`/api/documents/${documentId}/scan`, {
    method: "POST",
  });
}

export async function apiGetScanStatus(documentId: string) {
  return await jsonFetch(`/api/documents/${documentId}/scan-status`);
}

export async function apiGetScanResult(documentId: string) {
  return await jsonFetch(`/api/documents/${documentId}/scan-result`);
}

// -------------------------------------------------------------
// Court Legal Workflow APIs
// -------------------------------------------------------------

export async function apiClassifyCase(description: string, language: string, citizenId?: string) {
  return await jsonFetch("/api/case/classify", {
    method: "POST",
    body: JSON.stringify({ description, language, citizen_id: citizenId }),
  });
}

export async function apiListAdvocates() {
  return await jsonFetch("/api/advocates");
}

export async function apiListPetitions() {
  return await jsonFetch("/api/petitions");
}

export async function apiAuditDocument(petitionId: string | null, documentName: string, ocrText: string, category: string) {
  return await jsonFetch("/api/document/audit", {
    method: "POST",
    body: JSON.stringify({ petition_id: petitionId, document_name: documentName, ocr_text: ocrText, category }),
  });
}

export async function apiSuggestBns(incidentReport: string) {
  return await jsonFetch("/api/police/bns-suggest", {
    method: "POST",
    body: JSON.stringify({ incident_report: incidentReport }),
  });
}

export async function apiSummarizeCase(petitionText: string, hearingsSummary?: string) {
  return await jsonFetch("/api/judge/case-summary", {
    method: "POST",
    body: JSON.stringify({ petition_text: petitionText, hearings_summary: hearingsSummary }),
  });
}
