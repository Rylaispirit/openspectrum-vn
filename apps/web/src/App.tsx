import { useEffect, useState } from 'react';
import {
  ClipboardList,
  FlaskConical,
  MessageSquareHeart,
  ShieldAlert,
  Sparkles,
  Video,
} from 'lucide-react';
import { SafetyCrisisTab } from './components/SafetyCrisisTab';
import { AacAndStoryTab } from './components/AacAndStoryTab';
import { AbcAndIepTab } from './components/AbcAndIepTab';
import { ResearchLabTab } from './components/ResearchLabTab';
import { PoseCodingTab } from './components/PoseCodingTab';

type TabKey = 'aac' | 'abc' | 'research' | 'pose' | 'safety';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('aac');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [healthInfo, setHealthInfo] = useState<{
    aiAdapter?: { provider: string; model: string };
    pythonResearchEngine?: { online: boolean };
  } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealthInfo(d))
      .catch(() => {});
  }, []);

  return (
    <div className={`min-h-screen bg-stone-50 text-slate-800 ${reduceMotion ? 'reduce-motion' : ''}`}>
      {/* Thanh tiêu đề Thân thiện Giác quan */}
      <header className="border-b border-stone-200 bg-white/95 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">OpenSpectrum-VN</h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
                  Open-Source AGPL-3.0 • 100% Sạch Phụ Thuộc Đóng
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Nền tảng Nghiên cứu Khoa học Mở &amp; Hỗ trợ Khẳng định Đa dạng Thần kinh cho Trẻ Tự kỷ tại Việt Nam
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {healthInfo?.aiAdapter && (
              <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-slate-700">
                AI Mở: <strong>{healthInfo.aiAdapter.provider}</strong> ({healthInfo.aiAdapter.model})
              </span>
            )}
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
              />
              Giảm chuyển động (Sensory Calm)
            </label>
            <button
              type="button"
              onClick={() => setActiveTab('safety')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Khẩn cấp 115 / 111
            </button>
          </div>
        </div>

        {/* Thanh điều hướng 5 phân hệ */}
        <nav className="max-w-7xl mx-auto px-4 pb-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('aac')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'aac' ? 'bg-teal-700 text-white' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" /> 1. Bảng AAC Mở &amp; Câu Chuyện Xã Hội
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('abc')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'abc' ? 'bg-teal-700 text-white' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> 2. Nhật Ký A-B-C &amp; KHGDCN (Thông tư 03/2018)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('research')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'research' ? 'bg-teal-700 text-white' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
            }`}
          >
            <FlaskConical className="w-4 h-4" /> 3. Phòng Nghiên Cứu Khoa Học Mở (SCED, IOA &amp; FAIR)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pose')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'pose' ? 'bg-teal-700 text-white' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
            }`}
          >
            <Video className="w-4 h-4" /> 4. Quan Sát Tư Thế Ẩn Danh Trên Thiết Bị (MediaPipe)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('safety')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'safety' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> 5. Tường Lửa An Toàn Lâm Sàng &amp; Khủng Hoảng
          </button>
        </nav>
      </header>

      {/* Khu vực nội dung chính */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'aac' && <AacAndStoryTab />}
        {activeTab === 'abc' && <AbcAndIepTab />}
        {activeTab === 'research' && <ResearchLabTab />}
        {activeTab === 'pose' && <PoseCodingTab />}
        {activeTab === 'safety' && <SafetyCrisisTab />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 border-t border-stone-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong>Tuyên bố Y khoa:</strong> OpenSpectrum-VN là nền tảng công cụ giáo dục hỗ trợ &amp; nghiên cứu khoa học mở —
          không thay thế chẩn đoán hay chỉ định của bác sĩ chuyên khoa.
        </span>
        <span>
          Mã nguồn: AGPL-3.0 • Học liệu: CC BY-NC-SA 4.0 • Bản thử nghiệm nghiên cứu, chưa thẩm định lâm sàng &amp; pháp lý
        </span>
        <span className="w-full">
          Biểu tượng AAC: tác giả Sergio Palao • Nguồn:{' '}
          <a href="https://arasaac.org" target="_blank" rel="noreferrer" className="underline">
            ARASAAC (arasaac.org)
          </a>{' '}
          • Giấy phép: CC BY-NC-SA • Chủ sở hữu: Chính quyền Aragón (Tây Ban Nha)
        </span>
      </footer>
    </div>
  );
}
