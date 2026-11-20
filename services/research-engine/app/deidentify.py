"""
Pipeline Khử định danh Dữ liệu Nghiên cứu (De-identification) & Đóng gói Mở Chuẩn FAIR
tuân thủ Nghị định 13/2023/NĐ-CP (Việt Nam), Luật Trẻ em 2016 và chuẩn HIPAA Safe Harbor.
"""

from __future__ import annotations

import csv
import hashlib
import hmac
import io
import re
from datetime import date, datetime, timedelta, timezone

# Biểu thức chính quy lọc PII phổ biến trong ghi chú tiếng Việt
_PHONE_RE = re.compile(r"(?:\+?84|0)(?:3|5|7|8|9)\d{8}\b")
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_CCCD_RE = re.compile(r"\b\d{9}(?:\d{3})?\b")
_ADDRESS_RE = re.compile(
    r"(?:số\s+\d+[^\n,;.]*|đường\s+[^\n,;.]*|phường\s+[^\n,;.]*|quận\s+[^\n,;.]*|huyện\s+[^\n,;.]*|trường\s+(?:mầm\s+non|tiểu\s+học|chuyên\s+biệt)\s+[^\n,;.]*|bệnh\s+viện\s+[^\n,;.]*)",
    flags=re.IGNORECASE,
)


def pseudonymize_subject_id(raw_id: str, salt: str) -> str:
    """Băm một chiều HMAC-SHA256 tạo mã định danh giả lập cố định trong nội bộ một đề tài IRB."""
    digest = hmac.new(salt.encode("utf-8"), raw_id.strip().encode("utf-8"), hashlib.sha256).hexdigest()
    return f"SUBJ-{digest[:8].upper()}"


def deterministic_date_offset_days(raw_id: str, salt: str) -> int:
    """
    Dịch ngày ngẫu nhiên tất định theo từng trẻ trong khoảng [-180, -30] ngày:
    Ẩn ngày dương lịch thật nhưng BẢO TOÀN TUYỆT ĐỐI khoảng cách số ngày giữa các phiên SCED!
    """
    digest = hmac.new(salt.encode("utf-8"), f"date:{raw_id}".encode("utf-8"), hashlib.sha256).digest()
    val = int.from_bytes(digest[:4], "big")
    return -30 - (val % 151)


def scrub_vietnamese_pii(text: str, child_display_name: str | None = None) -> str:
    """Xóa số điện thoại, email, CCCD, địa chỉ/trường học và tên thật của trẻ khỏi ghi chú ABC."""
    cleaned = text or ""
    if child_display_name and len(child_display_name.strip()) >= 2:
        full_name = child_display_name.strip()
        pattern = re.compile(re.escape(full_name), flags=re.IGNORECASE)
        cleaned = pattern.sub("[TRẺ]", cleaned)
        tokens = full_name.split()
        # Tiếng Việt thường gọi bằng 'Tên đệm + Tên' (ví dụ 'Nguyễn Minh An' -> 'Minh An')
        if len(tokens) >= 3:
            middle_and_given = " ".join(tokens[-2:])
            if len(middle_and_given) >= 4:
                cleaned = re.sub(re.escape(middle_and_given), "[TRẺ]", cleaned, flags=re.IGNORECASE)
        if tokens:
            given_name = tokens[-1]
            if len(given_name) >= 2:
                cleaned = re.sub(
                    rf"\b(bé|con|cháu|em|bạn)\s+{re.escape(given_name)}\b",
                    r"\1 [TRẺ]",
                    cleaned,
                    flags=re.IGNORECASE,
                )

    cleaned = _PHONE_RE.sub("[SĐT_ĐÃ_ẨN]", cleaned)
    cleaned = _EMAIL_RE.sub("[EMAIL_ĐÃ_ẨN]", cleaned)
    cleaned = _CCCD_RE.sub("[MÃ_ĐỊNH_DANH_ĐÃ_ẨN]", cleaned)
    cleaned = _ADDRESS_RE.sub("[ĐỊA_ĐIỂM_ĐÃ_ẨN]", cleaned)
    return cleaned


def export_fair_sced_package(
    study_id: str,
    study_title: str,
    target_behavior: str,
    improvement_direction: str,
    records: list[dict],
    salt: str,
) -> dict:
    """
    Tạo gói dữ liệu nghiên cứu mở chuẩn FAIR (Frictionless Data `datapackage.json` + CSV khử định danh
    + mã R tái lập phân tích với gói `SingleCaseES`).
    Chỉ xuất các bản ghi có `research_consent_granted == True`.
    """
    consented = [r for r in records if r.get("research_consent_granted", False)]
    skipped_no_consent = len(records) - len(consented)

    deidentified_rows: list[dict] = []
    for row in consented:
        raw_subject = str(row.get("child_id", "unknown"))
        subj_code = pseudonymize_subject_id(raw_subject, salt)
        offset_days = deterministic_date_offset_days(raw_subject, salt)

        shifted_date_str = ""
        raw_date = row.get("session_date")
        if raw_date:
            try:
                parsed = date.fromisoformat(str(raw_date)[:10])
                shifted_date_str = (parsed + timedelta(days=offset_days)).isoformat()
            except ValueError:
                shifted_date_str = ""

        # Quy đổi tuổi sang tháng tuổi (ẩn ngày sinh chính xác, nếu trên 216 tháng gom nhóm >216)
        age_months = row.get("age_months")
        safe_age_band = f"{int(age_months)}" if isinstance(age_months, (int, float)) and age_months <= 216 else "NA"

        deidentified_rows.append(
            {
                "subject_code": subj_code,
                "session_number": int(row.get("session_number", 1)),
                "phase": str(row.get("phase", "A")),
                "shifted_session_date": shifted_date_str,
                "age_months": safe_age_band,
                "outcome_value": float(row.get("outcome_value", 0.0)),
                "procedural_fidelity_pct": row.get("procedural_fidelity_pct", ""),
                "sanitized_notes": scrub_vietnamese_pii(
                    str(row.get("notes", "")),
                    child_display_name=row.get("child_name"),
                ),
            }
        )

    csv_buf = io.StringIO()
    fieldnames = [
        "subject_code",
        "session_number",
        "phase",
        "shifted_session_date",
        "age_months",
        "outcome_value",
        "procedural_fidelity_pct",
        "sanitized_notes",
    ]
    writer = csv.DictWriter(csv_buf, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(deidentified_rows)

    datapackage = {
        "profile": "tabular-data-package",
        "name": f"openspectrum-vn-sced-{study_id.lower()}",
        "title": study_title,
        "created": datetime.now(timezone.utc).isoformat(),
        "licenses": [
            {
                "name": "CC-BY-NC-SA-4.0",
                "title": "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
                "path": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            }
        ],
        "ethics_and_privacy": {
            "jurisdiction": "VN (Nghị định 13/2023/NĐ-CP & Luật Trẻ em 2016)",
            "deidentification_method": "HMAC-SHA256 subject pseudonymization + per-subject deterministic date shifting + Vietnamese regex PII scrubbing",
            "records_exported": len(deidentified_rows),
            "records_excluded_without_irb_consent": skipped_no_consent,
        },
        "sced_metadata": {
            "target_behavior": target_behavior,
            "improvement_direction": improvement_direction,
        },
        "resources": [
            {
                "name": "sced_observations",
                "path": "sced_observations.csv",
                "format": "csv",
                "mediatype": "text/csv",
                "schema": {
                    "fields": [
                        {"name": "subject_code", "type": "string"},
                        {"name": "session_number", "type": "integer"},
                        {"name": "phase", "type": "string"},
                        {"name": "shifted_session_date", "type": "date"},
                        {"name": "age_months", "type": "string"},
                        {"name": "outcome_value", "type": "number"},
                        {"name": "procedural_fidelity_pct", "type": "any"},
                        {"name": "sanitized_notes", "type": "string"},
                    ]
                },
            }
        ],
    }

    r_script = f"""# Kịch bản R tái lập phân tích thực nghiệm trường hợp đơn (Chuẩn Open Science — OpenSpectrum-VN)
# Cài đặt gói chuẩn quốc tế nếu chưa có: install.packages(c("SingleCaseES", "scdhlm"))
library(SingleCaseES)

dat <- read.csv("sced_observations.csv", stringsAsFactors = FALSE)
improvement <- "{improvement_direction}"

# Tính đồng thời NAP, Tau, Tau-BC (có hiệu chỉnh xu hướng đường cơ sở), PEM, PAND, IRD cho từng trẻ:
results <- batch_calc_ES(
  dat = dat,
  grouping = subject_code,
  condition = phase,
  outcome = outcome_value,
  session_number = session_number,
  baseline_phase = "A",
  intervention_phase = "B",
  ES = c("NAP", "Tau", "Tau-BC", "PEM", "PAND", "IRD"),
  improvement = improvement
)
print(results)
"""

    return {
        "datapackage": datapackage,
        "csv_content": csv_buf.getvalue(),
        "reproducible_r_script": r_script,
        "exported_count": len(deidentified_rows),
        "excluded_unconsented_count": skipped_no_consent,
    }
