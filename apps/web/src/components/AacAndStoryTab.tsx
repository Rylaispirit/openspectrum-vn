import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Search, Trash2, Volume2 } from 'lucide-react';
import { speakVietnameseCalm } from '../lib/speech';

interface AACCard {
  id: string;
  arasaacId: number;
  labelVi: string;
  spokenPhraseVi: string;
  labelEn: string;
  category: string;
  colorClass: string;
  imageUrl: string;
}

interface SocialStoryResult {
  titleVi: string;
  sentences: Array<{ type: string; typeLabelVi: string; textVi: string }>;
  carolGrayRatio: {
    descriptiveGroupCount: number;
    coachingCount: number;
    ratioValue: number;
    meetsCarolGrayStandard: boolean;
  };
  providerUsed: string;
}

export function AacAndStoryTab() {
  const [cards, setCards] = useState<AACCard[]>([]);
  const [sentenceStrip, setSentenceStrip] = useState<AACCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Bảng Trước - Sau (First - Then TEACCH)
  const [firstCard, setFirstCard] = useState<AACCard | null>(null);
  const [thenCard, setThenCard] = useState<AACCard | null>(null);
  const [assignMode, setAssignMode] = useState<'strip' | 'first' | 'then'>('strip');

  // Câu chuyện xã hội Carol Gray
  const [childNickname, setChildNickname] = useState('Minh An');
  const [situationVi, setSituationVi] = useState('Đi khám răng định kỳ cùng mẹ');
  const [sensorySupportVi, setSensorySupportVi] = useState('đeo tai nghe giảm ồn và cầm tàu hỏa nhỏ trong tay');
  const [story, setStory] = useState<SocialStoryResult | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState('');

  useEffect(() => {
    fetch('/api/aac/core')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.cards)) {
          setCards(data.cards);
          setFirstCard(data.cards[4] || null);
          setThenCard(data.cards[14] || null);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      const url = searchQuery.trim()
        ? `/api/aac/search?q=${encodeURIComponent(searchQuery.trim())}`
        : '/api/aac/core';
      const resp = await fetch(url);
      const data = await resp.json();
      if (Array.isArray(data.cards)) {
        setCards(data.cards);
      }
    } finally {
      setSearching(false);
    }
  }

  function handleCardTap(card: AACCard) {
    if (assignMode === 'first') {
      setFirstCard(card);
      setAssignMode('strip');
      speakVietnameseCalm(`Trước tiên: ${card.labelVi}`);
      return;
    }
    if (assignMode === 'then') {
      setThenCard(card);
      setAssignMode('strip');
      speakVietnameseCalm(`Sau đó: ${card.labelVi}`);
      return;
    }
    setSentenceStrip((prev) => [...prev.slice(-5), card]);
    speakVietnameseCalm(card.spokenPhraseVi);
  }

  function speakFullStrip() {
    if (sentenceStrip.length === 0) return;
    const text = sentenceStrip.map((c) => c.labelVi).join(', ');
    speakVietnameseCalm(text);
  }

  async function handleGenerateStory(e: React.FormEvent) {
    e.preventDefault();
    setStoryLoading(true);
    setStoryError('');
    try {
      const resp = await fetch('/api/social-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childNickname, situationVi, sensorySupportVi }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setStoryError(data.error || 'Không thể tạo câu chuyện xã hội.');
        setStory(null);
      } else {
        setStory(data as SocialStoryResult);
      }
    } finally {
      setStoryLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Thanh ghép câu AAC phát âm Tiếng Việt */}
      <section className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Bảng Giao Tiếp Tăng Cường &amp; Thay Thế (AAC Tiếng Việt — Biểu tượng Mở ARASAAC)
            </h2>
            <p className="text-xs text-slate-600">
              Kho biểu tượng giáo dục đặc biệt mở chuẩn quốc tế ARASAAC (CC BY-NC-SA 4.0) + giọng đọc Tiếng Việt êm dịu
              (0.85x).
            </p>
            <p className="text-[11px] text-slate-500">
              Tác giả biểu tượng: Sergio Palao • Nguồn: ARASAAC (arasaac.org) • Giấy phép: CC BY-NC-SA • Chủ sở hữu:
              Chính quyền Aragón (Tây Ban Nha)
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thẻ hình (vd: sữa, bóng, rửa tay)..."
              className="rounded-xl border border-stone-300 px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-900"
            >
              <Search className="w-3.5 h-3.5" />
              {searching ? 'Đang tìm...' : 'Tìm ARASAAC'}
            </button>
          </form>
        </div>

        {/* Thanh câu hiện tại của bé */}
        <div className="rounded-xl border-2 border-teal-300 bg-teal-50/40 p-3 flex flex-wrap items-center justify-between gap-3 min-h-20">
          <div className="flex flex-wrap items-center gap-2">
            {sentenceStrip.length === 0 ? (
              <span className="text-sm text-slate-500">
                Chạm vào các thẻ bên dưới để ghép câu và phát âm Tiếng Việt...
              </span>
            ) : (
              sentenceStrip.map((c, idx) => (
                <div
                  key={`${c.id}-${idx}`}
                  className="flex items-center gap-2 rounded-lg bg-white border border-teal-200 px-2.5 py-1.5 shadow-sm"
                >
                  <img src={c.imageUrl} alt={c.labelVi} className="w-9 h-9 object-contain" />
                  <span className="text-sm font-semibold text-slate-800">{c.labelVi}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={speakFullStrip}
              disabled={sentenceStrip.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              <Volume2 className="w-4 h-4" />
              Đọc cả câu
            </button>
            <button
              type="button"
              onClick={() => setSentenceStrip([])}
              disabled={sentenceStrip.length === 0}
              className="inline-flex items-center gap-1 rounded-xl bg-stone-200 hover:bg-stone-300 text-slate-700 px-3 py-2 text-sm disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              Xóa
            </button>
          </div>
        </div>

        {/* Lưới thẻ AAC mã hóa màu Fitzgerald */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardTap(card)}
              className={`rounded-2xl border-2 p-2.5 flex flex-col items-center text-center shadow-sm hover:shadow transition ${card.colorClass}`}
            >
              <img
                src={card.imageUrl}
                alt={card.labelVi}
                loading="lazy"
                className="w-16 h-16 object-contain bg-white rounded-xl p-1"
              />
              <span className="mt-2 text-xs font-bold text-slate-800 leading-tight">{card.labelVi}</span>
            </button>
          ))}
        </div>

        {/* Bảng Trước – Sau (First – Then chuẩn TEACCH hỗ trợ chuyển tiếp êm ái) */}
        <div className="rounded-xl bg-stone-50 border border-stone-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Bảng Trực Quan &quot;TRƯỚC – SAU&quot; (TEACCH First–Then Hỗ trợ Chuyển tiếp)
              </h3>
              <p className="text-xs text-slate-600">
                Giúp trẻ dự đoán rõ hoạt động sắp diễn ra để giảm lo âu chuyển tiếp. Nhấn &quot;Đổi thẻ&quot; rồi chọn 1
                hình phía trên.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (firstCard && thenCard) {
                  speakVietnameseCalm(`Trước tiên ${firstCard.labelVi}, sau đó ${thenCard.labelVi}`);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-medium"
            >
              <Volume2 className="w-3.5 h-3.5" /> Đọc bảng Trước – Sau
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
            <div className="rounded-xl bg-white border-2 border-amber-300 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {firstCard && <img src={firstCard.imageUrl} alt={firstCard.labelVi} className="w-14 h-14 object-contain" />}
                <div>
                  <div className="text-xs font-bold uppercase text-amber-700">1. TRƯỚC TIÊN</div>
                  <div className="font-semibold text-slate-800">{firstCard?.labelVi || 'Chưa chọn'}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignMode('first')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  assignMode === 'first' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-slate-700'
                }`}
              >
                {assignMode === 'first' ? 'Chọn thẻ trên...' : 'Đổi thẻ'}
              </button>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-7 h-7 text-slate-400" />
            </div>

            <div className="rounded-xl bg-white border-2 border-emerald-300 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {thenCard && <img src={thenCard.imageUrl} alt={thenCard.labelVi} className="w-14 h-14 object-contain" />}
                <div>
                  <div className="text-xs font-bold uppercase text-emerald-700">2. SAU ĐÓ</div>
                  <div className="font-semibold text-slate-800">{thenCard?.labelVi || 'Chưa chọn'}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignMode('then')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  assignMode === 'then' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-slate-700'
                }`}
              >
                {assignMode === 'then' ? 'Chọn thẻ trên...' : 'Đổi thẻ'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trình tạo Câu chuyện xã hội Carol Gray */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-slate-800">
            Trình Tạo Câu Chuyện Xã Hội (Carol Gray 10.3 — Tự động kiểm định tỷ lệ &ge; 2:1)
          </h2>
        </div>

        <form onSubmit={handleGenerateStory} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên thân mật của bé</label>
            <input
              type="text"
              value={childNickname}
              onChange={(e) => setChildNickname(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tình huống mới sắp diễn ra</label>
            <input
              type="text"
              value={situationVi}
              onChange={(e) => setSituationVi(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm tựa giác quan / giao tiếp của bé</label>
            <input
              type="text"
              value={sensorySupportVi}
              onChange={(e) => setSensorySupportVi(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={storyLoading}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium disabled:opacity-50"
            >
              {storyLoading ? 'Đang biên soạn & kiểm định tỷ lệ Carol Gray...' : 'Tạo Câu Chuyện Xã Hội Tiếng Việt'}
            </button>
          </div>
        </form>

        {storyError && (
          <div className="rounded-xl bg-rose-50 border border-rose-300 p-3 text-sm text-rose-800 whitespace-pre-wrap">
            {storyError}
          </div>
        )}

        {story && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">{story.titleVi}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tỷ lệ Carol Gray: {story.carolGrayRatio.descriptiveGroupCount}:
                  {story.carolGrayRatio.coachingCount} ({story.carolGrayRatio.ratioValue} &ge; 2.0 Đạt chuẩn)
                </span>
                <button
                  type="button"
                  onClick={() => speakVietnameseCalm(story.sentences.map((s) => s.textVi).join(' '))}
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-700 text-white px-3 py-1 font-medium"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Đọc cho bé nghe
                </button>
              </div>
            </div>

            <ol className="space-y-2">
              {story.sentences.map((s, i) => (
                <li key={i} className="rounded-lg bg-white border border-stone-200 p-3 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-800">{s.textVi}</span>
                  <span className="shrink-0 text-[11px] px-2 py-0.5 rounded bg-stone-100 text-slate-600 font-medium">
                    {s.typeLabelVi}
                  </span>
                </li>
              ))}
            </ol>
            <div className="text-[11px] text-slate-500">Nguồn xử lý: {story.providerUsed}</div>
          </div>
        )}
      </section>
    </div>
  );
}
