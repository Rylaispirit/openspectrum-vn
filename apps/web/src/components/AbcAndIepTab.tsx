import { useEffect, useState } from 'react';
import { ClipboardList, FileCheck2, HeartHandshake, Mic } from 'lucide-react';
import { startVietnameseDictation } from '../lib/speech';

interface ABCObservation {
  id: string;
  childId: string;
  observedAt: string;
  observerRole: string;
  setting: string;
  painOrFatigueExcluded: boolean;
  antecedent: string;
  behaviorObjective: string;
  consequence: string;
  hypothesizedFunction: string;
  isHarmlessStimming: boolean;
}

interface IEPDraft {
  legalReferenceVi: string;
  strengthsSummaryVi: string;
  smartGoalVi: string;
  classroomAccommodationsVi: string[];
  homeCollaborationVi: string[];
  dataCollectionMethodVi: string;
  providerUsed: string;
}

const FUNCTION_LABELS: Record<string, string> = {
  escape: 'Tránh né quá tải / yêu cầu khó (Escape)',
  attention: 'Tìm kiếm kết nối / sự chú ý (Attention)',
  tangible: 'Tiếp cận đồ vật / hoạt động yêu thích (Tangible)',
  sensory_regulation: 'Tự điều hòa giác quan (Sensory Regulation)',
  pain_medical_check: 'Nghi ngờ khó chịu y khoa / đau / thiếu ngủ (Cần kiểm tra trước)',
};

export function AbcAndIepTab() {
  const [observations, setObservations] = useState<ABCObservation[]>([]);
  const [setting, setSetting] = useState('Tại nhà — Giờ chuẩn bị đi học buổi sáng');
  const [observerRole, setObserverRole] = useState<'parent' | 'teacher' | 'clinician' | 'researcher'>('parent');
  const [painExcluded, setPainExcluded] = useState(true);
  const [antecedent, setAntecedent] = useState('');
  const [behaviorObjective, setBehaviorObjective] = useState('');
  const [consequence, setConsequence] = useState('');
  const [hypothesizedFunction, setHypothesizedFunction] = useState('escape');
  const [isHarmlessStimming, setIsHarmlessStimming] = useState(false);
  const [listeningField, setListeningField] = useState<string | null>(null);
  const [safetyAlertMsg, setSafetyAlertMsg] = useState<string | null>(null);

  // IEP (KHGDCN Thông tư 03/2018/TT-BGDĐT)
  const [childNickname, setChildNickname] = useState('Minh An');
  const [ageMonths, setAgeMonths] = useState(54);
  const [strengths, setStrengths] = useState('Rất thích tàu hỏa, nhớ hình ảnh tốt, ghép hình nhanh');
  const [priorityDomain, setPriorityDomain] = useState('Giao tiếp chủ động bày tỏ nhu cầu bằng thẻ AAC kết hợp lời nói');
  const [currentBaselineVi, setCurrentBaselineVi] = useState(
    'Hiện kéo tay người lớn khi cần lấy đồ vật (chủ động trao thẻ 1/5 cơ hội)',
  );
  const [iepDraft, setIepDraft] = useState<IEPDraft | null>(null);
  const [iepLoading, setIepLoading] = useState(false);

  useEffect(() => {
    fetch('/api/abc')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.observations)) setObservations(d.observations);
      })
      .catch(() => {});
  }, []);

  function dictateInto(field: 'A' | 'B' | 'C') {
    startVietnameseDictation(
      (txt) => {
        if (field === 'A') setAntecedent((p) => (p ? `${p} ${txt}` : txt));
        if (field === 'B') setBehaviorObjective((p) => (p ? `${p} ${txt}` : txt));
        if (field === 'C') setConsequence((p) => (p ? `${p} ${txt}` : txt));
      },
      (active) => setListeningField(active ? field : null),
    );
  }

  async function handleAddAbc(e: React.FormEvent) {
    e.preventDefault();
    setSafetyAlertMsg(null);
    const resp = await fetch('/api/abc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: 'child-demo-01',
        observerRole,
        setting,
        painOrFatigueExcluded: painExcluded,
        antecedent,
        behaviorObjective,
        consequence,
        hypothesizedFunction,
        isHarmlessStimming,
      }),
    });
    const data = await resp.json();
    if (resp.ok && data.observation) {
      setObservations((prev) => [data.observation, ...prev]);
      setAntecedent('');
      setBehaviorObjective('');
      setConsequence('');
      if (data.safetyAlert?.immediateResponseVi) {
        setSafetyAlertMsg(data.safetyAlert.immediateResponseVi);
      }
    }
  }

  async function handleGenerateIep(e: React.FormEvent) {
    e.preventDefault();
    setIepLoading(true);
    try {
      const resp = await fetch('/api/iep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childNickname,
          ageMonths: Number(ageMonths),
          strengths,
          priorityDomain,
          currentBaselineVi,
        }),
      });
      if (resp.ok) {
        setIepDraft((await resp.json()) as IEPDraft);
      }
    } finally {
      setIepLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Nhật ký Đánh giá Hành vi Chức năng A-B-C */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-teal-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Nhật Ký Quan Sát Hành Vi Chức Năng A – B – C (FBA Chuẩn Đa dạng Thần kinh)
            </h2>
            <p className="text-xs text-slate-600">
              Luôn loại trừ nguyên nhân y khoa (đau răng, đau bụng, mất ngủ) trước khi phân tích hành vi, và không can
              thiệp xóa bỏ các vận động tự điều hòa giác quan vô hại (stimming).
            </p>
          </div>
        </div>

        <form onSubmit={handleAddAbc} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Người ghi nhận</label>
              <select
                value={observerRole}
                onChange={(e) => setObserverRole(e.target.value as 'parent' | 'teacher' | 'clinician' | 'researcher')}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                <option value="parent">Phụ huynh / Gia đình</option>
                <option value="teacher">Giáo viên hòa nhập / Đặc biệt</option>
                <option value="clinician">Chuyên viên Tâm lý / Âm ngữ trị liệu</option>
                <option value="researcher">Nhà nghiên cứu thực địa</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bối cảnh &amp; Môi trường</label>
              <input
                type="text"
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">A — Tiền đề (Điều gì xảy ra ngay trước?)</label>
                <button
                  type="button"
                  onClick={() => dictateInto('A')}
                  className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium"
                >
                  <Mic className="w-3.5 h-3.5" /> {listeningField === 'A' ? 'Đang nghe...' : 'Nói vi-VN'}
                </button>
              </div>
              <textarea
                rows={3}
                required
                value={antecedent}
                onChange={(e) => setAntecedent(e.target.value)}
                placeholder="VD: Tiếng máy xay sinh tố kêu to bất ngờ..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  B — Hành vi quan sát khách quan (Không phán xét)
                </label>
                <button
                  type="button"
                  onClick={() => dictateInto('B')}
                  className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium"
                >
                  <Mic className="w-3.5 h-3.5" /> {listeningField === 'B' ? 'Đang nghe...' : 'Nói vi-VN'}
                </button>
              </div>
              <textarea
                rows={3}
                required
                value={behaviorObjective}
                onChange={(e) => setBehaviorObjective(e.target.value)}
                placeholder="VD: Bé bịt chặt hai tai, ngồi thụp xuống góc bếp 30 giây..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  C — Hệ quả ngay sau đó &amp; Phản ứng người lớn
                </label>
                <button
                  type="button"
                  onClick={() => dictateInto('C')}
                  className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium"
                >
                  <Mic className="w-3.5 h-3.5" /> {listeningField === 'C' ? 'Đang nghe...' : 'Nói vi-VN'}
                </button>
              </div>
              <textarea
                rows={3}
                required
                value={consequence}
                onChange={(e) => setConsequence(e.target.value)}
                placeholder="VD: Mẹ tắt máy xay, đưa tai nghe chống ồn và thẻ 'Ồn quá'..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Giả thuyết chức năng hành vi</label>
              <select
                value={hypothesizedFunction}
                onChange={(e) => setHypothesizedFunction(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                {Object.entries(FUNCTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 pt-4">
              <input
                type="checkbox"
                checked={painExcluded}
                onChange={(e) => setPainExcluded(e.target.checked)}
                className="rounded"
              />
              Đã kiểm tra loại trừ nguyên nhân đau / sốt / mất ngủ / đói
            </label>

            <label className="flex items-center gap-2 text-xs text-teal-800 font-medium pt-4">
              <input
                type="checkbox"
                checked={isHarmlessStimming}
                onChange={(e) => setIsHarmlessStimming(e.target.checked)}
                className="rounded"
              />
              Đây là vận động tự điều hòa vô hại (Stimming — Tôn trọng, không dập tắt)
            </label>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium"
          >
            Lưu Nhật ký Quan sát A-B-C
          </button>
        </form>

        {safetyAlertMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-300 p-3.5 text-sm text-rose-900 whitespace-pre-wrap">
            {safetyAlertMsg}
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          {observations.map((obs) => (
            <div key={obs.id} className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 text-sm space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  <strong>{obs.setting}</strong> • {new Date(obs.observedAt).toLocaleString('vi-VN')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white border border-stone-200 text-slate-700 font-medium">
                    {FUNCTION_LABELS[obs.hypothesizedFunction] || obs.hypothesizedFunction}
                  </span>
                  {obs.isHarmlessStimming && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                      <HeartHandshake className="w-3.5 h-3.5" /> Stimming vô hại — Bảo vệ quyền tự điều hòa
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-800">
                <div className="bg-white rounded-lg p-2 border border-stone-200">
                  <strong>A (Tiền đề):</strong> {obs.antecedent}
                </div>
                <div className="bg-white rounded-lg p-2 border border-stone-200">
                  <strong>B (Hành vi):</strong> {obs.behaviorObjective}
                </div>
                <div className="bg-white rounded-lg p-2 border border-stone-200">
                  <strong>C (Hệ quả):</strong> {obs.consequence}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Kế hoạch Giáo dục Cá nhân KHGDCN / IEP theo Thông tư 03/2018/TT-BGDĐT */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-teal-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Trợ Lý Xây Dựng Kế Hoạch Giáo Dục Cá Nhân (KHGDCN / IEP — Thông tư 03/2018/TT-BGDĐT)
            </h2>
            <p className="text-xs text-slate-600">
              Thiết kế mục tiêu dựa trên điểm mạnh và sở thích của trẻ, kết hợp điều chỉnh môi trường lớp học hòa nhập
              tại Việt Nam.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerateIep} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên gọi của trẻ</label>
            <input
              type="text"
              value={childNickname}
              onChange={(e) => setChildNickname(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Độ tuổi (tính theo tháng)</label>
            <input
              type="number"
              min={12}
              max={240}
              value={ageMonths}
              onChange={(e) => setAgeMonths(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm mạnh &amp; Sở thích đặc biệt</label>
            <input
              type="text"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lĩnh vực kỹ năng ưu tiên hỗ trợ</label>
            <input
              type="text"
              value={priorityDomain}
              onChange={(e) => setPriorityDomain(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mức độ hiện tại (Đường cơ sở)</label>
            <input
              type="text"
              value={currentBaselineVi}
              onChange={(e) => setCurrentBaselineVi(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={iepLoading}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium disabled:opacity-50"
            >
              {iepLoading ? 'Đang lập dự thảo KHGDCN...' : 'Tạo Dự thảo KHGDCN (Thông tư 03/2018/TT-BGDĐT)'}
            </button>
          </div>
        </form>

        {iepDraft && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-4 space-y-3 text-sm">
            <div className="text-xs font-semibold text-teal-800 bg-teal-100/80 px-3 py-1.5 rounded-lg">
              {iepDraft.legalReferenceVi}
            </div>
            <div>
              <strong>Hồ sơ Điểm mạnh:</strong> {iepDraft.strengthsSummaryVi}
            </div>
            <div className="bg-white rounded-lg p-3 border border-teal-200">
              <strong>Mục tiêu SMART Ngắn hạn:</strong> {iepDraft.smartGoalVi}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-stone-200">
                <strong className="block mb-1">Điều chỉnh Lớp học Hòa nhập (UDL / TEACCH):</strong>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                  {iepDraft.classroomAccommodationsVi.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-lg p-3 border border-stone-200">
                <strong className="block mb-1">Phối hợp Gia đình – Nhà trường:</strong>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                  {iepDraft.homeCollaborationVi.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              <strong>Phương pháp đo lường tiến bộ:</strong> {iepDraft.dataCollectionMethodVi} • ({iepDraft.providerUsed})
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
