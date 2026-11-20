"""
Module tính Độ đồng thuận liên quan sát viên (IOA - Inter-Observer Agreement)
và Độ trung thực quy trình can thiệp (Procedural / Treatment Fidelity) theo chuẩn WWC.
"""

from __future__ import annotations

import math


def compute_binary_ioa_and_kappa(obs1: list[int], obs2: list[int]) -> dict:
    """
    Tính IOA từng khoảng/phép thử (Interval-by-Interval / Trial-by-Trial IOA),
    Occurrence IOA, Non-occurrence IOA và hệ số Cohen's Kappa cho dữ liệu nhị phân (0/1).
    """
    if len(obs1) != len(obs2) or len(obs1) < 2:
        raise ValueError("Hai chuỗi quan sát phải có cùng độ dài và tối thiểu 2 khoảng/phép thử.")

    for v in obs1 + obs2:
        if v not in (0, 1):
            raise ValueError("Dữ liệu khoảng/phép thử nhị phân chỉ nhận giá trị 0 hoặc 1.")

    n = len(obs1)
    both_1 = sum(1 for x, y in zip(obs1, obs2) if x == 1 and y == 1)
    both_0 = sum(1 for x, y in zip(obs1, obs2) if x == 0 and y == 0)
    o1_only = sum(1 for x, y in zip(obs1, obs2) if x == 1 and y == 0)
    o2_only = sum(1 for x, y in zip(obs1, obs2) if x == 0 and y == 1)

    p_o = (both_1 + both_0) / n
    occ_denom = both_1 + o1_only + o2_only
    non_occ_denom = both_0 + o1_only + o2_only
    occ_ioa = (both_1 / occ_denom) if occ_denom > 0 else 1.0
    non_occ_ioa = (both_0 / non_occ_denom) if non_occ_denom > 0 else 1.0

    p1_yes = (both_1 + o1_only) / n
    p2_yes = (both_1 + o2_only) / n
    p_e = p1_yes * p2_yes + (1.0 - p1_yes) * (1.0 - p2_yes)

    if math.isclose(1.0 - p_e, 0.0, abs_tol=1e-12):
        kappa = 1.0 if math.isclose(p_o, 1.0, abs_tol=1e-12) else 0.0
        se_kappa = 0.0
    else:
        kappa = (p_o - p_e) / (1.0 - p_e)
        se_kappa = math.sqrt(max(0.0, p_o * (1.0 - p_o)) / (n * ((1.0 - p_e) ** 2)))

    meets_wwc = p_o >= 0.80 and kappa >= 0.60
    return {
        "n_intervals": n,
        "exact_ioa_pct": round(p_o * 100.0, 2),
        "occurrence_ioa_pct": round(occ_ioa * 100.0, 2),
        "non_occurrence_ioa_pct": round(non_occ_ioa * 100.0, 2),
        "cohens_kappa": round(kappa, 4),
        "kappa_se": round(se_kappa, 4),
        "confusion_matrix": {
            "both_present": both_1,
            "observer1_only": o1_only,
            "observer2_only": o2_only,
            "both_absent": both_0,
        },
        "meets_wwc_threshold": meets_wwc,
        "interpretation_vi": (
            "Đạt ngưỡng tin cậy nghiên cứu WWC (IOA >= 80% và Kappa >= 0.60)."
            if meets_wwc
            else "Chưa đạt ngưỡng WWC (cần hiệu chuẩn lại định nghĩa hành vi mục tiêu giữa 2 người quan sát)."
        ),
    }


def compute_count_ioa(counts_obs1: list[int], counts_obs2: list[int]) -> dict:
    """Tính Exact Count-per-Interval IOA và Mean Count-per-Interval IOA cho dữ liệu đếm tần suất."""
    if len(counts_obs1) != len(counts_obs2) or len(counts_obs1) == 0:
        raise ValueError("Hai danh sách đếm tần suất phải có cùng độ dài và không rỗng.")
    if any(c < 0 for c in counts_obs1 + counts_obs2):
        raise ValueError("Số đếm tần suất không được âm.")

    n = len(counts_obs1)
    exact_matches = sum(1 for a, b in zip(counts_obs1, counts_obs2) if a == b)
    interval_ratios: list[float] = []
    for a, b in zip(counts_obs1, counts_obs2):
        if a == 0 and b == 0:
            interval_ratios.append(1.0)
        else:
            interval_ratios.append(min(a, b) / max(a, b))

    sum_a = sum(counts_obs1)
    sum_b = sum(counts_obs2)
    total_count_ioa = 1.0 if (sum_a == 0 and sum_b == 0) else (min(sum_a, sum_b) / max(sum_a, sum_b))
    mean_count_ioa = sum(interval_ratios) / n

    return {
        "n_intervals": n,
        "exact_count_ioa_pct": round((exact_matches / n) * 100.0, 2),
        "mean_count_per_interval_ioa_pct": round(mean_count_ioa * 100.0, 2),
        "total_count_ioa_pct": round(total_count_ioa * 100.0, 2),
        "meets_wwc_threshold": mean_count_ioa >= 0.80,
    }


def compute_procedural_fidelity(steps_completed: list[bool]) -> dict:
    """Tính độ trung thực thực thi can thiệp (Procedural / Treatment Fidelity)."""
    if not steps_completed:
        raise ValueError("Danh sách bước kiểm tra quy trình không được rỗng.")
    completed = sum(1 for s in steps_completed if s)
    pct = (completed / len(steps_completed)) * 100.0
    return {
        "total_steps": len(steps_completed),
        "completed_steps": completed,
        "fidelity_pct": round(pct, 2),
        "meets_standard": pct >= 80.0,
        "recommendation_vi": (
            "Quy trình can thiệp được thực hiện trung thực (>= 80%)."
            if pct >= 80.0
            else "Độ trung thực dưới 80% — cần rà soát lại hướng dẫn và huấn luyện hỗ trợ người thực hiện trước khi kết luận về hiệu quả can thiệp."
        ),
    }
