# OpenSpectrum-VN

**An open-source platform for neurodiversity-affirming autism support and single-case experimental design (SCED) research in Vietnam.**
*Nền tảng mã nguồn mở hỗ trợ trẻ tự kỷ theo hướng khẳng định đa dạng thần kinh và nghiên cứu thực nghiệm trường hợp đơn tại Việt Nam.*

[![License: AGPL v3](https://img.shields.io/badge/Code_License-AGPL_3.0-0f766e.svg)](./LICENSE)
[![Content: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content_%26_AAC-CC_BY--NC--SA_4.0-d97706.svg)](./LICENSE-CONTENT.md)
[![Open Stack](https://img.shields.io/badge/Stack-100%25_Open_Source-0284c7.svg)](#ma-trận-thay-thế-hoàn-toàn-các-dịch-vụ-đóng-trung-quốc)
[![Status: Research Prototype](https://img.shields.io/badge/Status-Research_Prototype-b91c1c.svg)](#hạn-chế-đã-biết-known-limitations)

> [!WARNING]
> **Research prototype — not a medical device and not validated for clinical use.**
> The clinical rules and legal mappings in this repository have so far been reviewed by AI tools only, not by licensed clinicians or legal experts. The crisis-detection rules still miss many phrasings, including Vietnamese typed without diacritics. Do not deploy with real children's data until the [known limitations](#hạn-chế-đã-biết-known-limitations) are addressed.
>
> **Bản thử nghiệm nghiên cứu — không phải thiết bị y tế, chưa được thẩm định để dùng với trẻ thật.** Quy tắc lâm sàng và đối chiếu pháp lý mới được công cụ AI rà soát, chưa có bác sĩ hay chuyên gia pháp lý duyệt. Bộ chặn khủng hoảng còn bỏ sót nhiều cách nói, kể cả câu gõ không dấu. Không triển khai với dữ liệu trẻ thật khi chưa khắc phục các [hạn chế đã biết](#hạn-chế-đã-biết-known-limitations).

## Abstract

OpenSpectrum-VN is a clean-room, open-source monorepo serving three connected groups in Vietnam: **families** (a Vietnamese AAC board built on ARASAAC pictograms, visual First–Then schedules, A-B-C functional behaviour logs, Carol Gray–style social stories), **inclusive-education teachers** (draft Individualised Education Plans aligned with Circular 03/2018/TT-BGDĐT), and **researchers** (deterministic SCED effect sizes — NAP, Tau-U with baseline-trend correction, PEM, PND, PAND, IRD, BC-SMD — inter-observer agreement with Cohen's κ, on-device MediaPipe pose coding, and FAIR de-identified data export with a reproducible R script). Core design principles: deterministic safety rules run before any language model; no facial or vocal emotion inference; neurodiversity-affirming language; and every statistic is computed by code, never estimated by a language model.

## Giới thiệu

**OpenSpectrum-VN** là dự án mã nguồn mở xây dựng mới từ đầu (*clean-room*) phục vụ ba nhóm người dùng liên kết chặt chẽ tại Việt Nam:
1. **Phụ huynh & Gia đình:** Bảng giao tiếp hình ảnh AAC Tiếng Việt mở (ARASAAC), bảng trực quan Trước–Sau (TEACCH), nhật ký hành vi chức năng A-B-C, câu chuyện xã hội Carol Gray và hướng dẫn sơ cứu khủng hoảng an toàn.
2. **Giáo viên Hòa nhập & Chuyên gia Can thiệp:** Hỗ trợ lập dự thảo Kế hoạch Giáo dục Cá nhân (**KHGDCN / IEP theo Thông tư 03/2018/TT-BGDĐT**), đo lường tiến bộ và phối hợp gia đình – nhà trường.
3. **Nhà Nghiên cứu Khoa học (Các trường ĐH Sư phạm, Tâm lý, Bệnh viện Nhi):** Thiết kế và phân tích thực nghiệm trường hợp đơn (**SCED** chuẩn WWC v5.0: **NAP, Tau-U có khử xu hướng cơ sở, PEM, PAND, IRD, BC-SMD**), kiểm định độ đồng thuận liên quan sát viên (**IOA & Cohen's Kappa**), quan sát tư thế khung xương ẩn danh cục bộ trên trình duyệt (**MediaPipe WASM**) và xuất bộ dữ liệu mở chuẩn **FAIR**, thiết kế hướng tới **Nghị định 13/2023/NĐ-CP** (chưa được thẩm định pháp lý).

---

## Kiến Trúc Monorepo

```text
openspectrum-vn/
├── apps/
│   ├── web/                  # Giao diện React 18 + Vite + Tailwind (Thân thiện giác quan, MediaPipe On-Device)
│   └── api/                  # Cổng API TypeScript (Hono + Tường lửa An toàn Lâm sàng + Adapter AI Mở + PostgreSQL)
├── services/
│   └── research-engine/      # Engine Khoa học Mở Python (FastAPI + SciPy SCED Stats + IOA + FAIR De-identification + PhoWhisper/Piper)
├── docs/
│   └── review-legacy.md      # Báo cáo rà soát y khoa & bảo mật từ repo tham khảo cũ
├── docker-compose.yml        # Khởi chạy toàn bộ hệ thống (PostgreSQL 16 pgvector + Research Engine + API + Web) bằng 1 lệnh
├── CLINICAL_SAFETY.md        # Quy chuẩn An toàn Lâm sàng & Danh mục Cấm Tuyệt đối (P0/P1)
├── SECURITY.md               # Chính sách Bảo mật & Xử lý Video 100% Cục bộ (Zero-Upload)
├── LICENSE                   # Toàn văn AGPL-3.0 (giấy phép mã nguồn)
├── LICENSE-CONTENT.md        # CC BY-NC-SA 4.0 cho học liệu + ghi công biểu tượng ARASAAC
└── CITATION.cff              # Thông tin trích dẫn học thuật
```

---

## Ma Trận Thay Thế Hoàn Toàn Các Dịch Vụ Đóng Trung Quốc

| Thành phần cũ (Bản tiếng Trung) | Giải pháp Mở trong OpenSpectrum-VN |
| :--- | :--- |
| `appmiaoda.com` & `miaoda-react-devkit` | **PostgreSQL 16 + `pgvector` + Hono TypeScript API + React/Vite chuẩn mở** |
| `Baidu Face V3` & `Aliyun Facebody` (chấm cảm xúc mặt trẻ trên cloud) | **Loại bỏ hoàn toàn chấm cảm xúc khuôn mặt** (tuân thủ khoa học thần kinh Barrett 2019 & EU AI Act) |
| `OpenMMLab` (`openmim` / `mmcv` / `mmpose`) | **`@mediapipe/tasks-vision` (WebAssembly/WebGPU)** chạy 100% trên trình duyệt với chế độ Khung xương Ẩn danh |
| `Baidu Speech Pro` (ASR tiếng Trung) | **`vinai/PhoWhisper`** (`faster-whisper` local) + Web Speech Recognition `vi-VN` |
| `Baidu TTS` & `MiniMax TTS` | **`Piper TTS` (`vi_VN` ONNX offline)** + Web Speech Synthesis `vi-VN` tốc độ êm dịu `0.85x` |
| `MiniMax-M2.5` / `DeepSeek` qua gateway đóng | **Adapter AI Mở (`Ollama` local mặc định với `gemma3:4b`)** + hỗ trợ cắm `Google Gemini` / `OpenAI` qua `.env` + **Mẫu lâm sàng tất định chạy Offline 100%** |
| `Agnes Image API` | **Kho biểu tượng AAC mở quốc tế `ARASAAC` (CC BY-NC-SA 4.0)** Việt hóa theo mã màu Fitzgerald |

---

## Hướng Dẫn Chạy Nhanh (Quickstart)

### Cách 1: Chạy toàn bộ bằng 1 lệnh Docker Compose (Khuyên dùng cho Trung tâm / Phòng Lab)

```bash
cp .env.example .env
docker compose up --build
```
- Giao diện Web: `http://localhost:5173`
- Cổng API: `http://localhost:4000/api/health`
- Tài liệu Swagger của Python Research Engine: `http://localhost:8000/docs`

### Cách 2: Chạy trực tiếp trên máy phát triển (Không cần bật Docker)

Hệ thống tích hợp cơ chế tự động chuyển đổi thông minh sang kho dữ liệu cục bộ và mẫu lâm sàng offline khi chưa bật PostgreSQL hay Ollama:

```bash
# 1. Cài đặt gói phụ thuộc Node/TypeScript
pnpm install

# 2. (Tùy chọn khuyến nghị) Chạy Python Research Engine ở cửa sổ terminal 1
cd services/research-engine
uv run uvicorn app.main:app --port 8000 --reload

# 3. Chạy API (cổng 4000) và Giao diện Web (cổng 5173)
pnpm dev:api
pnpm dev:web
```

### Chạy Bộ Kiểm Thử Khoa Học & An Toàn Lâm Sàng

```bash
# Kiểm thử toán học SCED (NAP, Tau-U, PAND, BC-SMD, IOA Kappa) & Khử định danh Tiếng Việt
cd services/research-engine && uv run --extra dev pytest -v

# Kiểm thử Tường lửa An toàn Y khoa (115 / 111), Tỷ lệ Carol Gray >= 2:1 & Build toàn bộ Monorepo
pnpm test
pnpm build
```

---

## Hạn chế đã biết (Known limitations)

Dự án đang ở giai đoạn thử nghiệm nghiên cứu. Các điểm dưới đây chưa được khắc phục:

1. **Bộ chặn khủng hoảng** (`apps/api/src/safety/firewall.ts`) chỉ nhận đúng các cụm từ có dấu đã liệt kê; câu gõ không dấu và nhiều cách diễn đạt khác (ví dụ: ngừng thở, nuốt dị vật, cắn tay chảy máu) chưa được nhận diện.
2. **PostgreSQL chưa được nối vào luồng dữ liệu:** API chỉ kiểm tra kết nối, mọi bản ghi vẫn lưu trong `apps/api/data/local-db.json`.
3. **Chưa có xác thực người dùng:** mọi endpoint (kể cả cập nhật đồng thuận nghiên cứu) đang mở.
4. **Bản xuất FAIR dự phòng** (khi Research Engine Python không chạy) chưa lọc thông tin cá nhân trong ghi chú và chưa dịch ngày.
5. **BC-SMD** đang dùng công thức xấp xỉ, chưa được đối chiếu với gói R `scdhlm`; khoảng tin cậy NAP giữa bản Python và bản dự phòng TypeScript chưa thống nhất.
6. Quy tắc lâm sàng và đối chiếu pháp lý Việt Nam **chưa được chuyên gia lâm sàng hay pháp lý thẩm định** (xem `docs/review-legacy.md`).

Đóng góp khắc phục các mục trên rất được hoan nghênh — xem [CONTRIBUTING.md](./CONTRIBUTING.md).

## Trích dẫn (How to cite)

Nếu dùng phần mềm này trong nghiên cứu, vui lòng trích dẫn theo [`CITATION.cff`](./CITATION.cff) (GitHub hiển thị nút **"Cite this repository"**).

## Giấy phép (License)

- **Mã nguồn:** [GNU AGPL-3.0-or-later](./LICENSE).
- **Học liệu, tài liệu lâm sàng & biểu tượng AAC:** CC BY-NC-SA 4.0 — chi tiết và ghi công ARASAAC trong [`LICENSE-CONTENT.md`](./LICENSE-CONTENT.md).

Pictograms author: Sergio Palao. Origin: ARASAAC (https://arasaac.org). License: CC BY-NC-SA. Owner: Government of Aragón (Spain).
