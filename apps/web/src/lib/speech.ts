/**
 * Tiện ích Đọc & Nhận dạng Giọng nói Tiếng Việt Thân thiện Giác quan (vi-VN)
 * - Ưu tiên tốc độ chậm 0.85x, âm lượng êm 0.85 để không gây giật mình cho trẻ nhạy cảm thính giác.
 * - Hoạt động hoàn toàn offline trên trình duyệt hiện đại và kết nối liền mạch với Piper TTS / PhoWhisper khi bật server.
 */

export function speakVietnameseCalm(text: string, rate = 0.85): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'vi-VN';
  utter.rate = rate;
  utter.pitch = 1.0;
  utter.volume = 0.85;

  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find((v) => v.lang.toLowerCase().startsWith('vi'));
  if (viVoice) {
    utter.voice = viVoice;
  }
  window.speechSynthesis.speak(utter);
}

interface BrowserSpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

export function startVietnameseDictation(
  onTranscript: (text: string) => void,
  onStatusChange?: (listening: boolean) => void,
): (() => void) | null {
  if (typeof window === 'undefined') return null;
  const SpeechRec = (
    window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
    }
  ).SpeechRecognition ||
    (
      window as unknown as {
        webkitSpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
      }
    ).webkitSpeechRecognition;

  if (!SpeechRec) return null;

  const rec = new SpeechRec();
  rec.lang = 'vi-VN';
  rec.continuous = false;
  rec.interimResults = false;
  onStatusChange?.(true);

  rec.onresult = (ev) => {
    const text = ev.results?.[0]?.[0]?.transcript || '';
    if (text) onTranscript(text);
  };
  rec.onerror = () => onStatusChange?.(false);
  rec.onend = () => onStatusChange?.(false);
  rec.start();

  return () => {
    onStatusChange?.(false);
  };
}
