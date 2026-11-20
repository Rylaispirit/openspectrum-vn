"""
Module tính toán thống kê Thực nghiệm Trường hợp Đơn (SCED - Single-Case Experimental Design).

Toàn bộ công thức toán học là tất định (deterministic), kiểm chứng được và tuân thủ chuẩn
What Works Clearinghouse (WWC) v5.0:
- NAP (Parker & Vannest, 2009)
- Tau-U có kiểm định và hiệu chỉnh xu hướng đường cơ sở (Parker, Vannest, Davis, & Sauber, 2011)
- PEM (Ma, 2006)
- PND (Scruggs et al., 1987) & PAND (Parker, Hagan-Burke, & Vannest, 2007) — phân biệt rõ ràng
- IRD (Parker, Vannest, & Brown, 2009)
- BC-SMD giữa nhiều ca có hiệu chỉnh mẫu nhỏ Hedges J(nu) và phân phối Student-t (Pustejovsky et al., 2014)
"""

from __future__ import annotations

import math
from typing import Literal

import numpy as np
from scipy import stats

Direction = Literal["increase", "decrease"]


def _compare_pair(a: float, b: float, direction: Direction) -> int:
    """Trả về +1 nếu b cải thiện hơn a theo chiều mục tiêu, -1 nếu xấu đi, 0 nếu bằng nhau."""
    if math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12):
        return 0
    if direction == "increase":
        return 1 if b > a else -1
    return 1 if b < a else -1


def _theil_sen_slope(values: list[float]) -> float:
    """Độ dốc phi tham số Theil-Sen bền vững trước điểm ngoại lai trong chuỗi ngắn SCED."""
    n = len(values)
    if n < 2:
        return 0.0
    slopes: list[float] = []
    for i in range(n):
        for j in range(i + 1, n):
            slopes.append((values[j] - values[i]) / (j - i))
    return float(np.median(slopes))


def _phase_summary(values: list[float]) -> dict[str, float | int]:
    arr = np.asarray(values, dtype=float)
    n = len(arr)
    sd = float(np.std(arr, ddof=1)) if n >= 2 else 0.0
    return {
        "n": n,
        "mean": round(float(np.mean(arr)), 4),
        "median": round(float(np.median(arr)), 4),
        "sd": round(sd, 4),
        "min": round(float(np.min(arr)), 4),
        "max": round(float(np.max(arr)), 4),
        "theil_sen_slope": round(_theil_sen_slope(values), 4),
    }


def compute_pand_and_ird(
    baseline: list[float],
    intervention: list[float],
    direction: Direction = "increase",
) -> tuple[float, float, int]:
    """
    Tính PAND (Parker et al., 2007) và IRD (Parker, Vannest, & Brown, 2009) dựa trên
    phân hoạch tối ưu giảm thiểu số điểm chồng lấn giữa Pha A và Pha B.
    """
    n_a = len(baseline)
    n_b = len(intervention)
    total_n = n_a + n_b
    tagged = [(val, "A") for val in baseline] + [(val, "B") for val in intervention]

    # Sắp xếp sao cho Pha A lý tưởng nằm trước và Pha B lý tưởng nằm sau
    if direction == "increase":
        # Điểm bằng nhau: xếp B trước A để bảo thủ (tính điểm trùng là chồng lấn)
        tagged.sort(key=lambda item: (item[0], 0 if item[1] == "B" else 1))
    else:
        tagged.sort(key=lambda item: (-item[0], 0 if item[1] == "B" else 1))

    # Tại vị trí cắt chuẩn k = n_a (n_a phần tử đầu gán về vùng A, n_b phần tử sau gán về vùng B):
    # Số phần tử B rơi vào n_a phần tử đầu chính bằng số phần tử A rơi vào n_b phần tử sau.
    b_in_first_na = sum(1 for _, phase in tagged[:n_a] if phase == "B")
    min_removed = 2 * b_in_first_na
    pand = 1.0 - (min_removed / total_n)

    # Tìm ngưỡng cắt tối ưu cho IRD: tối đa hóa (tỷ lệ B ở nửa sau - tỷ lệ A ở nửa sau)
    best_ird = -1.0
    for cut in range(0, total_n + 1):
        right = tagged[cut:]
        b_right = sum(1 for _, p in right if p == "B")
        a_right = sum(1 for _, p in right if p == "A")
        imp_b = b_right / n_b
        imp_a = a_right / n_a
        best_ird = max(best_ird, imp_b - imp_a)

    return round(max(0.0, pand), 4), round(best_ird, 4), min_removed


def analyze_sced_ab(
    baseline: list[float],
    intervention: list[float],
    direction: Direction = "increase",
    baseline_trend_threshold: float = 0.20,
    alpha: float = 0.05,
) -> dict:
    """
    Phân tích toàn diện thiết kế A-B (hoặc một cặp pha liền kề trong A-B-A-B / Multiple Baseline).
    """
    if len(baseline) < 2 or len(intervention) < 2:
        raise ValueError("Mỗi pha (Baseline A và Can thiệp B) cần tối thiểu 2 điểm dữ liệu.")

    n_a = len(baseline)
    n_b = len(intervention)
    n_pairs = n_a * n_b

    pos = 0
    neg = 0
    ties = 0
    for a in baseline:
        for b in intervention:
            cmp = _compare_pair(a, b, direction)
            if cmp > 0:
                pos += 1
            elif cmp < 0:
                neg += 1
            else:
                ties += 1

    # 1. NAP (Nonoverlap of All Pairs)
    nap = (pos + 0.5 * ties) / n_pairs
    nap_rescaled = 2.0 * nap - 1.0

    # Sai số chuẩn Mann-Whitney U dưới giả thuyết không (H0: NAP = 0.5)
    se_nap_null = math.sqrt((n_a + n_b + 1.0) / (12.0 * n_a * n_b))
    z_nap = (nap - 0.5) / se_nap_null if se_nap_null > 0 else 0.0
    p_nap = float(2.0 * (1.0 - stats.norm.cdf(abs(z_nap))))

    # Khoảng tin cậy Hanley-McNeil cho NAP
    q1 = nap / (2.0 - nap) if nap < 2.0 else 1.0
    q2 = (2.0 * nap * nap) / (1.0 + nap)
    var_hm = (nap * (1.0 - nap) + (n_b - 1) * (q1 - nap * nap) + (n_a - 1) * (q2 - nap * nap)) / n_pairs
    se_nap_hm = math.sqrt(max(var_hm, 1e-9))
    z_crit = float(stats.norm.ppf(1.0 - alpha / 2.0))
    nap_ci_low = max(0.0, nap - z_crit * se_nap_hm)
    nap_ci_high = min(1.0, nap + z_crit * se_nap_hm)

    if nap >= 0.93:
        nap_label_vi = "Hiệu ứng mạnh (NAP >= 0.93)"
    elif nap >= 0.65:
        nap_label_vi = "Hiệu ứng trung bình (0.65 <= NAP < 0.93)"
    elif nap > 0.50:
        nap_label_vi = "Hiệu ứng yếu (0.50 < NAP < 0.65)"
    else:
        nap_label_vi = "Không có hiệu ứng tích cực (NAP <= 0.50)"

    # 2. Kiểm định xu hướng đường cơ sở (Baseline Trend Kendall's Tau_A)
    s_a = 0
    baseline_pairs = n_a * (n_a - 1) // 2
    for i in range(n_a):
        for k in range(i + 1, n_a):
            s_a += _compare_pair(baseline[i], baseline[k], direction)
    tau_a = (s_a / baseline_pairs) if baseline_pairs > 0 else 0.0
    baseline_trend_detected = n_a >= 3 and abs(tau_a) >= baseline_trend_threshold

    # 3. Tau-U (Parker et al., 2011)
    s_ab = pos - neg
    tau_ab = s_ab / n_pairs
    # Chỉ trừ xu hướng đường cơ sở khi đường cơ sở tự tăng theo chiều cải thiện vượt ngưỡng
    apply_trend_correction = n_a >= 3 and tau_a >= baseline_trend_threshold
    s_tau_u = (s_ab - s_a) if apply_trend_correction else s_ab
    tau_u = max(-1.0, min(1.0, s_tau_u / n_pairs))

    var_s_ab = (n_a * n_b * (n_a + n_b + 1.0)) / 3.0
    se_tau = math.sqrt(var_s_ab) / n_pairs
    z_tau_u = tau_u / se_tau if se_tau > 0 else 0.0
    p_tau_u = float(2.0 * (1.0 - stats.norm.cdf(abs(z_tau_u))))
    tau_u_ci_low = max(-1.0, tau_u - z_crit * se_tau)
    tau_u_ci_high = min(1.0, tau_u + z_crit * se_tau)

    # 4. PEM (Percentage of Data Points Exceeding the Median — Ma, 2006)
    med_a = float(np.median(baseline))
    pem_score = 0.0
    for b in intervention:
        cmp = _compare_pair(med_a, b, direction)
        if cmp > 0:
            pem_score += 1.0
        elif cmp == 0:
            pem_score += 0.5
    pem = pem_score / n_b

    # 5. PND (Scruggs et al., 1987) — tách biệt hoàn toàn với PAND
    extreme_a = max(baseline) if direction == "increase" else min(baseline)
    pnd_count = sum(1 for b in intervention if _compare_pair(extreme_a, b, direction) > 0)
    pnd = pnd_count / n_b

    # 6. PAND & IRD
    pand, ird, overlapped_points = compute_pand_and_ird(baseline, intervention, direction)

    # 7. Đánh giá chuẩn WWC (What Works Clearinghouse v5.0)
    if n_a >= 5 and n_b >= 5:
        wwc_phase_standard = "MEETS_WITHOUT_RESERVATIONS"
        wwc_note_vi = "Đạt chuẩn số điểm WWC không kèm bảo lưu (mỗi pha >= 5 điểm)."
    elif n_a >= 3 and n_b >= 3:
        wwc_phase_standard = "MEETS_WITH_RESERVATIONS"
        wwc_note_vi = "Đạt chuẩn số điểm WWC có bảo lưu (mỗi pha 3-4 điểm; khuyến nghị >= 5 điểm)."
    else:
        wwc_phase_standard = "DOES_NOT_MEET"
        wwc_note_vi = "Chưa đủ điểm dữ liệu theo chuẩn WWC (cần tối thiểu 3-5 điểm ở mỗi pha)."

    # Hiệu ứng tức thời (Immediacy): 3 điểm cuối của A so với 3 điểm đầu của B
    last_a = float(np.mean(baseline[-min(3, n_a) :]))
    first_b = float(np.mean(intervention[: min(3, n_b)]))
    immediacy_raw = first_b - last_a

    warnings_vi: list[str] = []
    if n_a < 5:
        warnings_vi.append(
            f"Pha cơ sở (A) hiện có {n_a} phiên; WWC v5.0 khuyến nghị tối thiểu 5 phiên để thiết lập đường cơ sở vững chắc."
        )
    if apply_trend_correction:
        warnings_vi.append(
            f"Phát hiện xu hướng tự cải thiện ở đường cơ sở (Tau_A = {tau_a:.3f} >= {baseline_trend_threshold}). Hệ thống đã tự động áp dụng hiệu chỉnh xu hướng cho Tau-U."
        )

    return {
        "direction": direction,
        "wwc_standard": {
            "status": wwc_phase_standard,
            "note_vi": wwc_note_vi,
        },
        "phase_a": _phase_summary(baseline),
        "phase_b": _phase_summary(intervention),
        "immediacy_effect": round(immediacy_raw, 4),
        "nap": {
            "value": round(nap, 4),
            "rescaled": round(nap_rescaled, 4),
            "se": round(se_nap_hm, 4),
            "ci_95": [round(nap_ci_low, 4), round(nap_ci_high, 4)],
            "z": round(z_nap, 4),
            "p_value": round(p_nap, 5),
            "interpretation_vi": nap_label_vi,
        },
        "tau_u": {
            "raw_ab": round(tau_ab, 4),
            "baseline_tau_a": round(tau_a, 4),
            "baseline_trend_detected": baseline_trend_detected,
            "trend_corrected": apply_trend_correction,
            "value": round(tau_u, 4),
            "se": round(se_tau, 4),
            "ci_95": [round(tau_u_ci_low, 4), round(tau_u_ci_high, 4)],
            "z": round(z_tau_u, 4),
            "p_value": round(p_tau_u, 5),
        },
        "pem": round(pem, 4),
        "pnd": round(pnd, 4),
        "pand": {
            "value": pand,
            "overlapped_points_removed": overlapped_points,
        },
        "ird": ird,
        "pairs": {
            "total": n_pairs,
            "positive": pos,
            "negative": neg,
            "ties": ties,
        },
        "warnings_vi": warnings_vi,
    }


def compute_bc_smd(
    cases: list[dict[str, list[float]]],
    direction: Direction = "increase",
    alpha: float = 0.05,
) -> dict:
    """
    Tính BC-SMD (Between-Case Standardized Mean Difference — Hedges, Pustejovsky, & Shadish, 2012)
    cho thiết kế Đa đường cơ sở (Multiple Baseline) từ m >= 3 trẻ trở lên.
    Sử dụng hiệu chỉnh mẫu nhỏ Hedges J(df) và khoảng tin cậy theo phân phối Student-t (KHÔNG dùng z).
    """
    m = len(cases)
    if m < 3:
        raise ValueError("BC-SMD theo chuẩn WWC yêu cầu tối thiểu m >= 3 ca độc lập (Multiple Baseline).")

    sign = 1.0 if direction == "increase" else -1.0
    mean_a_list: list[float] = []
    diff_list: list[float] = []
    ss_within = 0.0
    df_within = 0
    inv_n_sum = 0.0

    for idx, c in enumerate(cases):
        a = np.asarray(c.get("baseline", []), dtype=float)
        b = np.asarray(c.get("intervention", []), dtype=float)
        if len(a) < 2 or len(b) < 2:
            raise ValueError(f"Ca thứ {idx + 1} cần tối thiểu 2 điểm ở cả Pha A và Pha B.")
        mean_a = float(np.mean(a))
        mean_b = float(np.mean(b))
        mean_a_list.append(mean_a)
        diff_list.append(sign * (mean_b - mean_a))
        ss_within += float(np.sum((a - mean_a) ** 2) + np.sum((b - mean_b) ** 2))
        df_within += (len(a) - 1) + (len(b) - 1)
        inv_n_sum += (1.0 / len(a)) + (1.0 / len(b))

    sigma2_w = ss_within / df_within
    var_mean_a = float(np.var(mean_a_list, ddof=1))
    avg_inv_na = float(np.mean([1.0 / len(c["baseline"]) for c in cases]))
    # Phương sai giữa các ca (Between-case variance) có chặn dưới 0
    sigma2_b = max(0.0, var_mean_a - sigma2_w * avg_inv_na)
    total_var = sigma2_b + sigma2_w
    if total_var <= 1e-12:
        raise ValueError("Phương sai tổng bằng 0, không thể chuẩn hóa BC-SMD.")

    icc = sigma2_b / total_var
    mean_diff = float(np.mean(diff_list))
    d_raw = mean_diff / math.sqrt(total_var)

    # Bậc tự do Satterthwaite xấp xỉ và hệ số hiệu chỉnh chệch mẫu nhỏ Hedges J(df)
    df_eff = max(2.0, float(m - 1 + df_within) / 2.0)
    j_corr = 1.0 - (3.0 / (4.0 * df_eff - 1.0))
    bc_smd_g = j_corr * d_raw

    # Sai số chuẩn và Khoảng tin cậy dùng phân phối Student-t
    se_g = j_corr * math.sqrt((inv_n_sum / (m * m)) * (1.0 - icc) + (2.0 * icc / m) + (d_raw * d_raw) / (2.0 * df_eff))
    t_crit = float(stats.t.ppf(1.0 - alpha / 2.0, df=df_eff))
    ci_low = bc_smd_g - t_crit * se_g
    ci_high = bc_smd_g + t_crit * se_g

    return {
        "num_cases": m,
        "direction": direction,
        "bc_smd_hedges_g": round(bc_smd_g, 4),
        "unadjusted_d": round(d_raw, 4),
        "se": round(se_g, 4),
        "df_satterthwaite": round(df_eff, 2),
        "ci_95_student_t": [round(ci_low, 4), round(ci_high, 4)],
        "icc_rho": round(icc, 4),
        "within_case_sd": round(math.sqrt(sigma2_w), 4),
        "between_case_sd": round(math.sqrt(sigma2_b), 4),
    }
