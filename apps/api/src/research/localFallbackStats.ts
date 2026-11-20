/**
 * Bản dự phòng tính toán SCED & IOA tất định trên TypeScript khi người dùng chỉ chạy Node
 * mà chưa bật tiến trình Python `research-engine` (ưu tiên gọi Python FastAPI khi đang chạy).
 */

export function computeLocalSCEDFallback(
  baseline: number[],
  intervention: number[],
  direction: 'increase' | 'decrease' = 'increase',
  baselineTrendThreshold = 0.2,
) {
  if (baseline.length < 2 || intervention.length < 2) {
    throw new Error('Mỗi pha cần tối thiểu 2 điểm dữ liệu.');
  }
  const cmp = (a: number, b: number) => {
    if (Math.abs(a - b) < 1e-12) return 0;
    return direction === 'increase' ? (b > a ? 1 : -1) : b < a ? 1 : -1;
  };

  const nA = baseline.length;
  const nB = intervention.length;
  const nPairs = nA * nB;
  let pos = 0;
  let neg = 0;
  let ties = 0;
  for (const a of baseline) {
    for (const b of intervention) {
      const c = cmp(a, b);
      if (c > 0) pos++;
      else if (c < 0) neg++;
      else ties++;
    }
  }

  const nap = (pos + 0.5 * ties) / nPairs;
  const seNap = Math.sqrt((nA + nB + 1) / (12 * nA * nB));
  const zNap = seNap > 0 ? (nap - 0.5) / seNap : 0;

  // Baseline trend Kendall S_A
  let sA = 0;
  const pairsA = (nA * (nA - 1)) / 2;
  for (let i = 0; i < nA; i++) {
    for (let k = i + 1; k < nA; k++) {
      sA += cmp(baseline[i], baseline[k]);
    }
  }
  const tauA = pairsA > 0 ? sA / pairsA : 0;
  const applyCorrection = nA >= 3 && tauA >= baselineTrendThreshold;
  const sAB = pos - neg;
  const tauAB = sAB / nPairs;
  const tauU = Math.max(-1, Math.min(1, (applyCorrection ? sAB - sA : sAB) / nPairs));
  const seTau = Math.sqrt((nA * nB * (nA + nB + 1)) / 3) / nPairs;

  const sortedA = [...baseline].sort((x, y) => x - y);
  const medA =
    sortedA.length % 2 === 1
      ? sortedA[Math.floor(sortedA.length / 2)]
      : (sortedA[sortedA.length / 2 - 1] + sortedA[sortedA.length / 2]) / 2;
  let pemScore = 0;
  for (const b of intervention) {
    const c = cmp(medA, b);
    if (c > 0) pemScore += 1;
    else if (c === 0) pemScore += 0.5;
  }
  const pem = pemScore / nB;

  const extremeA = direction === 'increase' ? Math.max(...baseline) : Math.min(...baseline);
  const pnd = intervention.filter((b) => cmp(extremeA, b) > 0).length / nB;

  const tagged = [
    ...baseline.map((v) => ({ v, p: 'A' as const })),
    ...intervention.map((v) => ({ v, p: 'B' as const })),
  ].sort((x, y) => {
    if (Math.abs(x.v - y.v) < 1e-12) return x.p === 'B' ? -1 : 1;
    return direction === 'increase' ? x.v - y.v : y.v - x.v;
  });
  const bInFirstNa = tagged.slice(0, nA).filter((t) => t.p === 'B').length;
  const minRemoved = 2 * bInFirstNa;
  const pand = Math.max(0, 1 - minRemoved / (nA + nB));

  let bestIrd = -1;
  for (let cut = 0; cut <= tagged.length; cut++) {
    const right = tagged.slice(cut);
    const impB = right.filter((t) => t.p === 'B').length / nB;
    const impA = right.filter((t) => t.p === 'A').length / nA;
    bestIrd = Math.max(bestIrd, impB - impA);
  }

  const summary = (arr: number[]) => {
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const s = [...arr].sort((x, y) => x - y);
    const median = s.length % 2 === 1 ? s[Math.floor(s.length / 2)] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / Math.max(1, arr.length - 1);
    return {
      n: arr.length,
      mean: Number(mean.toFixed(4)),
      median: Number(median.toFixed(4)),
      sd: Number(Math.sqrt(variance).toFixed(4)),
      min: Math.min(...arr),
      max: Math.max(...arr),
      theil_sen_slope: 0,
    };
  };

  return {
    engine: 'ts-deterministic-fallback',
    direction,
    wwc_standard: {
      status:
        nA >= 5 && nB >= 5
          ? 'MEETS_WITHOUT_RESERVATIONS'
          : nA >= 3 && nB >= 3
            ? 'MEETS_WITH_RESERVATIONS'
            : 'DOES_NOT_MEET',
      note_vi:
        nA >= 5 && nB >= 5
          ? 'Đạt chuẩn số điểm WWC không kèm bảo lưu (mỗi pha >= 5 điểm).'
          : 'Đạt chuẩn có bảo lưu hoặc cần thu thập thêm điểm cơ sở (>= 5 điểm).',
    },
    phase_a: summary(baseline),
    phase_b: summary(intervention),
    nap: {
      value: Number(nap.toFixed(4)),
      rescaled: Number((2 * nap - 1).toFixed(4)),
      se: Number(seNap.toFixed(4)),
      ci_95: [Number(Math.max(0, nap - 1.96 * seNap).toFixed(4)), Number(Math.min(1, nap + 1.96 * seNap).toFixed(4))],
      z: Number(zNap.toFixed(4)),
      p_value: Number((2 * (1 - normalCdf(Math.abs(zNap)))).toFixed(5)),
      interpretation_vi:
        nap >= 0.93
          ? 'Hiệu ứng mạnh (NAP >= 0.93)'
          : nap >= 0.65
            ? 'Hiệu ứng trung bình (0.65 <= NAP < 0.93)'
            : 'Hiệu ứng yếu / chưa rõ rệt',
    },
    tau_u: {
      raw_ab: Number(tauAB.toFixed(4)),
      baseline_tau_a: Number(tauA.toFixed(4)),
      baseline_trend_detected: nA >= 3 && Math.abs(tauA) >= baselineTrendThreshold,
      trend_corrected: applyCorrection,
      value: Number(tauU.toFixed(4)),
      se: Number(seTau.toFixed(4)),
      ci_95: [Number(Math.max(-1, tauU - 1.96 * seTau).toFixed(4)), Number(Math.min(1, tauU + 1.96 * seTau).toFixed(4))],
      z: Number((tauU / seTau).toFixed(4)),
      p_value: Number((2 * (1 - normalCdf(Math.abs(tauU / seTau)))).toFixed(5)),
    },
    pem: Number(pem.toFixed(4)),
    pnd: Number(pnd.toFixed(4)),
    pand: { value: Number(pand.toFixed(4)), overlapped_points_removed: minRemoved },
    ird: Number(bestIrd.toFixed(4)),
    warnings_vi: applyCorrection
      ? [`Phát hiện xu hướng đường cơ sở Tau_A = ${tauA.toFixed(3)}; đã tự động hiệu chỉnh Tau-U.`]
      : [],
  };
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

export function computeLocalBinaryIOAFallback(obs1: number[], obs2: number[]) {
  if (obs1.length !== obs2.length || obs1.length < 2) {
    throw new Error('Hai chuỗi quan sát phải có cùng độ dài >= 2.');
  }
  const n = obs1.length;
  let both1 = 0;
  let both0 = 0;
  let o1Only = 0;
  let o2Only = 0;
  for (let i = 0; i < n; i++) {
    if (obs1[i] === 1 && obs2[i] === 1) both1++;
    else if (obs1[i] === 0 && obs2[i] === 0) both0++;
    else if (obs1[i] === 1 && obs2[i] === 0) o1Only++;
    else o2Only++;
  }
  const pO = (both1 + both0) / n;
  const p1 = (both1 + o1Only) / n;
  const p2 = (both1 + o2Only) / n;
  const pE = p1 * p2 + (1 - p1) * (1 - p2);
  const kappa = Math.abs(1 - pE) < 1e-12 ? 1 : (pO - pE) / (1 - pE);
  const meets = pO >= 0.8 && kappa >= 0.6;
  return {
    n_intervals: n,
    exact_ioa_pct: Number((pO * 100).toFixed(2)),
    cohens_kappa: Number(kappa.toFixed(4)),
    meets_wwc_threshold: meets,
    interpretation_vi: meets
      ? 'Đạt ngưỡng tin cậy nghiên cứu WWC (IOA >= 80% và Kappa >= 0.60).'
      : 'Chưa đạt ngưỡng WWC (cần hiệu chuẩn lại định nghĩa hành vi mục tiêu).',
  };
}
