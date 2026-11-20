/**
 * CỔNG KẾT NỐI MÔ HÌNH NGÔN NGỮ LỚN MỞ (OPEN MULTI-MODEL ADAPTER)
 *
 * Chế độ mặc định:
 * - `ollama` (chạy cục bộ miễn phí tại http://localhost:11434/v1, mặc định `gemma3:4b`)
 * - Hỗ trợ cắm `gemini` (Google Gemini API) hoặc `openai` (OpenAI-compatible) qua `.env`
 * - Đặc biệt: Tích hợp sẵn bộ sinh mẫu lâm sàng tất định Tiếng Việt (Offline Fallback) để hệ thống
 *   LUÔN CHẠY ĐƯỢC NGAY LẬP TỨC kể cả khi máy người dùng chưa bật Ollama hoặc chưa có khóa API!
 */

import { evaluatePreLLMSafety, sanitizeLLMOutputVi } from '../safety/firewall.js';

export type AIProviderType = 'ollama' | 'gemini' | 'openai';

export interface SocialStorySentence {
  type: 'DESCRIPTIVE' | 'PERSPECTIVE' | 'AFFIRMATIVE' | 'COACHING';
  typeLabelVi: string;
  textVi: string;
}

export interface SocialStoryResult {
  titleVi: string;
  sentences: SocialStorySentence[];
  carolGrayRatio: {
    descriptiveGroupCount: number;
    coachingCount: number;
    ratioValue: number;
    meetsCarolGrayStandard: boolean; // >= 2.0 theo tiêu chuẩn Carol Gray 10.2/10.3
  };
  providerUsed: string;
  safetyInterceptions: string[];
}

export function getActiveProviderInfo(): { provider: AIProviderType; model: string } {
  const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase() as AIProviderType;
  if (provider === 'gemini') {
    return { provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' };
  }
  if (provider === 'openai') {
    return { provider: 'openai', model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
  }
  return { provider: 'ollama', model: process.env.OLLAMA_MODEL || 'gemma3:4b' };
}

async function callOpenModelRaw(systemPrompt: string, userPrompt: string): Promise<{ text: string; providerLabel: string } | null> {
  const { provider, model } = getActiveProviderInfo();

  try {
    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return null;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      });
      if (!resp.ok) return null;
      const data = (await resp.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return text ? { text, providerLabel: `gemini:${model}` } : null;
    }

    const baseUrl =
      provider === 'openai'
        ? process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
        : process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
    const apiKey = provider === 'openai' ? process.env.OPENAI_API_KEY || '' : 'ollama-local';
    if (provider === 'openai' && !apiKey) return null;

    const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content;
    return text ? { text, providerLabel: `${provider}:${model}` } : null;
  } catch {
    return null;
  }
}

export function calculateCarolGrayRatio(sentences: SocialStorySentence[]) {
  const descriptiveGroupCount = sentences.filter((s) => s.type !== 'COACHING').length;
  const coachingCount = sentences.filter((s) => s.type === 'COACHING').length;
  const effectiveDenominator = Math.max(1, coachingCount);
  const ratioValue = Number((descriptiveGroupCount / effectiveDenominator).toFixed(2));
  return {
    descriptiveGroupCount,
    coachingCount,
    ratioValue,
    meetsCarolGrayStandard: ratioValue >= 2.0,
  };
}

/**
 * Tạo Câu chuyện xã hội (Social Story) chuẩn Carol Gray bằng Tiếng Việt,
 * tự động kiểm định tỷ lệ câu Mô tả / Thấu cảm / Khẳng định so với câu Hướng dẫn >= 2:1.
 */
export async function generateSocialStoryVi(params: {
  childNickname: string;
  situationVi: string;
  sensorySupportVi?: string;
}): Promise<SocialStoryResult> {
  const safety = evaluatePreLLMSafety(`${params.situationVi} ${params.sensorySupportVi || ''}`);
  if (safety.blocked) {
    throw new Error(safety.immediateResponseVi || 'Đã kích hoạt cổng an toàn khẩn cấp.');
  }

  const name = params.childNickname.trim() || 'Con';
  const situation = params.situationVi.trim();
  const support = params.sensorySupportVi?.trim() || 'cầm thẻ giao tiếp hoặc xin nghỉ ở góc yên tĩnh';

  const systemPrompt =
    'Bạn là chuyên gia giáo dục đặc biệt theo chuẩn Câu chuyện xã hội Carol Gray 10.3 và tiếp cận khẳng định đa dạng thần kinh. ' +
    'Hãy trả về DUY NHẤT một JSON hợp lệ có cấu trúc: {"titleVi":"...","sentences":[{"type":"DESCRIPTIVE|PERSPECTIVE|AFFIRMATIVE|COACHING","textVi":"..."}]}. ' +
    'BẮT BUỘC số câu DESCRIPTIVE+PERSPECTIVE+AFFIRMATIVE phải gấp ít nhất 3 lần số câu COACHING (tỷ lệ >= 3:1). ' +
    'Ngôi thứ nhất hoặc tên trẻ ấm áp, câu ngắn rõ ràng, tuyệt đối không dọa nạt hay ép nhìn mắt.';

  const llmRes = await callOpenModelRaw(
    systemPrompt,
    `Tên trẻ: ${name}. Tình huống cần chuẩn bị trước: ${situation}. Hỗ trợ giác quan/giao tiếp sẵn có: ${support}.`,
  );

  if (llmRes) {
    try {
      const jsonMatch = llmRes.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          titleVi?: string;
          sentences?: Array<{ type?: string; textVi?: string }>;
        };
        if (Array.isArray(parsed.sentences) && parsed.sentences.length >= 4) {
          const typeLabels: Record<SocialStorySentence['type'], string> = {
            DESCRIPTIVE: 'Câu mô tả thực tế',
            PERSPECTIVE: 'Câu thấu cảm góc nhìn',
            AFFIRMATIVE: 'Câu khẳng định an toàn',
            COACHING: 'Câu gợi ý nhẹ nhàng',
          };
          const interceptionsAll: string[] = [];
          const normalizedSentences: SocialStorySentence[] = parsed.sentences.map((s) => {
            const rawType = (s.type || 'DESCRIPTIVE').toUpperCase();
            const safeType: SocialStorySentence['type'] =
              rawType === 'PERSPECTIVE' || rawType === 'AFFIRMATIVE' || rawType === 'COACHING'
                ? rawType
                : 'DESCRIPTIVE';
            const filtered = sanitizeLLMOutputVi(s.textVi || '');
            interceptionsAll.push(...filtered.interceptions);
            return {
              type: safeType,
              typeLabelVi: typeLabels[safeType],
              textVi: filtered.sanitizedText,
            };
          });
          const ratio = calculateCarolGrayRatio(normalizedSentences);
          if (ratio.meetsCarolGrayStandard) {
            return {
              titleVi: sanitizeLLMOutputVi(parsed.titleVi || `Câu chuyện của ${name}: ${situation}`).sanitizedText,
              sentences: normalizedSentences,
              carolGrayRatio: ratio,
              providerUsed: llmRes.providerLabel,
              safetyInterceptions: interceptionsAll,
            };
          }
        }
      }
    } catch {
      // Rơi về mẫu chuẩn Carol Gray tất định bên dưới nếu LLM trả JSON sai định dạng
    }
  }

  // Mẫu chuẩn Carol Gray 10.3 tất định (5 câu mô tả/thấu cảm/khẳng định : 1 câu gợi ý -> tỷ lệ 5:1 >= 2:1)
  const fallbackSentences: SocialStorySentence[] = [
    {
      type: 'DESCRIPTIVE',
      typeLabelVi: 'Câu mô tả thực tế',
      textVi: `Sắp tới, ${name} sẽ cùng người lớn tham gia hoạt động: ${situation}.`,
    },
    {
      type: 'DESCRIPTIVE',
      typeLabelVi: 'Câu mô tả thực tế',
      textVi: `Đôi khi nơi mới có thể có âm thanh hoặc sự thay đổi làm ${name} thấy lạ lẫm.`,
    },
    {
      type: 'PERSPECTIVE',
      typeLabelVi: 'Câu thấu cảm góc nhìn',
      textVi: `Ba mẹ và thầy cô luôn hiểu cảm giác của ${name} và ở ngay bên cạnh để đồng hành cùng ${name}.`,
    },
    {
      type: 'AFFIRMATIVE',
      typeLabelVi: 'Câu khẳng định an toàn',
      textVi: `Cảm thấy hồi hộp một chút trước hoạt động mới là điều hoàn toàn tự nhiên và an toàn.`,
    },
    {
      type: 'COACHING',
      typeLabelVi: 'Câu gợi ý nhẹ nhàng',
      textVi: `Khi cần thêm thời gian hoặc thấy mệt, ${name} có thể thử ${support}.`,
    },
    {
      type: 'AFFIRMATIVE',
      typeLabelVi: 'Câu khẳng định an toàn',
      textVi: `Sau khi hoàn thành từng bước nhỏ trên bảng lịch trình, ${name} sẽ được nghỉ ngơi thoải mái.`,
    },
  ];

  return {
    titleVi: `Cùng ${name} chuẩn bị cho: ${situation}`,
    sentences: fallbackSentences,
    carolGrayRatio: calculateCarolGrayRatio(fallbackSentences),
    providerUsed: 'deterministic-carol-gray-template-vi (Offline Ready)',
    safetyInterceptions: [],
  };
}

/**
 * Trình hỗ trợ xây dựng dự thảo Kế hoạch Giáo dục Cá nhân (KHGDCN / IEP)
 * theo khung Thông tư 03/2018/TT-BGDĐT của Bộ Giáo dục và Đào tạo Việt Nam.
 */
export async function generateVietnameseIEPDraft(params: {
  childNickname: string;
  ageMonths: number;
  strengths: string;
  priorityDomain: string;
  currentBaselineVi: string;
}): Promise<{
  legalReferenceVi: string;
  strengthsSummaryVi: string;
  smartGoalVi: string;
  classroomAccommodationsVi: string[];
  homeCollaborationVi: string[];
  dataCollectionMethodVi: string;
  providerUsed: string;
}> {
  const safety = evaluatePreLLMSafety(`${params.strengths} ${params.priorityDomain} ${params.currentBaselineVi}`);
  if (safety.blocked) {
    throw new Error(safety.immediateResponseVi || 'Đã kích hoạt cổng an toàn khẩn cấp.');
  }

  const years = (params.ageMonths / 12).toFixed(1);
  const systemPrompt =
    'Bạn là chuyên gia Giáo dục Hòa nhập tại Việt Nam, nắm vững Thông tư 03/2018/TT-BGDĐT về giáo dục hòa nhập đối với người khuyết tật và tiếp cận khẳng định đa dạng thần kinh. ' +
    'Không chẩn đoán y khoa, không ép giao tiếp mắt, không xóa bỏ stimming vô hại. ' +
    'Trả về JSON hợp lệ: {"strengthsSummaryVi":"...","smartGoalVi":"...","classroomAccommodationsVi":["..."],"homeCollaborationVi":["..."],"dataCollectionMethodVi":"..."}.';

  const llmRes = await callOpenModelRaw(
    systemPrompt,
    `Trẻ: ${params.childNickname} (${params.ageMonths} tháng tuổi ~ ${years} tuổi). Điểm mạnh & sở thích: ${params.strengths}. Lĩnh vực ưu tiên: ${params.priorityDomain}. Mức hiện tại: ${params.currentBaselineVi}.`,
  );

  if (llmRes) {
    try {
      const jsonMatch = llmRes.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          strengthsSummaryVi?: string;
          smartGoalVi?: string;
          classroomAccommodationsVi?: string[];
          homeCollaborationVi?: string[];
          dataCollectionMethodVi?: string;
        };
        if (parsed.smartGoalVi && Array.isArray(parsed.classroomAccommodationsVi)) {
          return {
            legalReferenceVi:
              'Dự thảo tham chiếu khung Kế hoạch Giáo dục Cá nhân (KHGDCN) theo Thông tư 03/2018/TT-BGDĐT — Cần có sự thống nhất giữa Giáo viên, Phụ huynh và Ban giám hiệu.',
            strengthsSummaryVi: sanitizeLLMOutputVi(parsed.strengthsSummaryVi || params.strengths).sanitizedText,
            smartGoalVi: sanitizeLLMOutputVi(parsed.smartGoalVi).sanitizedText,
            classroomAccommodationsVi: parsed.classroomAccommodationsVi.map(
              (x) => sanitizeLLMOutputVi(x).sanitizedText,
            ),
            homeCollaborationVi: (parsed.homeCollaborationVi || []).map((x) => sanitizeLLMOutputVi(x).sanitizedText),
            dataCollectionMethodVi: sanitizeLLMOutputVi(
              parsed.dataCollectionMethodVi || 'Ghi nhận tần suất theo phiên 15 phút (3 lần/tuần).',
            ).sanitizedText,
            providerUsed: llmRes.providerLabel,
          };
        }
      }
    } catch {
      // Fallback sang khung chuẩn Thông tư 03/2018 bên dưới
    }
  }

  return {
    legalReferenceVi:
      'Dự thảo tham chiếu khung Kế hoạch Giáo dục Cá nhân (KHGDCN) theo Thông tư 03/2018/TT-BGDĐT — Cần có sự thống nhất giữa Giáo viên, Phụ huynh và Ban giám hiệu.',
    strengthsSummaryVi: `${params.childNickname} (${years} tuổi) có thế mạnh nổi bật và hứng thú sâu sắc với: ${params.strengths}. Đây là điểm tựa chính để kết nối hoạt động học tập.`,
    smartGoalVi: `Trong 8 tuần tới, trong các hoạt động gắn với sở thích (${params.strengths}), ${params.childNickname} sẽ thực hiện kỹ năng thuộc lĩnh vực "${params.priorityDomain}" (xuất phát từ mức cơ sở: ${params.currentBaselineVi}) với sự hỗ trợ trực quan (bảng Trước–Sau / thẻ AAC) đạt tối thiểu 4/5 cơ hội trong 3 buổi liên tiếp.`,
    classroomAccommodationsVi: [
      'Cung cấp bảng lịch trình bằng hình ảnh (TEACCH) đặt ngay trên bàn và báo trước 2 phút bằng đồng hồ cát/hình ảnh trước khi chuyển hoạt động.',
      'Luôn đặt sẵn bảng thẻ giao tiếp AAC mở (ARASAAC) để trẻ chủ động bày tỏ nhu cầu bằng chỉ tay, trao thẻ hoặc lời nói.',
      'Bố trí góc điều hòa giác quan yên tĩnh trong lớp; tôn trọng các vận động tự điều hòa vô hại của trẻ.',
    ],
    homeCollaborationVi: [
      'Gia đình và giáo viên dùng chung bộ từ khóa/hình ảnh AAC cho các nhu cầu hàng ngày để trẻ dễ khái quát hóa.',
      'Trao đổi nhật ký ngắn 2 chiều cuối tuần tập trung vào những khoảnh khắc trẻ hợp tác vui vẻ (không so sánh trẻ với bạn khác).',
    ],
    dataCollectionMethodVi:
      'Đo lường theo chuẩn SCED: Ghi nhận số cơ hội thành công trên 5 cơ hội tự nhiên mỗi buổi (3 buổi/tuần), kiểm tra độ đồng thuận quan sát (IOA) mỗi 2 tuần.',
    providerUsed: 'deterministic-tt03-2018-template-vi (Offline Ready)',
  };
}
