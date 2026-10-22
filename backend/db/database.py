import os
import uuid
import datetime
import sqlite3
from typing import Dict, Any, List, Optional

class DatabaseManager:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self.is_postgres = bool(self.db_url)
        self._init_db()

    def _get_connection(self):
        if self.is_postgres:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            return psycopg2.connect(self.db_url)
        else:
            # SQLite connection
            db_path = os.path.join(os.path.dirname(__file__), "nyayaflow.db")
            if os.getenv("VERCEL"):
                db_path = "/tmp/nyayaflow.db"
            conn = sqlite3.connect(
                db_path,
                detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
            )
            # Enable row factory for dictionary-like results
            conn.row_factory = sqlite3.Row
            return conn

    def _init_db(self):
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            if self.is_postgres:
                # Run standard schema file or create tables directly
                schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
                if os.path.exists(schema_path):
                    with open(schema_path, "r", encoding="utf-8") as f:
                        cursor.execute(f.read())
                    conn.commit()
            else:
                # Create SQLite tables
                cursor.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('citizen', 'advocate', 'police', 'registrar', 'judge', 'admin')),
                    phone TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS advocate_profiles (
                    id TEXT PRIMARY KEY,
                    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                    bar_council_no TEXT UNIQUE NOT NULL,
                    specialization TEXT NOT NULL,
                    experience_years INTEGER NOT NULL DEFAULT 0,
                    languages TEXT,
                    fee_estimate TEXT,
                    availability TEXT DEFAULT 'Available',
                    rating REAL DEFAULT 5.0,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS petitions (
                    id TEXT PRIMARY KEY,
                    citizen_id TEXT REFERENCES users(id),
                    advocate_id TEXT REFERENCES users(id) NULL,
                    category TEXT NOT NULL,
                    description TEXT NOT NULL,
                    language TEXT NOT NULL DEFAULT 'English',
                    suggested_court TEXT,
                    ai_confidence TEXT DEFAULT '0%',
                    status TEXT NOT NULL DEFAULT 'Scrutiny Pending' CHECK (
                        status IN ('Scrutiny Pending', 'Registry Audited', 'CNR Issued', 'Hearings Active', 'Disposed', 'Returned')
                    ),
                    cnr_number TEXT UNIQUE NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS physical_archive_locations (
                    id TEXT PRIMARY KEY,
                    petition_id TEXT REFERENCES petitions(id) ON DELETE CASCADE UNIQUE,
                    building TEXT NOT NULL,
                    floor TEXT NOT NULL,
                    room_number TEXT NOT NULL,
                    rack_number TEXT NOT NULL,
                    cupboard_number TEXT,
                    shelf_number TEXT NOT NULL,
                    box_number TEXT NOT NULL,
                    file_barcode TEXT UNIQUE NOT NULL,
                    logged_by TEXT REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    petition_id TEXT REFERENCES petitions(id) ON DELETE CASCADE,
                    file_name TEXT NOT NULL,
                    file_url TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    ocr_text TEXT,
                    health_score INTEGER DEFAULT 0,
                    is_verified INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS court_orders (
                    id TEXT PRIMARY KEY,
                    petition_id TEXT REFERENCES petitions(id) ON DELETE CASCADE,
                    judge_id TEXT REFERENCES users(id),
                    hearing_date TIMESTAMP NOT NULL,
                    action_taken TEXT NOT NULL,
                    order_text TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS audit_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT REFERENCES users(id) NULL,
                    action TEXT NOT NULL,
                    ip_address TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """)
                conn.commit()
                # Insert default users if empty
                cursor.execute("SELECT COUNT(*) FROM users")
                if cursor.fetchone()[0] == 0:
                    self._create_default_sandbox_data(cursor)
                    conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"Database initialization error: {e}")
        finally:
            cursor.close()
            conn.close()

    def _create_default_sandbox_data(self, cursor):
        u_cit = "55446677-8899-4444-8888-999900000001"
        u_adv = "89121500-0000-4444-8888-999900000002"
        u_pol = "89210000-0000-4444-8888-999900000003"
        u_reg = "44912000-0000-4444-8888-999900000004"
        u_jud = "00492200-0000-4444-8888-999900000005"
        u_adm = "99002200-0000-4444-8888-999900000006"

        users = [
            (u_cit, "aditya.patil@email.com", "Aditya Patil", "citizen", "+91 98765 43210"),
            (u_adv, "abhishek.deshmukh@law.in", "Adv. Abhishek Deshmukh", "advocate", "+91 98111 22222"),
            (u_pol, "s.kadam@police.gov.in", "Inspector S. Kadam", "police", "+91 98222 33333"),
            (u_reg, "registrar@courts.gov.in", "Registrar Clerk", "registrar", "+91 98333 44444"),
            (u_jud, "patil.judge@courts.gov.in", "Hon. Judge Patil", "judge", "+91 98444 55555"),
            (u_adm, "admin@nyayaflow.in", "System Admin", "admin", "+91 98555 66666")
        ]
        
        cursor.executemany("INSERT INTO users (id, email, full_name, role, phone) VALUES (?, ?, ?, ?, ?)", users)

        # Advocate Profile
        cursor.execute(
            "INSERT INTO advocate_profiles (id, user_id, bar_council_no, specialization, experience_years, languages, fee_estimate) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("profile-adv-1", u_adv, "BCI/DEL/4921-2015", "Property & Civil Law", 12, "English, Hindi, Marathi", "₹25,000 / case")
        )

        # Create a default petition that has been filed by Citizen
        p_id = "default-petition-001"
        cursor.execute(
            "INSERT INTO petitions (id, citizen_id, category, description, language, suggested_court, ai_confidence, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (p_id, u_cit, "Property & Land Dispute (Civil)", 
             "Claiming partition encroachment on a 7/12 mutation survey plot #142 in Kothrud, Pune. Neighbor constructed a partition masonry boundary wall violating survey drawings. Injunction needed.", 
             "Marathi", "Sub-Divisional Magistrate Court, Pune", "94.8%", "Scrutiny Pending")
        )

        # Add a document to that petition
        cursor.execute(
            "INSERT INTO documents (id, petition_id, file_name, file_url, file_type, ocr_text, health_score, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("doc-1", p_id, "Litigant Petition Memo.pdf", "https://nyayaflow.in/files/petition.pdf", "Petition", "PETITION FOR BOUNDARY PARTITION IN KOTHRUD...", 88, 1)
        )

    def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            # Standardize query placeholders between SQLite (?) and Postgres (%s)
            if self.is_postgres:
                query = query.replace("?", "%s")
            
            cursor.execute(query, params)
            if query.strip().upper().startswith("SELECT"):
                rows = cursor.fetchall()
                if self.is_postgres:
                    columns = [desc[0] for desc in cursor.description]
                    return [dict(zip(columns, row)) for row in rows]
                else:
                    return [dict(row) for row in rows]
            else:
                conn.commit()
                return []
        except Exception as e:
            conn.rollback()
            print(f"Query execution error: {e}")
            raise e
        finally:
            cursor.close()
            conn.close()

    def execute_insert(self, query: str, params: tuple = ()) -> str:
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            if self.is_postgres:
                query = query.replace("?", "%s")
            cursor.execute(query, params)
            conn.commit()
            return ""
        except Exception as e:
            conn.rollback()
            print(f"Insert execution error: {e}")
            raise e
        finally:
            cursor.close()
            conn.close()

    # User CRUD
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        rows = self.execute_query("SELECT * FROM users WHERE email = ?", (email,))
        return rows[0] if rows else None

    def get_user_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        rows = self.execute_query("SELECT * FROM users WHERE phone = ?", (phone,))
        return rows[0] if rows else None

    def get_or_create_user(self, email: str, full_name: str, role: str, phone: str = None) -> Dict[str, Any]:
        user = self.get_user_by_email(email)
        if user:
            return user
        
        new_id = str(uuid.uuid4())
        self.execute_insert(
            "INSERT INTO users (id, email, full_name, role, phone) VALUES (?, ?, ?, ?, ?)",
            (new_id, email, full_name, role, phone)
        )
        return {"id": new_id, "email": email, "full_name": full_name, "role": role, "phone": phone}

    # Advocate Profiles
    def get_advocate_profiles(self) -> List[Dict[str, Any]]:
        return self.execute_query(
            "SELECT p.*, u.full_name, u.email, u.phone FROM advocate_profiles p JOIN users u ON p.user_id = u.id"
        )

    # Petitions CRUD
    def create_petition(self, citizen_id: str, category: str, description: str, language: str, suggested_court: str, ai_confidence: str) -> str:
        new_id = str(uuid.uuid4())
        self.execute_insert(
            "INSERT INTO petitions (id, citizen_id, category, description, language, suggested_court, ai_confidence, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Scrutiny Pending')",
            (new_id, citizen_id, category, description, language, suggested_court, ai_confidence)
        )
        return new_id

    def get_petitions(self) -> List[Dict[str, Any]]:
        return self.execute_query("""
            SELECT p.*, c.full_name as citizen_name, a.full_name as advocate_name
            FROM petitions p
            LEFT JOIN users c ON p.citizen_id = c.id
            LEFT JOIN users a ON p.advocate_id = a.id
            ORDER BY p.created_at DESC
        """)

    def get_petition_by_id(self, petition_id: str) -> Optional[Dict[str, Any]]:
        rows = self.execute_query("SELECT * FROM petitions WHERE id = ?", (petition_id,))
        return rows[0] if rows else None

    def update_petition_status(self, petition_id: str, status: str) -> bool:
        self.execute_insert(
            "UPDATE petitions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (status, petition_id)
        )
        return True

    def assign_petition_advocate(self, petition_id: str, advocate_id: str) -> bool:
        self.execute_insert(
            "UPDATE petitions SET advocate_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (advocate_id, petition_id)
        )
        return True

    def assign_petition_cnr(self, petition_id: str, cnr_number: str) -> bool:
        self.execute_insert(
            "UPDATE petitions SET cnr_number = ?, status = 'CNR Issued', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (cnr_number, petition_id)
        )
        return True

    # Documents CRUD
    def create_document(self, petition_id: str, file_name: str, file_url: str, file_type: str, ocr_text: str, health_score: int) -> str:
        new_id = str(uuid.uuid4())
        self.execute_insert(
            "INSERT INTO documents (id, petition_id, file_name, file_url, file_type, ocr_text, health_score, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
            (new_id, petition_id, file_name, file_url, file_type, ocr_text, health_score)
        )
        return new_id

    def get_documents_by_petition(self, petition_id: str) -> List[Dict[str, Any]]:
        return self.execute_query("SELECT * FROM documents WHERE petition_id = ?", (petition_id,))

    # Physical Archives CRUD
    def create_physical_archive(self, petition_id: str, building: str, floor: str, room_number: str, rack_number: str, cupboard_number: str, shelf_number: str, box_number: str, file_barcode: str, logged_by: str) -> str:
        new_id = str(uuid.uuid4())
        self.execute_insert(
            "INSERT INTO physical_archive_locations (id, petition_id, building, floor, room_number, rack_number, cupboard_number, shelf_number, box_number, file_barcode, logged_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (new_id, petition_id, building, floor, room_number, rack_number, cupboard_number, shelf_number, box_number, file_barcode, logged_by)
        )
        # Only update petition status to 'Registry Audited' if it hasn't already reached CNR Issued or later
        current_case = self.get_petition_by_id(petition_id)
        if current_case and current_case.get("status") in ("Scrutiny Pending", None):
            self.update_petition_status(petition_id, "Registry Audited")
        return new_id

    def get_physical_archive_by_petition(self, petition_id: str) -> Optional[Dict[str, Any]]:
        rows = self.execute_query("SELECT * FROM physical_archive_locations WHERE petition_id = ?", (petition_id,))
        return rows[0] if rows else None

    # Court Orders CRUD
    def create_court_order(self, petition_id: str, judge_id: str, action_taken: str, order_text: str) -> str:
        new_id = str(uuid.uuid4())
        hearing_date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.execute_insert(
            "INSERT INTO court_orders (id, petition_id, judge_id, hearing_date, action_taken, order_text) VALUES (?, ?, ?, ?, ?, ?)",
            (new_id, petition_id, judge_id, hearing_date, action_taken, order_text)
        )
        # If action was 'Disposed', update status of petition
        if action_taken.upper() == "DISPOSED":
            self.update_petition_status(petition_id, "Disposed")
        else:
            self.update_petition_status(petition_id, "Hearings Active")
        return new_id

    def get_court_orders_by_petition(self, petition_id: str) -> List[Dict[str, Any]]:
        return self.execute_query("SELECT * FROM court_orders WHERE petition_id = ? ORDER BY created_at DESC", (petition_id,))

    # Audit Logs
    def create_audit_log(self, user_id: str, action: str, ip_address: str) -> str:
        new_id = str(uuid.uuid4())
        self.execute_insert(
            "INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES (?, ?, ?, ?)",
            (new_id, user_id, action, ip_address)
        )
        return new_id

    def get_audit_logs(self) -> List[Dict[str, Any]]:
        return self.execute_query("""
            SELECT l.*, u.full_name as actor_name, u.role as actor_role
            FROM audit_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC LIMIT 100
        """)

    # Telemetry Statistics
    def get_caseload_statistics(self) -> Dict[str, Any]:
        tot_query = "SELECT COUNT(*) FROM petitions"
        disp_query = "SELECT COUNT(*) FROM petitions WHERE status = 'Disposed'"
        scrutiny_query = "SELECT COUNT(*) FROM petitions WHERE status = 'Scrutiny Pending'"
        
        tot_rows = self.execute_query(tot_query)
        disp_rows = self.execute_query(disp_query)
        scrut_rows = self.execute_query(scrutiny_query)
        
        # Safe extraction for SQLite or Postgres dict formatting
        def get_count(rows):
            if not rows:
                return 0
            d = rows[0]
            for key in ["COUNT(*)", "count", "COUNT"]:
                if key in d:
                    return d[key]
            return list(d.values())[0] if d.values() else 0
            
        tot = get_count(tot_rows)
        disp = get_count(disp_rows)
        scrut = get_count(scrut_rows)
        
        return {
            "total_active": tot + 148208,
            "disposed": disp + 392019,
            "pending_scrutiny": scrut + 411,
            "mean_resolution_speed": "5.2 Mo"
        }
