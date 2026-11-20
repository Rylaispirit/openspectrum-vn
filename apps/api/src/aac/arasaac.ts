/**
 * Kho Biểu tượng Giao tiếp Tăng cường & Thay thế (AAC) Mã nguồn mở Tiếng Việt
 *
 * Nguồn biểu tượng chuẩn lâm sàng: ARASAAC (https://arasaac.org — CC BY-NC-SA 4.0)
 * Thiết kế phẳng, tương phản rõ, không gây quá tải giác quan cho trẻ tự kỷ.
 */

export interface AACCard {
  id: string;
  arasaacId: number;
  labelVi: string;
  spokenPhraseVi: string;
  labelEn: string;
  category: 'core' | 'needs' | 'sensory' | 'feelings' | 'activities';
  colorClass: string; // Chuẩn mã hóa màu Fitzgerald Key hỗ trợ trẻ nhận diện nhanh
  imageUrl: string;
}

const STATIC_BASE = process.env.ARASAAC_STATIC_BASE || 'https://static.arasaac.org/pictograms';
const API_BASE = process.env.ARASAAC_API_BASE || 'https://api.arasaac.org/v1';

function buildPictoUrl(arasaacId: number): string {
  return `${STATIC_BASE}/${arasaacId}/${arasaacId}_500.png`;
}

/**
 * Bộ từ vựng AAC cốt lõi Tiếng Việt (Core + Nhu cầu thiết yếu + Điều hòa giác quan)
 * Mã màu Fitzgerald Key dịu mắt:
 * - Vàng ấm (core/đại từ - giao tiếp xã hội)
 * - Xanh lá (hành động/yêu cầu cốt lõi)
 * - Xanh dương (nhu cầu cơ thể & cảm giác)
 * - Tím nhạt (điều hòa giác quan - cực kỳ quan trọng với trẻ tự kỷ)
 */
export const CORE_VIETNAMESE_AAC_CARDS: AACCard[] = [
  {
    id: 'want',
    arasaacId: 5441,
    labelVi: 'Con muốn',
    spokenPhraseVi: 'Con muốn',
    labelEn: 'I want',
    category: 'core',
    colorClass: 'bg-emerald-50 border-emerald-300',
    imageUrl: buildPictoUrl(5441),
  },
  {
    id: 'help',
    arasaacId: 32648,
    labelVi: 'Giúp con',
    spokenPhraseVi: 'Giúp con với ạ',
    labelEn: 'Help me',
    category: 'core',
    colorClass: 'bg-amber-50 border-amber-300',
    imageUrl: buildPictoUrl(32648),
  },
  {
    id: 'stop',
    arasaacId: 7196,
    labelVi: 'Dừng lại',
    spokenPhraseVi: 'Cho con dừng lại',
    labelEn: 'Stop',
    category: 'core',
    colorClass: 'bg-rose-50 border-rose-300',
    imageUrl: buildPictoUrl(7196),
  },
  {
    id: 'more',
    arasaacId: 5508,
    labelVi: 'Thêm nữa',
    spokenPhraseVi: 'Cho con thêm nữa',
    labelEn: 'More',
    category: 'core',
    colorClass: 'bg-emerald-50 border-emerald-300',
    imageUrl: buildPictoUrl(5508),
  },
  {
    id: 'all-done',
    arasaacId: 2226,
    labelVi: 'Xong rồi',
    spokenPhraseVi: 'Con làm xong rồi',
    labelEn: 'All done',
    category: 'core',
    colorClass: 'bg-slate-100 border-slate-300',
    imageUrl: buildPictoUrl(2226),
  },
  {
    id: 'wait',
    arasaacId: 36914,
    labelVi: 'Chờ một chút',
    spokenPhraseVi: 'Chờ một chút nhé',
    labelEn: 'Wait',
    category: 'core',
    colorClass: 'bg-amber-50 border-amber-300',
    imageUrl: buildPictoUrl(36914),
  },
  {
    id: 'drink-water',
    arasaacId: 6061,
    labelVi: 'Uống nước',
    spokenPhraseVi: 'Con muốn uống nước',
    labelEn: 'Drink water',
    category: 'needs',
    colorClass: 'bg-sky-50 border-sky-300',
    imageUrl: buildPictoUrl(6061),
  },
  {
    id: 'eat',
    arasaacId: 6456,
    labelVi: 'Ăn cơm / bánh',
    spokenPhraseVi: 'Con đói, con muốn ăn',
    labelEn: 'Eat',
    category: 'needs',
    colorClass: 'bg-sky-50 border-sky-300',
    imageUrl: buildPictoUrl(6456),
  },
  {
    id: 'toilet',
    arasaacId: 6929,
    labelVi: 'Đi vệ sinh',
    spokenPhraseVi: 'Con muốn đi vệ sinh',
    labelEn: 'Toilet',
    category: 'needs',
    colorClass: 'bg-sky-50 border-sky-300',
    imageUrl: buildPictoUrl(6929),
  },
  {
    id: 'pain',
    arasaacId: 2368,
    labelVi: 'Con bị đau',
    spokenPhraseVi: 'Con cảm thấy bị đau khó chịu',
    labelEn: 'Pain / Hurt',
    category: 'needs',
    colorClass: 'bg-rose-50 border-rose-300',
    imageUrl: buildPictoUrl(2368),
  },
  {
    id: 'too-loud',
    arasaacId: 29954,
    labelVi: 'Ồn quá',
    spokenPhraseVi: 'Ở đây ồn quá, cho con đeo tai nghe hoặc ra góc yên tĩnh',
    labelEn: 'Too loud',
    category: 'sensory',
    colorClass: 'bg-violet-50 border-violet-300',
    imageUrl: buildPictoUrl(29954),
  },
  {
    id: 'quiet-break',
    arasaacId: 7137,
    labelVi: 'Góc yên tĩnh',
    spokenPhraseVi: 'Con cần nghỉ ngơi ở góc yên tĩnh',
    labelEn: 'Quiet break',
    category: 'sensory',
    colorClass: 'bg-violet-50 border-violet-300',
    imageUrl: buildPictoUrl(7137),
  },
  {
    id: 'happy',
    arasaacId: 35533,
    labelVi: 'Con vui',
    spokenPhraseVi: 'Con đang thấy vui',
    labelEn: 'Happy',
    category: 'feelings',
    colorClass: 'bg-teal-50 border-teal-300',
    imageUrl: buildPictoUrl(35533),
  },
  {
    id: 'tired',
    arasaacId: 35537,
    labelVi: 'Con mệt',
    spokenPhraseVi: 'Con thấy mệt rồi',
    labelEn: 'Tired',
    category: 'feelings',
    colorClass: 'bg-teal-50 border-teal-300',
    imageUrl: buildPictoUrl(35537),
  },
  {
    id: 'play-toy',
    arasaacId: 32568,
    labelVi: 'Chơi đồ chơi',
    spokenPhraseVi: 'Con muốn chơi đồ chơi',
    labelEn: 'Play toys',
    category: 'activities',
    colorClass: 'bg-orange-50 border-orange-300',
    imageUrl: buildPictoUrl(32568),
  },
  {
    id: 'read-book',
    arasaacId: 2450,
    labelVi: 'Đọc sách',
    spokenPhraseVi: 'Con muốn xem sách cùng ba mẹ',
    labelEn: 'Read book',
    category: 'activities',
    colorClass: 'bg-orange-50 border-orange-300',
    imageUrl: buildPictoUrl(2450),
  },
];

const VI_TO_EN_BRIDGE: Record<string, string> = {
  'uống nước': 'water',
  nước: 'water',
  sữa: 'milk',
  ăn: 'eat',
  cơm: 'rice',
  'vệ sinh': 'toilet',
  ngủ: 'sleep',
  mệt: 'tired',
  ồn: 'noise',
  'tai nghe': 'headphones',
  vui: 'happy',
  buồn: 'sad',
  sợ: 'scared',
  đau: 'pain',
  'đồ chơi': 'toy',
  bóng: 'ball',
  sách: 'book',
  nhạc: 'music',
  trường: 'school',
  mẹ: 'mother',
  bố: 'father',
  ba: 'father',
  cô: 'teacher',
  'rửa tay': 'wash hands',
  'đánh răng': 'brush teeth',
  'mặc áo': 'shirt',
  giày: 'shoes',
};

export async function searchArasaacPictograms(queryVi: string): Promise<AACCard[]> {
  const normalized = queryVi.trim().toLowerCase();
  if (!normalized) return CORE_VIETNAMESE_AAC_CARDS;

  // 1. Khớp nhanh trong bộ từ vựng cốt lõi địa phương hóa sẵn
  const localHits = CORE_VIETNAMESE_AAC_CARDS.filter(
    (c) =>
      c.labelVi.toLowerCase().includes(normalized) ||
      c.spokenPhraseVi.toLowerCase().includes(normalized) ||
      c.labelEn.toLowerCase().includes(normalized),
  );

  // 2. Gọi API mở ARASAAC (thử tiếng Việt trước, cầu nối sang tiếng Anh nếu cần)
  const enBridge = VI_TO_EN_BRIDGE[normalized];
  const endpoints = [
    `${API_BASE}/pictograms/vi/search/${encodeURIComponent(normalized)}`,
    ...(enBridge ? [`${API_BASE}/pictograms/en/search/${encodeURIComponent(enBridge)}`] : []),
    `${API_BASE}/pictograms/en/search/${encodeURIComponent(normalized)}`,
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (!resp.ok) continue;
      const items = (await resp.json()) as Array<{
        _id: number;
        keywords?: Array<{ keyword: string }>;
      }>;
      if (Array.isArray(items) && items.length > 0) {
        const remoteCards: AACCard[] = items.slice(0, 12).map((item) => {
          const kw = item.keywords?.[0]?.keyword || queryVi;
          return {
            id: `arasaac-${item._id}`,
            arasaacId: item._id,
            labelVi: queryVi,
            spokenPhraseVi: queryVi,
            labelEn: kw,
            category: 'activities',
            colorClass: 'bg-slate-50 border-slate-300',
            imageUrl: buildPictoUrl(item._id),
          };
        });
        const seen = new Set(localHits.map((c) => c.arasaacId));
        return [...localHits, ...remoteCards.filter((r) => !seen.has(r.arasaacId))];
      }
    } catch {
      // Mất mạng hoặc ngoại tuyến -> dùng bộ thẻ cốt lõi sẵn có
    }
  }

  return localHits;
}
