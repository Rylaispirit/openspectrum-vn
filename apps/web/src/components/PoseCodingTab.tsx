import { useEffect, useRef, useState } from 'react';
import { Camera, Download, EyeOff, Play, Square, Timer } from 'lucide-react';
import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

interface CodedBehaviorEvent {
  id: string;
  timestampSec: number;
  behaviorLabel: string;
  durationSec: number;
  verifiedByHuman: boolean;
}

export function PoseCodingTab() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);

  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [skeletonOnlyPrivacy, setSkeletonOnlyPrivacy] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [wristKinematicsNote, setWristKinematicsNote] = useState('Chưa chạy luồng quan sát');

  // Bộ bấm giờ ghi nhận sự kiện hành vi cho nhà nghiên cứu
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [activeBoutStart, setActiveBoutStart] = useState<number | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('Chủ động giao tiếp cử chỉ / chỉ tay');
  const [events, setEvents] = useState<CodedBehaviorEvent[]>([]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSessionElapsed((t) => Number((t + 0.5).toFixed(1)));
    }, 500);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function ensurePoseLandmarker() {
    if (landmarkerRef.current) return landmarkerRef.current;
    setModelStatus('loading');
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
      );
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        },
        runningMode: 'VIDEO',
        numPoses: 2,
      });
      landmarkerRef.current = landmarker;
      setModelStatus('ready');
      return landmarker;
    } catch {
      setModelStatus('error');
      return null;
    }
  }

  async function startCamera() {
    const landmarker = await ensurePoseLandmarker();
    if (!landmarker || !videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
      setTimerRunning(true);
      renderLoop();
    } catch {
      setModelStatus('error');
    }
  }

  function stopCamera() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  function renderLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker) return;

    const ctx = canvas.getContext('2d');
    if (ctx && video.readyState >= 2) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      if (skeletonOnlyPrivacy) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const result = landmarker.detectForVideo(video, performance.now());
      const drawingUtils = new DrawingUtils(ctx);

      if (result.landmarks && result.landmarks.length > 0) {
        for (const lm of result.landmarks) {
          drawingUtils.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, {
            color: '#2dd4bf',
            lineWidth: 3,
          });
          drawingUtils.drawLandmarks(lm, {
            color: '#f59e0b',
            radius: 4,
          });

          // Đúng chuẩn MediaPipe Pose: 0 = nose, 15 = left_wrist, 16 = right_wrist (đã sửa lỗi nhầm cổ chân ở repo cũ!)
          const nose = lm[0];
          const leftWrist = lm[15];
          const rightWrist = lm[16];
          if (nose && leftWrist && rightWrist) {
            const distL = Math.hypot(leftWrist.x - nose.x, leftWrist.y - nose.y);
            const distR = Math.hypot(rightWrist.x - nose.x, rightWrist.y - nose.y);
            const minHeadDist = Math.min(distL, distR);
            setWristKinematicsNote(
              minHeadDist < 0.16
                ? 'Gợi ý chú ý: Cổ tay đang ở gần vùng đầu/tai (cần người quan sát xác nhận: bé che tai do ồn hay cử chỉ tự nhiên).'
                : `Khung xương ổn định • Khoảng cách chuẩn hóa cổ tay–đầu: ${minHeadDist.toFixed(2)}`,
            );
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(renderLoop);
  }

  function recordPointEvent() {
    setEvents((prev) => [
      {
        id: `${Date.now()}`,
        timestampSec: sessionElapsed,
        behaviorLabel: selectedLabel,
        durationSec: 0,
        verifiedByHuman: true,
      },
      ...prev,
    ]);
  }

  function toggleDurationBout() {
    if (activeBoutStart === null) {
      setActiveBoutStart(sessionElapsed);
    } else {
      const dur = Math.max(0.5, Number((sessionElapsed - activeBoutStart).toFixed(1)));
      setEvents((prev) => [
        {
          id: `${Date.now()}`,
          timestampSec: activeBoutStart,
          behaviorLabel: selectedLabel,
          durationSec: dur,
          verifiedByHuman: true,
        },
        ...prev,
      ]);
      setActiveBoutStart(null);
    }
  }

  function exportEventsCsv() {
    const lines = [
      'timestamp_sec,behavior_label,duration_sec,verified_by_human_observer',
      ...events.map((e) => `${e.timestampSec},"${e.behaviorLabel.replace(/"/g, '""')}",${e.durationSec},${e.verifiedByHuman}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'behavioral_coding_session.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Quan Sát Tư Thế Khung Xương Ẩn Danh Trên Thiết Bị (MediaPipe WebAssembly — Zero Cloud Upload)
            </h2>
            <p className="text-xs text-slate-600">
              Thay thế hoàn toàn Baidu Face, Aliyun Facebody &amp; OpenMMLab `mmcv`. Video xử lý 100% trong trình duyệt
              của bạn, không gửi hình ảnh mặt trẻ lên bất kỳ máy chủ nào và <strong>tuyệt đối không suy diễn cảm xúc</strong>.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-teal-300 px-3 py-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={skeletonOnlyPrivacy}
              onChange={(e) => setSkeletonOnlyPrivacy(e.target.checked)}
            />
            <EyeOff className="w-4 h-4" /> Chế độ Khung xương Ẩn danh (Che toàn bộ mặt &amp; phòng)
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Khung Canvas Ẩn danh */}
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800">
              <video ref={videoRef} playsInline muted className="hidden" />
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 text-xs p-6 text-center space-y-2">
                  <Camera className="w-8 h-8 text-teal-400" />
                  <p>
                    Nhấn &quot;Bật Quan sát Khung xương Cục bộ&quot; để chạy MediaPipe Pose ngay trên trình duyệt (mặc
                    định chỉ vẽ các đốt khớp ẩn danh trên nền tối).
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-medium"
                >
                  <Play className="w-4 h-4" />
                  {modelStatus === 'loading' ? 'Đang tải WASM Pose cục bộ...' : 'Bật Quan sát Khung xương Cục bộ'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium"
                >
                  <Square className="w-4 h-4" /> Dừng Camera
                </button>
              )}
              <span className="text-xs text-slate-600">{wristKinematicsNote}</span>
            </div>
          </div>

          {/* Bàn bấm giờ Mã hóa Hành vi cho Nhà nghiên cứu / Giáo viên */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
                  <Timer className="w-4 h-4 text-teal-700" /> Bàn Bấm Giờ Mã Hóa Hành Vi Thực Địa (Event &amp; Duration)
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-teal-800">{sessionElapsed.toFixed(1)}s</span>
                  <button
                    type="button"
                    onClick={() => setTimerRunning((r) => !r)}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 text-white text-xs font-medium"
                  >
                    {timerRunning ? 'Tạm dừng' : 'Chạy giờ'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Định nghĩa hành vi quan sát được (do Giáo viên / Nhà nghiên cứu xác nhận)
                </label>
                <select
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                >
                  <option>Chủ động giao tiếp cử chỉ / chỉ tay</option>
                  <option>Trao hoặc chạm thẻ giao tiếp AAC độc lập</option>
                  <option>Chú ý chung (Joint Attention) cùng chia sẻ đồ chơi</option>
                  <option>Che tai / tìm góc yên tĩnh (Tín hiệu quá tải thính giác)</option>
                  <option>Rời khu vực hoạt động trong giờ chuyển tiếp</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={recordPointEvent}
                  className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white py-2.5 px-3 text-xs font-semibold"
                >
                  + Ghi 1 Lần Xuất Hiện (Frequency)
                </button>
                <button
                  type="button"
                  onClick={toggleDurationBout}
                  className={`rounded-xl py-2.5 px-3 text-xs font-semibold text-white ${
                    activeBoutStart !== null ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {activeBoutStart !== null
                    ? `Kết thúc đo thời lượng (từ ${activeBoutStart}s)`
                    : 'Bắt đầu đo Thời lượng (Duration)'}
                </button>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pt-1">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg bg-white border border-stone-200 px-3 py-1.5 text-xs flex items-center justify-between"
                  >
                    <span>
                      <strong className="font-mono text-teal-800">[{ev.timestampSec}s]</strong> {ev.behaviorLabel}
                    </span>
                    <span className="text-slate-500">
                      {ev.durationSec > 0 ? `${ev.durationSec}s` : 'Sự kiện tức thời'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
              <span className="text-[11px] text-slate-500">Tổng số bản ghi phiên này: {events.length}</span>
              <button
                type="button"
                disabled={events.length === 0}
                onClick={exportEventsCsv}
                className="inline-flex items-center gap-1 rounded-lg bg-white border border-stone-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" /> Xuất CSV Phiên Quan Sát
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
