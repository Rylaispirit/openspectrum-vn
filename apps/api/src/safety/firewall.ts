/**
 * HỆ THỐNG TƯỜNG LỬA AN TOÀN LÂM SÀNG TẤT ĐỊNH (DETERMINISTIC CLINICAL SAFETY FIREWALL)
 *
 * Hướng tới khắc phục các lỗi P0 & P1 trong `docs/review-legacy.md` (chưa bao phủ câu gõ không dấu — xem README, mục Hạn chế đã biết):
 * 1. Chặn cứng trước LLM (Pre-LLM Hard Gate) với Cấp cứu Y tế (115), Hành vi tự gây thương tích nặng (SIB),
 *    Khủng hoảng phụ huynh / Tự sát / Bạo hành trẻ em (111, 115, 113).
 * 2. Chặn hậu kiểm sau LLM (Post-LLM Interceptor): Cấm tuyệt đối gợi ý chăn nặng/ôm ghì trong cơn meltdown,
 *    chườm đá lạnh, dập tắt hành vi trong SIB, chẩn đoán y khoa ngầm, tư vấn thuốc, hoặc ngôn ngữ bệnh lý hóa.
 */

export type CrisisCategory =
  | 'NONE'
  | 'MEDICAL_EMERGENCY'
  | 'SIB_CRISIS'
  | 'CAREGIVER_OR_ABUSE_CRISIS'
  | 'UNPROVEN_HARMFUL_INTERVENTION';

export interface SafetyCheckResult {
  blocked: boolean;
  category: CrisisCategory;
  severity: 'SAFE' | 'HIGH' | 'CRITICAL';
  matchedRule: string | null;
  hotlines: Array<{ number: string; name: string; note: string }>;
  immediateResponseVi: string | null;
  prohibitedActionsVi: string[];
}

const VN_HOTLINES = {
  EMERGENCY_115: {
    number: '115',
    name: 'Cấp cứu Y tế Toàn quốc (115)',
    note: 'Gọi ngay khi co giật, khó thở/phản vệ, chấn thương vùng đầu hoặc chảy máu.',
  },
  CHILD_PROTECTION_111: {
    number: '111',
    name: 'Tổng đài Quốc gia Bảo vệ Trẻ em (111 — Miễn phí 24/7)',
    note: 'Hỗ trợ khẩn cấp bảo vệ trẻ em, tư vấn tâm lý gia đình & can thiệp khủng hoảng.',
  },
  POLICE_113: {
    number: '113',
    name: 'Công an Khẩn cấp (113)',
    note: 'Gọi khi có nguy hiểm an ninh trực tiếp hoặc trẻ đi lạc gần ao hồ, giao thông.',
  },
};

const MEDICAL_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  {
    id: 'seizure_or_absence',
    regex:
      /(?<!\p{L})(co giật|động kinh|sùi bọt mép|tím tái|ngất xỉu|bất tỉnh|mắt trợn|mắt nhìn đờ|đờ người không phản ứng)(?!\p{L})/iu,
  },
  {
    id: 'anaphylaxis_allergy',
    regex:
      /(?<!\p{L})(sốc phản vệ|phản vệ|dị ứng.{0,30}(khó thở|sưng môi|phù nề|đậu phộng|hải sản)|nghẹt thở|hóc dị vật)(?!\p{L})/iu,
  },
  {
    id: 'head_trauma_regression',
    regex: /(?<!\p{L})(chấn thương sọ não|nôn vọt sau ngã|mất hết kỹ năng đã có đột ngột)(?!\p{L})/iu,
  },
];

const SIB_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  {
    id: 'severe_self_injury',
    regex:
      /(?<!\p{L})(đập đầu( mạnh| liên tục| vào tường| xuống sàn| chảy máu)?|tự cắn( chảy máu| rách da)?|tự đấm vào mặt|tự làm đau bản thân|lao đầu vào tường|cào rách mặt)(?!\p{L})/iu,
  },
];

const PROTECTION_AND_SUICIDE_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  {
    id: 'suicide_or_filicide_risk',
    regex:
      /(?<!\p{L})(không muốn sống|muốn chết|tự tử|tự sát|mang con đi cùng|ôm con chết|giết con|kết thúc tất cả|chịu hết nổi muốn buông xuôi)(?!\p{L})/iu,
  },
  {
    id: 'violence_or_abuse',
    regex:
      /(?<!\p{L})(muốn bóp cổ|muốn đánh chết|đánh con bầm tím|bạo hành trẻ|xâm hại( tình dục)?|nhốt con trong phòng tối|trói con)(?!\p{L})/iu,
  },
];

const HARMFUL_PSEUDOSCIENCE_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  {
    id: 'harmful_restraint_or_pseudoscience',
    regex:
      /(?<!\p{L})(quấn chặt chăn nặng khi đang gào khóc|đè sấp khống chế|thải độc kim loại nặng|chelation chữa tự kỷ|uống mms|thuốc tẩy chữa tự kỷ|oxy cao áp chữa khỏi tự kỷ)(?!\p{L})/iu,
  },
];

/**
 * Kiểm tra đầu vào của người dùng TRƯỚC khi gọi bất kỳ mô hình AI nào.
 */
export function evaluatePreLLMSafety(rawInput: string): SafetyCheckResult {
  const text = (rawInput || '').normalize('NFC').trim();
  if (!text) {
    return {
      blocked: false,
      category: 'NONE',
      severity: 'SAFE',
      matchedRule: null,
      hotlines: [],
      immediateResponseVi: null,
      prohibitedActionsVi: [],
    };
  }

  for (const rule of PROTECTION_AND_SUICIDE_PATTERNS) {
    if (rule.regex.test(text)) {
      return {
        blocked: true,
        category: 'CAREGIVER_OR_ABUSE_CRISIS',
        severity: 'CRITICAL',
        matchedRule: rule.id,
        hotlines: [VN_HOTLINES.CHILD_PROTECTION_111, VN_HOTLINES.EMERGENCY_115, VN_HOTLINES.POLICE_113],
        immediateResponseVi:
          'CẢNH BÁO AN TOÀN KHẨN CẤP: Bạn và bé đang cần sự hỗ trợ trực tiếp từ con người ngay lúc này — bạn không phải chịu đựng một mình.\n' +
          '1. Hãy đặt trẻ ở không gian an toàn (phòng thông thoáng, không có vật sắc nhọn) và bước lùi sang phòng bên cạnh để hít thở.\n' +
          '2. Gọi ngay người thân/hàng xóm sang hỗ trợ trông bé trong ít phút.\n' +
          '3. Gọi ngay Tổng đài Quốc gia Bảo vệ Trẻ em 111 (miễn phí 24/7) hoặc Cấp cứu 115 để được hỗ trợ tức thời.',
        prohibitedActionsVi: [
          'Tuyệt đối không ở một mình cùng trẻ khi đang mất kiểm soát cảm xúc.',
          'Không dùng đòn roi, trói giữ hoặc nhốt kín trẻ.',
        ],
      };
    }
  }

  for (const rule of MEDICAL_PATTERNS) {
    if (rule.regex.test(text)) {
      return {
        blocked: true,
        category: 'MEDICAL_EMERGENCY',
        severity: 'CRITICAL',
        matchedRule: rule.id,
        hotlines: [VN_HOTLINES.EMERGENCY_115],
        immediateResponseVi:
          'CẤP CỨU Y KHOA TỨC THỜI — HÃY GỌI 115 NGAY:\n' +
          '• Nếu trẻ có dấu hiệu co giật hoặc mắt nhìn đờ/tím tái: Đặt trẻ nằm nghiêng an toàn trên mặt phẳng mềm, nới lỏng cổ áo, bấm giờ cơn giật và GỌI 115.\n' +
          '• Nếu nghi ngờ phản vệ / dị ứng cấp (khó thở, sưng môi/lưỡi sau ăn): Sử dụng ngay bút tiêm Adrenaline (nếu bác sĩ đã kê đơn) và GỌI 115 ngay lập tức (thuốc kháng histamin uống KHÔNG xử trí được sốc phản vệ).',
        prohibitedActionsVi: [
          'Tuyệt đối KHÔNG nhét tay, thìa hay bất kỳ vật gì vào miệng trẻ đang co giật.',
          'KHÔNG ôm ghì chặt giữ tay chân trẻ đang giật.',
          'KHÔNG cho trẻ uống nước hay thuốc khi trẻ chưa tỉnh táo hoàn toàn.',
        ],
      };
    }
  }

  for (const rule of SIB_PATTERNS) {
    if (rule.regex.test(text)) {
      return {
        blocked: true,
        category: 'SIB_CRISIS',
        severity: 'CRITICAL',
        matchedRule: rule.id,
        hotlines: [VN_HOTLINES.EMERGENCY_115, VN_HOTLINES.CHILD_PROTECTION_111],
        immediateResponseVi:
          'ƯU TIÊN BẢO VỆ CƠ THỂ TRẺ NGAY LẬP TỨC (Hành vi tự gây thương tích - SIB):\n' +
          '1. Chèn ngay gối mềm, đệm yoga hoặc chăn gấp vào GIỮA đầu/tay trẻ và tường/sàn cứng để ngăn chấn thương.\n' +
          '2. Tắt bớt đèn sáng gắt, tắt tivi/tiếng ồn, yêu cầu những người xung quanh lùi ra xa để giảm áp lực giác quan.\n' +
          '3. Dừng mọi yêu cầu học tập, nói thật ít và chậm rãi ("Mẹ/Cô ở đây, con an toàn").\n' +
          '4. Nếu có vết thương chảy máu, sưng vùng đầu, nôn hoặc lơ mơ: GỌI 115 đưa trẻ đi khám ngay.',
        prohibitedActionsVi: [
          'NGHIÊM CẤM quấn chăn nặng (weighted blanket) hoặc đè ép lên người trẻ trong cơn kích động (nguy cơ ngạt thở tử vong).',
          'NGHIÊM CẤM phớt lờ dập tắt hành vi (extinction) khi trẻ đang tự gây thương tích.',
          'NGHIÊM CẤM chườm đá lạnh, té nước lạnh hoặc la mắng.',
        ],
      };
    }
  }

  for (const rule of HARMFUL_PSEUDOSCIENCE_PATTERNS) {
    if (rule.regex.test(text)) {
      return {
        blocked: true,
        category: 'UNPROVEN_HARMFUL_INTERVENTION',
        severity: 'HIGH',
        matchedRule: rule.id,
        hotlines: [VN_HOTLINES.CHILD_PROTECTION_111],
        immediateResponseVi:
          'CẢNH BÁO AN TOÀN KHOA HỌC: Phương pháp được đề cập (quấn chăn nặng khống chế trong cơn khủng hoảng, thải độc kim loại nặng chelation, MMS, oxy cao áp chữa tự kỷ) KHÔNG có bằng chứng hiệu quả cho tự kỷ và tiềm ẩn nguy cơ tổn thương sức khỏe hoặc tử vong nghiêm trọng cho trẻ. Vui lòng tham vấn bác sĩ Nhi khoa Phát triển - Hành vi tại các bệnh viện tuyến chuyên khoa.',
        prohibitedActionsVi: [
          'Không sử dụng chăn nặng để quấn giữ trẻ đang hoảng loạn.',
          'Không tự ý dùng hoạt chất thải độc hoặc hóa chất chưa được Bộ Y tế cấp phép chỉ định.',
        ],
      };
    }
  }

  return {
    blocked: false,
    category: 'NONE',
    severity: 'SAFE',
    matchedRule: null,
    hotlines: [],
    immediateResponseVi: null,
    prohibitedActionsVi: [],
  };
}

/**
 * Danh mục cụm từ bị cấm xuất hiện trong nội dung do AI sinh ra cho phụ huynh/giáo viên.
 */
const BANNED_OUTPUT_PATTERNS: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
  {
    pattern: /chữa khỏi( hoàn toàn)?( bệnh)? tự kỷ/gi,
    replacement: 'đồng hành phát triển kỹ năng và hỗ trợ nhu cầu của trẻ',
    reason: 'Tự kỷ là đặc điểm phát triển thần kinh, không cam kết chữa khỏi',
  },
  {
    pattern: /bệnh nhân tự kỷ/gi,
    replacement: 'trẻ có rối loạn phổ tự kỷ',
    reason: 'Tránh ngôn ngữ bệnh lý hóa',
  },
  {
    pattern: /trở lại bình thường/gi,
    replacement: 'phát triển sự tự tin và tự chủ theo nhịp độ của con',
    reason: 'Khẳng định đa dạng thần kinh',
  },
  {
    pattern: /quấn chăn nặng|đè chặt cơ thể|ôm ghì chặt|chườm đá lạnh/gi,
    replacement: '[ĐÃ LỌC BIỆN PHÁP CƠ THỂ KHÔNG AN TOÀN — thay bằng không gian yên tĩnh, an toàn]',
    reason: 'Chặn gợi ý thao tác cơ thể nguy hiểm P0',
  },
  {
    pattern: /ép( trẻ| con)? nhìn thẳng vào mắt/gi,
    replacement: 'khuyến khích chú ý chung tự nhiên qua đồ vật bé yêu thích',
    reason: 'Không ép giao tiếp mắt gây quá tải giác quan',
  },
];

export interface PostFilterResult {
  sanitizedText: string;
  interceptions: string[];
}

/**
 * Bộ lọc hậu kiểm văn bản đầu ra từ LLM (Post-Generation Neurodiversity & Clinical Safety Interceptor).
 */
export function sanitizeLLMOutputVi(rawText: string): PostFilterResult {
  let output = rawText || '';
  const interceptions: string[] = [];

  for (const rule of BANNED_OUTPUT_PATTERNS) {
    if (rule.pattern.test(output)) {
      interceptions.push(rule.reason);
      output = output.replace(rule.pattern, rule.replacement);
    }
  }

  return {
    sanitizedText: output,
    interceptions,
  };
}
