"""
Adapter Giọng nói Tiếng Việt Mã nguồn mở (Thay thế hoàn toàn Baidu ASR/TTS & MiniMax TTS):
- ASR: Hỗ trợ `faster-whisper` với mô hình mở `vinai/PhoWhisper-small` / `PhoWhisper-medium` chạy cục bộ.
- TTS: Hỗ trợ `piper-tts` (`vi_VN-vais1000-medium`) chạy ONNX offline tốc độ chậm thân thiện giác quan;
  khi chưa cài đặt nhị phân local, trả về cấu hình chuẩn để Web UI tự động dùng Web Speech API (`vi-VN`).
"""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

_ASR_MODEL_INSTANCE = None


def get_speech_capabilities() -> dict:
    enable_asr = os.getenv("ENABLE_LOCAL_ASR", "false").lower() == "true"
    enable_tts = os.getenv("ENABLE_LOCAL_TTS", "false").lower() == "true"
    phowhisper_model = os.getenv("PHOWHISPER_MODEL", "vinai/PhoWhisper-small")
    piper_model_path = os.getenv("PIPER_MODEL_PATH", "")

    faster_whisper_installed = False
    try:
        import faster_whisper  # noqa: F401

        faster_whisper_installed = True
    except ImportError:
        faster_whisper_installed = False

    piper_ready = bool(piper_model_path and Path(piper_model_path).exists())

    return {
        "asr": {
            "provider": "vinai/PhoWhisper (faster-whisper local)" if (enable_asr and faster_whisper_installed) else "browser-web-speech-vi-VN",
            "local_ready": enable_asr and faster_whisper_installed,
            "configured_model": phowhisper_model,
            "replaces_legacy": "Baidu Speech Pro (vop.baidu.com)",
        },
        "tts": {
            "provider": "piper-tts-onnx-vi_VN" if (enable_tts and piper_ready) else "browser-speech-synthesis-vi-VN",
            "local_ready": enable_tts and piper_ready,
            "sensory_friendly_defaults": {
                "lang": "vi-VN",
                "rate": 0.85,
                "pitch": 1.0,
                "volume": 0.85,
            },
            "replaces_legacy": "Baidu TTS (tsn.baidu.com) & MiniMax TTS",
        },
    }


def transcribe_vietnamese_audio(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    """Nhận dạng giọng nói Tiếng Việt bằng PhoWhisper local khi được bật."""
    global _ASR_MODEL_INSTANCE
    caps = get_speech_capabilities()
    if not caps["asr"]["local_ready"]:
        return {
            "ok": False,
            "fallback": "browser-web-speech-vi-VN",
            "message_vi": "Chưa bật faster-whisper/PhoWhisper trên máy chủ; giao diện sẽ dùng nhận dạng giọng nói vi-VN trực tiếp trên trình duyệt.",
        }

    from faster_whisper import WhisperModel

    if _ASR_MODEL_INSTANCE is None:
        model_name = caps["asr"]["configured_model"]
        _ASR_MODEL_INSTANCE = WhisperModel(model_name, device="cpu", compute_type="int8")

    suffix = Path(filename).suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments, info = _ASR_MODEL_INSTANCE.transcribe(tmp_path, language="vi", vad_filter=True)
        transcript = " ".join(seg.text.strip() for seg in segments).strip()
        return {
            "ok": True,
            "provider": caps["asr"]["configured_model"],
            "language": info.language,
            "text": transcript,
        }
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def synthesize_piper_vietnamese(text: str, length_scale: float = 1.18) -> bytes | None:
    """
    Tổng hợp giọng đọc Tiếng Việt êm dịu bằng Piper TTS local (length_scale=1.18 chậm vừa cho trẻ tự kỷ).
    Trả về WAV bytes nếu Piper đã cấu hình, ngược lại trả về None để client dùng Web Speech vi-VN.
    """
    caps = get_speech_capabilities()
    model_path = os.getenv("PIPER_MODEL_PATH", "")
    if not (caps["tts"]["local_ready"] and model_path):
        return None

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_wav:
        wav_path = out_wav.name

    try:
        proc = subprocess.run(
            [
                "piper",
                "--model",
                model_path,
                "--length_scale",
                str(length_scale),
                "--output_file",
                wav_path,
            ],
            input=text.encode("utf-8"),
            capture_output=True,
            timeout=20,
            check=False,
        )
        if proc.returncode != 0 or not Path(wav_path).exists():
            return None
        return Path(wav_path).read_bytes()
    except FileNotFoundError:
        return None
    finally:
        Path(wav_path).unlink(missing_ok=True)
