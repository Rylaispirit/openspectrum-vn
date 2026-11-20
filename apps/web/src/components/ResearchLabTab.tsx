import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Download, FileSpreadsheet, FlaskConical, Plus, Shield } from 'lucide-react';

interface SCEDSession {
  id: string;
  studyId: string;
  childId: string;
  sessionNumber: number;
  sessionDate: string;
  phase: 'A' | 'B';
  outcomeValue: number;
  proceduralFidelityPct: number;
  notes: string;
}

interface SCEDStudy {
  id: string;
  code: string;
  title: string;
  designType: string;
  targetBehavior: string;
  measurementUnit: string;
  improvementDirection: 'increase' | 'decrease';
  irbApprovalCode: string;
  sessions: SCEDSession[];
}

interface ChildProfile {
  id: string;
  nickname: string;
  ageMonths: number;
  researchConsentGranted: boolean;
  irbProtocolCode: string;
}

interface SCEDAnalysis {
  engine?: string;
  wwc_standard: { status: string; note_vi: string };
  phase_a: { n: number; mean: number; median: number; sd: number };
  phase_b: { n: number; mean: number; median: number; sd: number };
  nap: { value: number; ci_95: [number, number]; p_value: number; interpretation_vi: string };
  tau_u: {
    raw_ab: number;
    baseline_tau_a: number;
    trend_corrected: boolean;
    value: number;
    ci_95: [number, number];
    p_value: number;
  };
  pem: number;
  pnd: number;
  pand: { value: number; overlapped_points_removed: number };
  ird: number;
  warnings_vi: string[];
}

export function ResearchLabTab() {
  const [studies, setStudies] = useState<SCEDStudy[]>([]);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [analysis, setAnalysis] = useState<SCEDAnalysis | null>(null);

  // Thêm phiên đo lường mới
  const [newPhase, setNewPhase] = useState<'A' | 'B'>('B');
  const [newOutcome, setNewOutcome] = useState('9');
  const [newFidelity, setNewFidelity] = useState('95');
  const [newNotes, setNewNotes] = useState('');

  // Máy tính IOA & Cohen's Kappa
  const [obs1Str, setObs1Str] = useState('1, 1, 0, 1, 0, 0, 1, 1, 0, 1');
  const [obs2Str, setObs2Str] = useState('1, 1, 0, 1, 0, 1, 1, 1, 0, 1');
  const [ioaResult, setIoaResult] = useState<{
    exact_ioa_pct: number;
    cohens_kappa: number;
    meets_wwc_threshold: boolean;
    interpretation_vi: string;
  } | null>(null);

  // Gói dữ liệu mở chuẩn FAIR
  const [fairBundle, setFairBundle] = useState<{
    datapackage: Record<string, unknown>;
    csv_content: string;
    reproducible_r_script: string;
    exported_count: number;
    excluded_unconsented_count: number;
  } | null>(null);

  const activeStudy = studies[0] || null;

  useEffect(() => {
    Promise.all([fetch('/api/research/studies').then((r) => r.json()), fetch('/api/profiles').then((r) => r.json())])
      .then(([stData, prData]) => {
        if (Array.isArray(stData.studies)) setStudies(stData.studies);
        if (Array.isArray(prData.profiles)) setProfiles(prData.profiles);
      })
      .catch(() => {});
  }, []);

  const phaseAPoints = useMemo(
    () => (activeStudy ? activeStudy.sessions.filter((s) => s.phase === 'A').map((s) => s.outcomeValue) : []),
    [activeStudy],
  );
  const phaseBPoints = useMemo(
    () => (activeStudy ? activeStudy.sessions.filter((s) => s.phase === 'B').map((s) => s.outcomeValue) : []),
    [activeStudy],
  );

  useEffect(() => {
    if (!activeStudy || phaseAPoints.length < 2 || phaseBPoints.length < 2) return;
    fetch('/api/research/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseline: phaseAPoints,
        intervention: phaseBPoints,
        direction: activeStudy.improvementDirection,
      }),
    })
      .then((r) => r.json())
      .then((res) => setAnalysis(res as SCEDAnalysis))
      .catch(() => {});
  }, [activeStudy, phaseAPoints, phaseBPoints]);

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStudy) return;
    const resp = await fetch('/api/research/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studyId: activeStudy.id,
        childId: 'child-demo-01',
        sessionDate: new Date().toISOString().slice(0, 10),
        phase: newPhase,
        outcomeValue: Number(newOutcome),
        proceduralFidelityPct: Number(newFidelity),
        notes: newNotes,
      }),
    });
    const data = await resp.json();
    if (resp.ok && data.session) {
      setStudies((prev) =>
        prev.map((st, idx) => (idx === 0 ? { ...st, sessions: [...st.sessions, data.session] } : st)),
      );
      setNewNotes('');
    }
  }

  async function handleComputeIOA() {
    const parseBin = (s: string) =>
      s
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((x) => Number(x));
    const resp = await fetch('/api/research/ioa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observer_1: parseBin(obs1Str), observer_2: parseBin(obs2Str) }),
    });
    if (resp.ok) {
      setIoaResult(await resp.json());
    }
  }

  async function toggleConsent(profile: ChildProfile) {
    const resp = await fetch('/api/consents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: profile.id,
        researchConsentGranted: !profile.researchConsentGranted,
        irbProtocolCode: 'IRB-VN-SPED-2026-01',
      }),
    });
    const data = await resp.json();
    if (resp.ok && data.profile) {
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? data.profile : p)));
    }
  }

  async function handleFairExport() {
    const resp = await fetch('/api/research/fair-export', { method: 'POST' });
    if (resp.ok) {
      setFairBundle(await resp.json());
    }
  }

  function downloadFile(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Vẽ biểu đồ SCED chuẩn APA / WWC bằng SVG thuần
  const renderSCEDChart = () => {
    if (!activeStudy || activeStudy.sessions.length === 0) return null;
    const sessions = activeStudy.sessions;
    const maxVal = Math.max(12, ...sessions.map((s) => s.outcomeValue)) + 1;
    const width = 680;
    const height = 240;
    const padL = 48;
    const padR = 24;
    const padT = 24;
    const padB = 36;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const xOf = (idx: number) => padL + (idx / Math.max(1, sessions.length - 1)) * plotW;
    const yOf = (val: number) => padT + plotH - (val / maxVal) * plotH;

    const aSessions = sessions.map((s, idx) => ({ s, idx })).filter((x) => x.s.phase === 'A');
    const bSessions = sessions.map((s, idx) => ({ s, idx })).filter((x) => x.s.phase === 'B');
    const lastAIdx = aSessions.length > 0 ? aSessions[aSessions.length - 1].idx : -1;
    const firstBIdx = bSessions.length > 0 ? bSessions[0].idx : -1;
    const dividerX =
      lastAIdx >= 0 && firstBIdx > lastAIdx ? (xOf(lastAIdx) + xOf(firstBIdx)) / 2 : null;

    const polyA = aSessions.map((p) => `${xOf(p.idx)},${yOf(p.s.outcomeValue)}`).join(' ');
    const polyB = bSessions.map((p) => `${xOf(p.idx)},${yOf(p.s.outcomeValue)}`).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-white rounded-xl border border-stone-200 p-2">
        {/* Lưới ngang */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const val = Math.round(t * maxVal);
          const y = yOf(val);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#e7e5e4" strokeDasharray="3 3" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#57534e">
                {val}
              </text>
            </g>
          );
        })}

        {/* Đường phân cách Pha chuẩn APA SCED */}
        {dividerX !== null && (
          <g>
            <line x1={dividerX} y1={padT} x2={dividerX} y2={height - padB} stroke="#0f766e" strokeWidth="2" strokeDasharray="5 4" />
            <text x={padL + 8} y={padT + 12} fontSize="11" fontWeight="bold" fill="#44403c">
              Pha A (Đường cơ sở)
            </text>
            <text x={dividerX + 10} y={padT + 12} fontSize="11" fontWeight="bold" fill="#0f766e">
              Pha B (Can thiệp AAC Mở)
            </text>
          </g>
        )}

        {polyA && <polyline fill="none" stroke="#57534e" strokeWidth="2.2" points={polyA} />}
        {polyB && <polyline fill="none" stroke="#0f766e" strokeWidth="2.5" points={polyB} />}

        {sessions.map((s, idx) => (
          <g key={s.id}>
            <circle
              cx={xOf(idx)}
              cy={yOf(s.outcomeValue)}
              r={4.5}
              fill={s.phase === 'A' ? '#57534e' : '#0f766e'}
            />
            <text x={xOf(idx)} y={height - 12} textAnchor="middle" fontSize="10" fill="#57534e">
              #{s.sessionNumber}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Phân tích thực nghiệm trường hợp đơn SCED */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Engine Thống Kê Thực Nghiệm Trường Hợp Đơn (SCED — Chuẩn Quốc tế WWC v5.0)
              </h2>
              <p className="text-xs text-slate-600">
                Tính toán bằng thuật toán toán học tất định (NAP, Tau-U có kiểm định xu hướng cơ sở, PEM, PAND vs PND,
                IRD) — tuyệt đối không để LLM tự ước lượng số liệu.
              </p>
            </div>
          </div>
          {analysis?.engine && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-medium">
              Engine: {analysis.engine}
            </span>
          )}
        </div>

        {activeStudy && (
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 text-sm">
            <div className="font-semibold text-slate-900">
              [{activeStudy.code}] {activeStudy.title}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Biến phụ thuộc: {activeStudy.targetBehavior} ({activeStudy.measurementUnit}) • Mã đạo đức:{' '}
              {activeStudy.irbApprovalCode}
            </div>
          </div>
        )}

        {renderSCEDChart()}

        {/* Bảng chỉ số kích thước hiệu ứng SCED */}
        {analysis && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                <div className="text-[11px] font-semibold text-teal-800">NAP (Nonoverlap)</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{analysis.nap.value}</div>
                <div className="text-[11px] text-slate-600">
                  95% CI [{analysis.nap.ci_95[0]}, {analysis.nap.ci_95[1]}] • p={analysis.nap.p_value}
                </div>
              </div>

              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                <div className="text-[11px] font-semibold text-teal-800">Tau-U (Parker 2011)</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{analysis.tau_u.value}</div>
                <div className="text-[11px] text-slate-600">
                  Tau_A={analysis.tau_u.baseline_tau_a} ({analysis.tau_u.trend_corrected ? 'Đã khử trend' : 'Ổn định'})
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-[11px] font-semibold text-slate-600">PEM (Ma, 2006)</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{(analysis.pem * 100).toFixed(1)}%</div>
                <div className="text-[11px] text-slate-500">Vượt trung vị Pha A ({analysis.phase_a.median})</div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-[11px] font-semibold text-slate-600">PAND (Parker 2007)</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{(analysis.pand.value * 100).toFixed(1)}%</div>
                <div className="text-[11px] text-slate-500">Khác biệt rõ với PND ({(analysis.pnd * 100).toFixed(1)}%)</div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-[11px] font-semibold text-slate-600">IRD</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{analysis.ird}</div>
                <div className="text-[11px] text-slate-500">Chênh lệch tỷ lệ cải thiện</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="text-[11px] font-semibold text-emerald-800">Chuẩn WWC v5.0</div>
                <div className="text-xs font-bold text-emerald-950 mt-1">
                  A: n={analysis.phase_a.n} (M={analysis.phase_a.mean})<br />
                  B: n={analysis.phase_b.n} (M={analysis.phase_b.mean})
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-700 bg-stone-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                <strong>Kết luận định lượng:</strong> {analysis.nap.interpretation_vi} • {analysis.wwc_standard.note_vi}
              </span>
            </div>
          </div>
        )}

        {/* Form nhập thêm phiên đo lường SCED */}
        <form onSubmit={handleAddSession} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2 border-t border-stone-200">
          <select
            value={newPhase}
            onChange={(e) => setNewPhase(e.target.value as 'A' | 'B')}
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
          >
            <option value="A">Pha A (Cơ sở)</option>
            <option value="B">Pha B (Can thiệp)</option>
          </select>
          <input
            type="number"
            step="0.5"
            value={newOutcome}
            onChange={(e) => setNewOutcome(e.target.value)}
            placeholder="Giá trị đo"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={newFidelity}
            onChange={(e) => setNewFidelity(e.target.value)}
            placeholder="Fidelity %"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Ghi chú phiên quan sát..."
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-3 py-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Thêm phiên SCED
          </button>
        </form>
      </section>

      {/* Độ đồng thuận Liên quan sát viên IOA & Cohen's Kappa */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-slate-800">
            Kiểm Định Độ Đồng Thuận Liên Quan Sát Viên (IOA &amp; Cohen&apos;s Kappa &kappa;)
          </h3>
          <p className="text-xs text-slate-600">
            Nhập chuỗi ghi nhận theo khoảng 0/1 độc lập từ 2 nhà nghiên cứu (WWC yêu cầu kiểm tra IOA tối thiểu 20% số
            phiên ở mỗi pha và đạt &ge; 80%).
          </p>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Người quan sát 1 (0/1 cách nhau dấu phẩy)</label>
              <input
                type="text"
                value={obs1Str}
                onChange={(e) => setObs1Str(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Người quan sát 2 (0/1 cách nhau dấu phẩy)</label>
              <input
                type="text"
                value={obs2Str}
                onChange={(e) => setObs2Str(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-sm font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleComputeIOA}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-medium"
            >
              Tính IOA &amp; Hệ số Kappa
            </button>
          </div>
          {ioaResult && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs space-y-1">
              <div className="font-bold text-slate-900">
                Exact IOA: {ioaResult.exact_ioa_pct}% • Cohen&apos;s &kappa; = {ioaResult.cohens_kappa}
              </div>
              <div className="text-emerald-900">{ioaResult.interpretation_vi}</div>
            </div>
          )}
        </div>

        {/* Quản trị Đạo đức Nghiên cứu IRB & Xuất Dữ liệu Mở Chuẩn FAIR */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-700" />
            <h3 className="text-base font-semibold text-slate-800">
              Đồng Thuận Phân Tầng (Nghị định 13/2023) &amp; Xuất Chuẩn Mở FAIR
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Phụ huynh dùng đầy đủ mọi tính năng hỗ trợ mà không bắt buộc chia sẻ dữ liệu nghiên cứu. Chỉ hồ sơ bật đồng
            thuận IRB mới được đưa vào bộ dữ liệu khử định danh (ẩn tên, dịch ngày ngẫu nhiên, xóa SĐT/địa chỉ).
          </p>

          <div className="space-y-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-stone-200 p-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800">{p.nickname}</div>
                  <div className="text-slate-500">
                    {p.researchConsentGranted
                      ? `Đã đồng thuận đóng góp dữ liệu khử định danh (${p.irbProtocolCode})`
                      : 'Chỉ dùng nội bộ gia đình — Chặn xuất ra gói nghiên cứu'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleConsent(p)}
                  className={`px-3 py-1.5 rounded-lg font-medium ${
                    p.researchConsentGranted
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-stone-200 text-slate-700 hover:bg-stone-300'
                  }`}
                >
                  {p.researchConsentGranted ? 'Rút đồng thuận 1 chạm' : 'Cấp đồng thuận IRB'}
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleFairExport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" /> Tạo Gói Dữ Liệu Khoa Học Mở Chuẩn FAIR
          </button>

          {fairBundle && (
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Đã xuất {fairBundle.exported_count} phiên khử định danh (loại trừ {fairBundle.excluded_unconsented_count}{' '}
                phiên chưa có đồng thuận IRB).
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadFile('sced_observations.csv', fairBundle.csv_content, 'text/csv;charset=utf-8')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> Tải CSV Khử định danh
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadFile(
                      'datapackage.json',
                      JSON.stringify(fairBundle.datapackage, null, 2),
                      'application/json',
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> Tải FAIR datapackage.json
                </button>
                <button
                  type="button"
                  onClick={() => downloadFile('reproduce_sced.R', fairBundle.reproducible_r_script, 'text/plain')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> Tải Kịch bản R (SingleCaseES)
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
