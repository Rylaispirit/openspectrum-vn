"""Bộ kiểm thử toán học & bảo mật dữ liệu cho OpenSpectrum-VN Research Engine."""

from app.deidentify import export_fair_sced_package, scrub_vietnamese_pii
from app.ioa_fidelity import (
    compute_binary_ioa_and_kappa,
    compute_count_ioa,
    compute_procedural_fidelity,
)
from app.sced_stats import analyze_sced_ab, compute_bc_smd


def test_complete_nonoverlap_increase():
    # Pha A: [1, 2, 1, 2, 2], Pha B: [5, 6, 7, 6, 8] -> không chồng lấn hoàn toàn
    res = analyze_sced_ab([1, 2, 1, 2, 2], [5, 6, 7, 6, 8], direction="increase")
    assert res["nap"]["value"] == 1.0
    assert res["pnd"] == 1.0
    assert res["pand"]["value"] == 1.0
    assert res["pem"] == 1.0
    assert res["ird"] == 1.0
    assert res["wwc_standard"]["status"] == "MEETS_WITHOUT_RESERVATIONS"


def test_pand_differs_from_pnd_with_baseline_outlier():
    # Pha A có 1 điểm ngoại lai cao (10), còn lại thấp [1, 1, 2, 10, 2]; Pha B: [6, 7, 8, 7, 9]
    # PND bị kéo về 0.0 do điểm ngoại lai 10, nhưng PAND chỉ cần loại 1 cặp chồng lấn -> PAND = 1 - 2/10 = 0.8!
    res = analyze_sced_ab([1, 1, 2, 10, 2], [6, 7, 8, 7, 9], direction="increase")
    assert res["pnd"] == 0.0
    assert res["pand"]["value"] == 0.8
    assert res["nap"]["value"] == 0.8


def test_tau_u_baseline_trend_correction():
    # Pha A đang tự tăng đều [1, 2, 3, 4, 5] -> Tau_A = +1.0 >= 0.20
    # Pha B: [6, 7, 8, 9, 10] -> S_AB = 25, S_A = 10 -> Tau_AB = 1.0, Tau-U hiệu chỉnh = (25 - 10)/25 = 0.60
    res = analyze_sced_ab([1, 2, 3, 4, 5], [6, 7, 8, 9, 10], direction="increase")
    assert res["tau_u"]["raw_ab"] == 1.0
    assert res["tau_u"]["baseline_tau_a"] == 1.0
    assert res["tau_u"]["trend_corrected"] is True
    assert res["tau_u"]["value"] == 0.6


def test_decrease_direction_for_distress_duration():
    # Mục tiêu giảm thời gian căng thẳng chuyển tiếp (phút): A=[12, 14, 11, 13, 12], B=[4, 3, 5, 2, 3]
    res = analyze_sced_ab([12, 14, 11, 13, 12], [4, 3, 5, 2, 3], direction="decrease")
    assert res["nap"]["value"] == 1.0
    assert res["pem"] == 1.0


def test_bc_smd_multiple_baseline_student_t():
    cases = [
        {"baseline": [2, 3, 2, 3, 2], "intervention": [7, 8, 8, 9, 8]},
        {"baseline": [1, 2, 2, 1, 2, 2], "intervention": [6, 7, 7, 8]},
        {"baseline": [3, 3, 4, 3, 4, 3, 3], "intervention": [8, 9, 9, 10]},
    ]
    res = compute_bc_smd(cases, direction="increase")
    assert res["num_cases"] == 3
    assert res["bc_smd_hedges_g"] > 2.0
    assert res["ci_95_student_t"][0] < res["bc_smd_hedges_g"] < res["ci_95_student_t"][1]


def test_ioa_and_kappa_and_fidelity():
    obs1 = [1, 1, 0, 1, 0, 0, 1, 1, 0, 1]
    obs2 = [1, 1, 0, 1, 0, 1, 1, 1, 0, 1]
    res = compute_binary_ioa_and_kappa(obs1, obs2)
    assert res["exact_ioa_pct"] == 90.0
    assert res["cohens_kappa"] > 0.75
    assert res["meets_wwc_threshold"] is True

    cnt = compute_count_ioa([2, 0, 4], [2, 0, 3])
    assert cnt["exact_count_ioa_pct"] == 66.67
    assert cnt["mean_count_per_interval_ioa_pct"] > 90.0

    fid = compute_procedural_fidelity([True, True, True, True, False])
    assert fid["fidelity_pct"] == 80.0
    assert fid["meets_standard"] is True


def test_vietnamese_deidentification_and_consent_enforcement():
    raw = "Bé Minh An học tại Trường Mầm non Hoa Hồng, mẹ gọi 0912345678 hoặc mail ha.nguyen@gmail.com."
    cleaned = scrub_vietnamese_pii(raw, child_display_name="Nguyễn Minh An")
    assert "0912345678" not in cleaned
    assert "ha.nguyen@gmail.com" not in cleaned
    assert "Minh An" not in cleaned
    assert "Hoa Hồng" not in cleaned

    pkg = export_fair_sced_package(
        study_id="MB-AAC-01",
        study_title="Hiệu quả bảng AAC ARASAAC lên tần suất yêu cầu giao tiếp",
        target_behavior="Số lần yêu cầu giao tiếp độc lập trong 15 phút",
        improvement_direction="increase",
        records=[
            {
                "child_id": "child-1",
                "child_name": "Minh An",
                "session_number": 1,
                "phase": "A",
                "session_date": "2026-10-01",
                "age_months": 54,
                "outcome_value": 2,
                "notes": "Bé An chỉ tay tại nhà số 12 đường Lê Lợi.",
                "research_consent_granted": True,
            },
            {
                "child_id": "child-1",
                "child_name": "Minh An",
                "session_number": 2,
                "phase": "A",
                "session_date": "2026-10-04",
                "age_months": 54,
                "outcome_value": 3,
                "notes": "Phiên thứ 2 cách đúng 3 ngày.",
                "research_consent_granted": True,
            },
            {
                "child_id": "child-no-consent",
                "child_name": "Bảo Nam",
                "session_number": 1,
                "phase": "A",
                "session_date": "2026-10-01",
                "age_months": 60,
                "outcome_value": 1,
                "notes": "Chưa đồng thuận nghiên cứu.",
                "research_consent_granted": False,
            },
        ],
        salt="unit-test-salt",
    )
    assert pkg["exported_count"] == 2
    assert pkg["excluded_unconsented_count"] == 1
    lines = pkg["csv_content"].strip().splitlines()
    assert len(lines) == 3  # header + 2 rows
    # Kiểm tra khoảng cách 3 ngày được bảo toàn sau khi dịch ngày
    from datetime import date

    d1 = date.fromisoformat(lines[1].split(",")[3])
    d2 = date.fromisoformat(lines[2].split(",")[3])
    assert (d2 - d1).days == 3
    assert str(d1) != "2026-10-01"
