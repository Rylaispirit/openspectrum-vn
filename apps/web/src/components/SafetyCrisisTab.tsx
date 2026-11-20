import { useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, ShieldCheck } from 'lucide-react';

interface SafetyResult {
  preCheck: {
    blocked: boolean;
    category: string;
    severity: string;
    matchedRule: string | null;
    hotlines: Array<{ number: string; name: string; note: string }>;
    immediateResponseVi: string | null;
    prohibitedActionsVi: string[];
  };
  sanitizedPreview: {
    sanitizedText: string;
    interceptions: string[];
  };
}

export function SafetyCrisisTab() {
  const [testInput, setTestInput] = useState(
    'Bé đang khóc thét, đập đầu vào tường liên tục, có nên lấy chăn nặng quấn chặt con lại không?',
  );
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runCheck(sample?: string) {
    const textToSend = sample ?? testInput;
    if (sample) setTestInput(sample);
    setLoading(true);
    try {
      const resp = await fetch('/api/safety/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      });
      if (resp.ok) {
        setResult((await resp.json()) as SafetyResult);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Đường dây khẩn cấp Quốc gia Việt Nam */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5">
        <div className="flex items-center gap-2 text-rose-800 font-semibold text-lg mb-3">
          <PhoneCall className="w-5 h-5" />
          <span>Danh bạ Hỗ trợ Khẩn cấp Quốc gia Việt Nam (Hoạt động 24/7)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="tel:115"
            className="rounded-xl bg-white p-4 border border-rose-200 shadow-sm hover:border-rose-400 flex flex-col justify-between"
          >
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-sm">
                115 — Cấp cứu Y tế
              </span>
              <p className="mt-2 text-sm text-slate-700">
                Co giật / mắt nhìn đờ không phản ứng, khó thở / sốc phản vệ sau ăn, chấn thương đầu hoặc chảy máu.
              </p>
            </div>
            <span className="mt-3 text-xs font-semibold text-rose-700">Chạm để gọi ngay 115 →</span>
          </a>

          <a
            href="tel:111"
            className="rounded-xl bg-white p-4 border border-amber-200 shadow-sm hover:border-amber-400 flex flex-col justify-between"
          >
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-bold text-sm">
                111 — Bảo vệ Trẻ em (Miễn phí)
              </span>
              <p className="mt-2 text-sm text-slate-700">
                Tổng đài Quốc gia Bảo vệ Trẻ em: hỗ trợ tâm lý phụ huynh kiệt sức, can thiệp nguy cơ bạo hành/xâm hại.
              </p>
            </div>
            <span className="mt-3 text-xs font-semibold text-amber-700">Chạm để gọi miễn phí 111 →</span>
          </a>

          <a
            href="tel:113"
            className="rounded-xl bg-white p-4 border border-slate-200 shadow-sm hover:border-slate-400 flex flex-col justify-between"
          >
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-700 text-white font-bold text-sm">
                113 — Khẩn cấp An ninh / Đi lạc
              </span>
              <p className="mt-2 text-sm text-slate-700">
                Trẻ tự kỷ đi lạc gần sông hồ, đường giao thông (lưu ý báo ngay việc trẻ có thể không quay lại khi gọi tên).
              </p>
            </div>
            <span className="mt-3 text-xs font-semibold text-slate-700">Chạm để gọi 113 →</span>
          </a>
        </div>
      </section>

      {/* Quy trình 4 giai đoạn đồng hành cùng trẻ quá tải (Meltdown) chuẩn Y khoa */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          Quy trình 4 Giai đoạn Hỗ trợ Quá tải Giác quan / Meltdown An toàn (Không dùng Khống chế Cơ thể)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl bg-amber-50/60 border border-amber-200 p-3.5">
            <div className="font-semibold text-amber-900">1. Tiền triệu (Rumbling)</div>
            <p className="mt-1 text-slate-700">
              Nhận biết dấu hiệu riêng của bé (bịt tai, đi lại nhanh, thở gấp). Giảm ngay yêu cầu, đưa thẻ AAC &quot;Nghỉ
              ngơi&quot; hoặc tai nghe giảm ồn.
            </p>
          </div>
          <div className="rounded-xl bg-rose-50/60 border border-rose-200 p-3.5">
            <div className="font-semibold text-rose-900">2. Đỉnh cơn (Bảo vệ cơ thể)</div>
            <p className="mt-1 text-slate-700">
              Lùi người hiếu kỳ ra xa, tắt đèn/tiếng ồn, chèn gối mềm nếu bé đập đầu. Nói cực ngắn, giọng trầm tĩnh:
              &quot;Mẹ/Cô ở đây, con an toàn&quot;.
            </p>
          </div>
          <div className="rounded-xl bg-sky-50/60 border border-sky-200 p-3.5">
            <div className="font-semibold text-sky-900">3. Hồi phục (Recovery)</div>
            <p className="mt-1 text-slate-700">
              Cơ thể trẻ rất mệt sau cơn bão thần kinh. Mời uống nước ấm, hoạt động tĩnh quen thuộc; chưa giảng giải hay
              quay lại bài tập ngay.
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-3.5">
            <div className="font-semibold text-emerald-900">4. Điều chỉnh Môi trường</div>
            <p className="mt-1 text-slate-700">
              Khi cả hai đã bình tĩnh hoàn toàn, ghi lại nhật ký A-B-C để tìm nguyên nhân giác quan/chuyển tiếp và phòng
              ngừa cho lần sau.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-rose-950 text-rose-50 p-3.5 text-xs leading-relaxed">
          <strong>DANH MỤC CẤM TUYỆT ĐỐI (P0 SAFETY):</strong> Nghiêm cấm quấn chăn nặng (weighted blanket), nằm đè hoặc
          khóa giữ tay chân trẻ trong cơn kích động (nguy cơ ngạt thở tử vong); nghiêm cấm chườm đá lạnh, dội nước lạnh;
          nghiêm cấm &quot;phớt lờ dập tắt hành vi&quot; khi trẻ đang tự gây thương tích (SIB).
        </div>
      </section>

      {/* Bàn kiểm chứng Tường lửa An toàn Lâm sàng */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Kiểm chứng trực tiếp Tường lửa An toàn Lâm sàng Tất định (Pre-LLM &amp; Post-LLM Gate)
            </h2>
            <p className="text-sm text-slate-600">
              Thử nghiệm cách hệ thống tự động chặn các tình huống nguy hiểm trước khi bất kỳ mô hình AI nào được phép
              trả lời.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => runCheck('Con tự nhiên mắt nhìn đờ không phản ứng rồi co giật nhẹ tay phải')}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-700 font-medium"
            >
              Mẫu: Dấu hiệu co giật
            </button>
            <button
              type="button"
              onClick={() => runCheck('Bé ăn bánh có đậu phộng xong bị sưng môi khó thở')}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-700 font-medium"
            >
              Mẫu: Phản vệ dị ứng
            </button>
            <button
              type="button"
              onClick={() => runCheck('Tôi kiệt sức hoàn toàn rồi, không muốn sống nữa')}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-700 font-medium"
            >
              Mẫu: Phụ huynh khủng hoảng
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          className="w-full rounded-xl border border-stone-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          placeholder="Nhập tình huống thực tế để kiểm tra bộ lọc an toàn lâm sàng..."
        />

        <button
          type="button"
          onClick={() => runCheck()}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Đang kiểm tra quy tắc an toàn...' : 'Chạy Kiểm tra Tường lửa An toàn'}
        </button>

        {result && (
          <div
            className={`rounded-xl border p-4 space-y-3 ${
              result.preCheck.blocked ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {result.preCheck.blocked ? (
                <>
                  <ShieldAlert className="w-5 h-5 text-rose-700" />
                  <span className="text-rose-800">
                    ĐÃ CHẶN LUỒNG AI — Kích hoạt Giao thức An toàn Cứng ({result.preCheck.category})
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <span className="text-emerald-800">
                    Không phát hiện tín hiệu cấp cứu P0 — Cho phép chuyển sang công cụ giáo dục hỗ trợ
                  </span>
                </>
              )}
            </div>

            {result.preCheck.immediateResponseVi && (
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 bg-white/90 rounded-lg p-3 border border-rose-200">
                {result.preCheck.immediateResponseVi}
              </pre>
            )}

            {result.preCheck.prohibitedActionsVi.length > 0 && (
              <div className="text-xs text-rose-900 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Các thao tác bị nghiêm cấm:
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {result.preCheck.prohibitedActionsVi.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
