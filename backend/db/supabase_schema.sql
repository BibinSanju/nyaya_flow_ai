-- ==============================================================================
-- NYAYAFLOW JUDICIAL WORKFLOW & DOCUMENT SCRUTINY PLATFORM
-- SUPABASE POSTGRESQL SCHEMA & INITIAL SEED DATA
-- ==============================================================================
-- Run this entire script in your Supabase Project Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Enable standard extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean existing tables if re-running (safe cascade)
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS court_orders CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS physical_archive_locations CASCADE;
-- DROP TABLE IF EXISTS petitions CASCADE;
-- DROP TABLE IF EXISTS advocate_profiles CASCADE;
-- DROP TABLE IF EXISTS otp_verifications CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ==============================================================================
-- TABLE 1: USERS & STAKEHOLDER ACCOUNTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(30) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'advocate', 'police', 'registrar', 'judge', 'admin')),
    identifier VARCHAR(100), -- Aadhaar, Bar ID, Police Badge, Employee ID
    verified_contact BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE 2: ADVOCATE SPECIALIZED PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS advocate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bar_council_no VARCHAR(100) UNIQUE NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 0,
    languages VARCHAR(255) DEFAULT 'English, Hindi',
    fee_estimate VARCHAR(100) DEFAULT 'Legal Aid Panel / Variable',
    availability VARCHAR(100) DEFAULT 'Available',
    rating DECIMAL(3, 2) DEFAULT 4.9,
    reason TEXT,
    forum VARCHAR(255) DEFAULT 'District & Subordinate Courts',
    type VARCHAR(100) DEFAULT 'Empaneled Legal Aid Counsel',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE 3: PETITIONS & GRIEVANCE CASE LEDGER
-- ==============================================================================
CREATE TABLE IF NOT EXISTS petitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID REFERENCES users(id) ON DELETE SET NULL,
    citizen_name VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    advocate_id UUID REFERENCES users(id) ON DELETE SET NULL,
    advocate_name VARCHAR(255),
    category VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    language VARCHAR(50) NOT NULL DEFAULT 'English',
    suggested_court VARCHAR(255),
    ai_confidence VARCHAR(10) DEFAULT '95%',
    status VARCHAR(50) NOT NULL DEFAULT 'Scrutiny Pending'
        CHECK (status IN ('Scrutiny Pending', 'Registry Audited', 'CNR Issued', 'Hearings Active', 'Disposed', 'Returned')),
    cnr_number VARCHAR(100) UNIQUE NULL, -- Issued by Court Registrar
    health_score INTEGER DEFAULT 90,
    archival_location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE 4: PHYSICAL COURT ARCHIVAL LOCATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS physical_archive_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    petition_id UUID REFERENCES petitions(id) ON DELETE CASCADE UNIQUE,
    building VARCHAR(255) NOT NULL,
    floor VARCHAR(100) NOT NULL,
    room_number VARCHAR(100) NOT NULL,
    rack_number VARCHAR(100) NOT NULL,
    shelf_number VARCHAR(100) NOT NULL,
    box_number VARCHAR(100) NOT NULL,
    file_barcode VARCHAR(255) UNIQUE NOT NULL,
    logged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE 5: CASE DOCUMENTS & OCR SCRUTINY RESULTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    petition_id UUID REFERENCES petitions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    storage_path TEXT,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    ocr_text TEXT,
    detected_doc_type VARCHAR(255) DEFAULT 'General Legal Document',
    health_score INTEGER DEFAULT 0,
    confidence INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    pages INTEGER DEFAULT 1,
    upload_status VARCHAR(50) DEFAULT 'completed',
    scanning_status VARCHAR(50) DEFAULT 'not_scanned',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE 6: COURT ORDERS & BENCH DECREES (ORDER 39 CPC)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS court_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    petition_id UUID REFERENCES petitions(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES users(id) ON DELETE SET NULL,
    hearing_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    action_taken VARCHAR(100) NOT NULL, -- e.g. Passed Interim Injunction, Adjourned, Notice Issued, Disposed
    order_text TEXT NOT NULL,
    stage VARCHAR(100) DEFAULT 'First Cause Admissibility',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE 7: IMMUTABLE AUDIT LOGS (SECTION 63 BSA ELECTRONIC EVIDENCE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    role VARCHAR(50),
    action VARCHAR(512) NOT NULL,
    ip_address VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Success',
    state_hash VARCHAR(64), -- SHA-256 state checksum
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE 8: OTP VERIFICATION SESSIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(128) NOT NULL,
    role VARCHAR(50) DEFAULT 'citizen',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDEXES FOR INSTANT QUERIES ACROSS DASHBOARDS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_petitions_cnr ON petitions(cnr_number);
CREATE INDEX IF NOT EXISTS idx_petitions_status ON petitions(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_documents_petition ON documents(petition_id);
CREATE INDEX IF NOT EXISTS idx_archive_barcode ON physical_archive_locations(file_barcode);
CREATE INDEX IF NOT EXISTS idx_otp_contact ON otp_verifications(contact);

-- ==============================================================================
-- INITIAL SEED DATA (Advocates, Demo Petition, Cause List)
-- ==============================================================================

-- 1. Insert Demo Advocate Users
INSERT INTO users (id, email, full_name, role, phone, identifier, verified_contact)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'adv.abhishek@nyayaflow.in', 'Adv. Abhishek Deshmukh', 'advocate', '+91 98220 11223', 'BCI/MAH/4921-2015', TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'adv.meera@nyayaflow.in', 'Adv. Meera Sen', 'advocate', '+91 98110 33445', 'BCI/DEL/3109-2017', TRUE),
    ('a0000000-0000-0000-0000-000000000003', 'adv.rohan@nyayaflow.in', 'Adv. Rohan Malhotra', 'advocate', '+91 98770 55667', 'BCI/PUN/2180-2012', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Advocate Profiles
INSERT INTO advocate_profiles (user_id, bar_council_no, specialization, experience_years, languages, fee_estimate, availability, rating, reason, forum, type)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'BCI/MAH/4921-2015',
        'Civil & Land Revenue Law (7/12 Disputes)',
        12,
        'Marathi, Hindi, English',
        '₹25,000 / case (Legal Aid Available)',
        'Available tomorrow',
        4.95,
        'Local district specialist with extensive experience in 7/12 land partition suits and demarcation.',
        'Sub-Divisional Magistrate Court & Civil Court, Pune',
        'DLSA Empaneled Legal Aid Counsel'
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'BCI/DEL/3109-2017',
        'Family & Property Partition Law',
        9,
        'Hindi, English, Bengali',
        '₹18,000 / case',
        'Next week',
        4.80,
        'Empaneled counsel for civil partitions, succession, and family property dispute settlements.',
        'District & Subordinate Courts',
        'State Legal Services Panel'
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'BCI/PUN/2180-2012',
        'Cyber Law & Criminal Defense (BNS)',
        15,
        'Hindi, Punjabi, English',
        '₹40,000 / case',
        'Available today',
        4.92,
        'Bar Association Pro Bono panelist for electronic evidence verification under Section 63 BSA.',
        'Chief Judicial Magistrate Court',
        'Bar Association Pro Bono Panel'
    )
ON CONFLICT (bar_council_no) DO NOTHING;

-- 3. Insert Initial Demo Petitions
INSERT INTO petitions (id, citizen_name, contact, advocate_name, category, description, suggested_court, status, cnr_number, health_score, archival_location)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'Aditya Patil',
        '+91 98765 43210',
        'Adv. Abhishek Deshmukh',
        'Property & Land Dispute (Civil)',
        'Boundary wall encroachment on 7/12 land survey plot #142 in Kothrud, Pune. Seeking permanent injunction under Specific Relief Act 1963.',
        'Sub-Divisional Magistrate Court, Pune',
        'CNR Issued',
        'MHPU02-004912-2026',
        92,
        'Building C, Archive Room 12, Shelf 4, Box 19'
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'Ramesh Iyer',
        '+91 91234 56789',
        'Adv. Meera Sen',
        'Consumer Contract Dispute',
        'Non-delivery of agricultural irrigation machinery after full payment advance under Consumer Protection Act 2019.',
        'District Consumer Disputes Redressal Commission, Pune',
        'Scrutiny Pending',
        NULL,
        88,
        'Court Complex A, Archive Room B, Shelf C, Box 102'
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Archive Location for Demo Petition
INSERT INTO physical_archive_locations (petition_id, building, floor, room_number, rack_number, shelf_number, box_number, file_barcode)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'Court Complex C',
        '3rd Floor',
        'Archive Room 12',
        'Rack-04',
        'Shelf-D',
        'Box-19',
        'BARCODE-MHPU02-004912'
    )
ON CONFLICT (petition_id) DO NOTHING;

-- 5. Insert Initial Court Order
INSERT INTO court_orders (petition_id, action_taken, order_text, stage)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'Interim Injunction (Status Quo Granted)',
        'Heard applicant counsel Adv. Abhishek Deshmukh. Perused 7/12 extract and survey map. Prima facie case of possession established. Both parties are directed to maintain absolute status quo regarding survey plot #142 until returnable date.',
        'Order 39 Rule 1 CPC Proceeding'
    )
ON CONFLICT DO NOTHING;

-- 6. Insert System Audit Log
INSERT INTO audit_logs (actor_name, role, action, ip_address, status)
VALUES
    ('System Initializer', 'admin', 'Supabase PostgreSQL schema initialized with zero MongoDB dependency.', '127.0.0.1', 'Success');
