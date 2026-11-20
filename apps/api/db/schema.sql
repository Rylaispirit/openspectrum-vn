-- ============================================================================
-- OPENSPECTRUM-VN — POSTGRESQL 16 + PGVECTOR SCHEMA
-- Thiết kế sạch 100%, tuân thủ Nghị định 13/2023/NĐ-CP & Chuẩn Khoa học Mở
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Hồ sơ nhu cầu hỗ trợ của trẻ (Support Needs Profile - SNP, KHÔNG gán nhãn chẩn đoán)
CREATE TABLE IF NOT EXISTS child_support_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname TEXT NOT NULL,
    age_months INTEGER NOT NULL CHECK (age_months >= 12 AND age_months <= 260),
    communication_modalities TEXT[] NOT NULL DEFAULT ARRAY['gestures', 'aac'],
    sensory_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    strengths_and_interests TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    safe_calming_supports TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    known_medical_alerts TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Quản trị Đồng thuận Đạo đức Nghiên cứu Phân tầng (Tiered IRB Consent - Nghị định 13/2023)
CREATE TABLE IF NOT EXISTS informed_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES child_support_profiles(id) ON DELETE CASCADE,
    guardian_relationship TEXT NOT NULL,
    tier_care_support BOOLEAN NOT NULL DEFAULT TRUE,
    tier_deidentified_research BOOLEAN NOT NULL DEFAULT FALSE,
    irb_protocol_code TEXT DEFAULT '',
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- 3. Nhật ký Quan sát Hành vi Chức năng A-B-C (Tiền đề - Hành vi - Hệ quả)
CREATE TABLE IF NOT EXISTS abc_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES child_support_profiles(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observer_role TEXT NOT NULL CHECK (observer_role IN ('parent', 'teacher', 'clinician', 'researcher')),
    setting TEXT NOT NULL DEFAULT 'Gia đình',
    medical_sensory_check JSONB NOT NULL DEFAULT '{}'::jsonb,
    antecedent TEXT NOT NULL,
    behavior_objective TEXT NOT NULL,
    consequence TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    hypothesized_function TEXT CHECK (hypothesized_function IN ('escape', 'attention', 'tangible', 'sensory_regulation', 'pain_medical_check')),
    is_harmless_stimming BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Đề tài Nghiên cứu Thực nghiệm Trường hợp Đơn (SCED Studies)
CREATE TABLE IF NOT EXISTS sced_studies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    design_type TEXT NOT NULL CHECK (design_type IN ('AB', 'ABAB', 'MULTIPLE_BASELINE', 'ALTERNATING_TREATMENTS')),
    target_behavior TEXT NOT NULL,
    measurement_unit TEXT NOT NULL DEFAULT 'lần / phiên 15 phút',
    improvement_direction TEXT NOT NULL CHECK (improvement_direction IN ('increase', 'decrease')),
    irb_approval_code TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Dữ liệu Phiên Đo lường SCED (Chuỗi thời gian Pha A / Pha B)
CREATE TABLE IF NOT EXISTS sced_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    study_id UUID NOT NULL REFERENCES sced_studies(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES child_support_profiles(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL CHECK (session_number >= 1),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    phase TEXT NOT NULL CHECK (phase IN ('A', 'B', 'A2', 'B2', 'MAINTENANCE')),
    outcome_value DOUBLE PRECISION NOT NULL,
    procedural_fidelity_pct DOUBLE PRECISION CHECK (procedural_fidelity_pct >= 0 AND procedural_fidelity_pct <= 100),
    ioa_collected BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (study_id, child_id, session_number)
);

-- 6. Kho Học liệu & Chiến lược Dựa trên Bằng chứng (EBP RAG với pgvector 384 chiều)
CREATE TABLE IF NOT EXISTS ebp_knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title_vi TEXT NOT NULL,
    category TEXT NOT NULL,
    evidence_source TEXT NOT NULL,
    content_vi TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Nhật ký Kiểm toán An toàn Lâm sàng (Safety Gate Audit Trail - Không lưu PII)
CREATE TABLE IF NOT EXISTS safety_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    matched_rule TEXT NOT NULL,
    blocked_llm BOOLEAN NOT NULL DEFAULT TRUE
);
