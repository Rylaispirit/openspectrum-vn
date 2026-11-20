# Rà soát y khoa repo cũ `starbridge-emotion-mirror`

Repo cũ (riêng tư, không công khai): `starbridge-emotion-mirror`. Chỉ dùng để tham khảo, không sửa.
Phạm vi đã rà: khoảng 270 file `references/` và `references/modules/`, `SKILL.md`, PRD, `hf_multimodal_analysis/`, `pose_analysis/`, khoảng 20 Edge Function trong `supabase/functions/`.
Người rà: 8 agent AI. Chưa có chuyên gia lâm sàng hay pháp lý duyệt.

Kết luận: không chép thẳng tài liệu hay code sang dự án mới. Giữ khung tư duy (FBA, không chẩn đoán, neurodiversity). Viết lại từ đầu luồng an toàn và lớp phân tích camera/giọng nói.

## 1. Bảo mật (xử lý ngay)

- Các Edge Function (`meltdown-risk`, ...) không có xác thực nhưng ghi DB bằng service role.
- `face-detect` gửi ảnh gốc của trẻ sang bên thứ ba và lấy cả `age`, `gender`, `beauty`.

## 2. P0: nguy hiểm trực tiếp

### Thao tác cơ thể khi trẻ khủng hoảng
- Quấn chăn nặng hoặc ôm ép trong lúc meltdown:
  - `emotion-crisis-sop.md:33-36`
  - `output-actionability-sop.md:42`
  - `sleep-support.md:67,113`
  - `sensory-diet-tracker.md:71`
  - `full-skill-archive-v91.md:2354`
  - `modules/emotion-perception-system-full.md:223,227`
  - `aba-learning-environment-emotion-aac.md:170`, `aba-multisensory-prt-scerts-framework.md:384`, `aba-frustration-emotion-training.md:89`, `aba-local-persistence.md:252`
  - Ca tử vong đã xác minh: Quebec 2008, bé tự kỷ 9 tuổi bị quấn từ đầu đến chân trong chăn khoảng 18 kg, nằm sấp gần 20 phút (The Star, 20/6/2008). RCT Gringras 2014 (Pediatrics) không thấy chăn nặng cải thiện giấc ngủ ở trẻ ASD.
- Dập tắt (extinction) ngay trong cơn SIB hoặc meltdown: `full-skill-archive-v91.md:2347`.
- AI tự sinh quy trình khống chế (`restraint_procedures`): `aba-hitl-review-node.md:571-631`, `modules/aba-micro-intervention-full.md:21`, `special-needs-assessment-framework.md:371`.
- Ôm chặt trẻ sau chấn thương sọ não khi trẻ "đờ người, sợ hãi", trong khi đây có thể là cơn động kinh: `special-populations.md:16`.
- Chườm đá hoặc nước lạnh (DBT TIPP) cho trẻ: `aba-regulation-coach-fullimpl.md:393,449-452`, `modules/aba-micro-intervention-full.md:19`.

### Phân luồng nguy cơ sai
- Đập đầu, cắn bị xếp vào luồng chờ 5–15 phút hoặc vào "sensory diet": `emotion-crisis-sop.md:8,70,84`, `SKILL.md:140`, `special-needs-behavior-rules.md:33`, `full-skill-archive-v91.md:853`.
- Câu "không muốn sống" bị đưa vào luồng sơ cứu cảm xúc thay vì chặn khủng hoảng: `dialogue-prompt-framework.md:555`.
- Tự sát chỉ được gắn nhãn REVIEW, câu trả lời vẫn được xuất: `pbs-quality-control-engine.md:113-126`.
- Cảnh báo tự hại bị giữ 2 giờ chờ duyệt: `safety-quality-control-and-benchmarks.md:32-34`.
- SIB đang diễn ra bị đưa vào hàng chờ BCBA khoảng 1 giờ: `aba-hitl-review-node.md:16,61,182`.
- Quy trình khủng hoảng chỉ lắng nghe thụ động, không hỏi về an toàn tức thời: `safety-guardrails.md:51-59`. File router còn hoãn việc cất vật nguy hiểm đến khi người dùng "ổn định": `router-degrade-guide.md:119`.
- "Mắt nhìn đờ → liên hệ bác sĩ trong 24 giờ", trong khi đây có thể là co giật: `safety-guardrails.md:44-45`.
- Bộ lọc NAPs chặn cứng mọi mục tiêu "tự kích thích", nên chặn luôn hỗ trợ cho SIB: `naps-checklist.md:32`.

### Không có nhánh bảo vệ trẻ hoặc phụ huynh
- Tín hiệu phụ huynh định giết con rồi tự sát ("mang con đi cùng") bị xem nhẹ, và câu trả lời còn bị hardcode: `demo-cases.md:297,461`.
- "Muốn bóp cổ nó" hay "muốn đánh nó" chỉ được đáp bằng hotline tâm lý: `full-skill-archive-v91.md:1108-1118`, `interaction-temperature-system.md:56`.
- Phụ huynh nói "tôi chịu hết nổi" thì hệ thống chỉ hướng dẫn thở rồi "để lần sau nói", không hỏi về ý nghĩ tự hại: `modules/parent-psychological-support.md:15-27`.
- Không có quy trình xử lý khi trẻ tiết lộ bị bạo hành hoặc xâm hại (cả nhóm `safety-*`, `safety-ethics-boundaries.md:37`).

### Sai thông tin y khoa
- Dị ứng đậu phộng → "uống kháng histamin". Với phản vệ, phải dùng adrenaline: `school-communication-letter.md:101`.
- "Thụt lùi là hoàn toàn bình thường", trong khi mất kỹ năng đã có là dấu hiệu đỏ: `progress-tracking.md:58`.
- Ngưỡng tiền triệu "thở >20 lần/phút" nằm trong mức bình thường của trẻ: `positive-reinforcement-and-precursor.md:43-57`.

### Code đang chạy
- `meltdown-risk/index.ts:9-13,48,61`: trọng số tự đặt và được chuẩn hoá lại theo số kênh có dữ liệu, nên chỉ một kênh ≥0.8 là ra `HIGH_RISK`.
- `demo-cases`/API test: kết quả "✅ head_banging" là bịa (`2.1-api-detailed-testing.md:138`, mâu thuẫn với `2-api-testing-guide.md:3194`).

## 3. P1: sai chuyên môn có hệ thống

- Suy cảm xúc từ mặt, giọng, nhịp tim ra "ý muốn xã hội", "trầm cảm", "masking", chức năng hành vi, stress phụ huynh. Trái Barrett et al. 2019 (PSPI 20:1). EU AI Act Điều 5(1)(f) cấm nhận diện cảm xúc trong cơ sở giáo dục từ 2/2/2025, chỉ trừ lý do y tế/an toàn, và không có ngoại lệ theo đồng ý. Các file: `emotion-mirror-analysis.md`, `aba-node2/3/4`, `aba-regulation-coach-fullimpl.md`, `asd-mbais-v2-technical-spec.md`, `multimodal-behavior-analysis-system.md`, `special-needs-emotion-analysis*.md`, `modules/emotion-perception-system-full.md`.
- Model chưa kiểm chứng:
  - Model SER `ehcalabres/wav2vec2-random-sampling-4-emotions` không truy cập công khai được (HTTP 401).
  - Model FER `dima806/...` và text `twitter-roberta`, BART-MNLI đều tiếng Anh, người lớn.
  - Ngưỡng hét F0 500 Hz báo nhầm với giọng trẻ.
  - Ngưỡng nhịp tim 120 bpm coi trẻ bình thường là "stress".
- Bug khiến chỉ số vô nghĩa:
  - `pose_analysis/NEXT_STEPS.md:80-82` dùng keypoint 16/17 (cổ chân) làm cổ tay; cổ tay đúng là 9/10. Đầu ngón trỏ đúng là 99, không phải 91.
  - ID người không được tracking giữa các frame.
- Đi ngược neurodiversity:
  - Stimming, né mắt, nhại lời bị cộng vào nguy cơ (`multimodal-fusion:130,140`).
  - "Nhìn mắt nhiều hơn, ít rập khuôn hơn" bị tính là tiến bộ (`baseline-tracking:14-20`).
- Chẩn đoán ngầm:
  - Tự gán nhãn ASD/ADHD/câm chọn lọc/ODD từ từ khóa (`per-disability-dialogue-adaptation.md:337-344`, `full-skill-archive-v91.md:850-858`).
  - Map đầu ra camera sang ADOS-2/SRS-2.
  - Sàng lọc cong vẹo cột sống từ pose 2D.
  - Giới thiệu repo nhận diện tự kỷ qua ảnh khuôn mặt (`open-source-special-education-resources.md:11-17`).
- Công cụ đánh giá ghi sai (`assessment-tools-standardized.md`, `2.2-full-text.md`): M-CHAT-R/F, ADOS-2 CSS, CARS2-HF, VB-MAPP, ABLLS-R, Vineland-3, tiêu chí IDD/SLD. File không nói rằng chỉ người có chứng chỉ mới được thực hiện.
- Thống kê sai:
  - ESSA tiers bị đảo.
  - PAND bị định nghĩa nhầm thành PND; mẫu số BC-SMD sai; Tau-U tự chế.
  - Khoảng dự đoán dùng z thay vì t; DerSimonian-Laird đã lỗi thời.
  - Dùng Cohen's d cho SCED.
  - LLM bị buộc điền Tau-U/NAP/PEM khi không có dữ liệu (`llm-report-engine`).
  - Dữ liệu ví dụ vô lý (PND > NAP).
- LLM đóng vai "BCBA có chứng chỉ". Có nhận dạng khuôn mặt trẻ, chấm beauty, đoán giới tính, tạo deepfake trẻ cho video self-modeling.
- Can thiệp thiếu bằng chứng được gọi là EBP: sensory diet, Wilbarger, phong cách học VAK, Orton-Gillingham.

## 4. Trích dẫn sai đã xác minh

- Golan 2010 là nghiên cứu về phim The Transporters, không phải ảnh mặt chính trẻ.
- Schreibman & Stahmer 2014 so sánh PRT với PECS, đăng ở JADD 44(5):1244–1251, không phải so với ESDM.
- Strand: đúng là năm 2020, AJSLP 29(1).
- F84.0/F90.0 là mã ICD-10. Mã ICD-11 là 6A02 (ASD) và 6A05 (ADHD).
- MMASD: license thật là CC BY-NC-SA 4.0, phi thương mại. File có các chi tiết bịa (κ>0.7, camera HD, hệ nhãn); bài gốc có 11 lớp hoạt động.
- Nghiên cứu Mayo smartwatch: làm trên trẻ rối loạn hành vi đang điều trị PCIT, không phải ASD; đo nhịp tim và vận động, không đo EDA.

Còn khoảng 30 trích dẫn đáng ngờ chưa xác minh. Dự án mới không chép các trích dẫn này.

## 5. Nội dung tốt (giữ ý, viết lại)

- FBA/ABC, 4 chức năng hành vi, loại trừ nguyên nhân y khoa trước.
- Guardrail L1–L4 (`2.2-g-taste-guide.md:768-802`): cấm chẩn đoán, cấm tư vấn thuốc.
- Không can thiệp stimming vô hại, không ép nhìn mắt, không ép nói ở trẻ câm chọn lọc.
- AAC không cản trở tập nói, không đặt điều kiện tiên quyết.
- TEACCH, thứ bậc nhắc, tỷ lệ câu Social Story ≥2:1 theo Carol Gray.
- Chelation và HBOT xếp vào nhóm chưa chứng minh.
- `video-robustness`: video bị che quá 3 giây thì đánh dấu thiếu dữ liệu.
- Giấc ngủ: loại trừ OSA, trào ngược, thiếu sắt trước. Không gợi ý melatonin.
- Quy trình meltdown 4 giai đoạn (`aba-clinical-dialogue-exemplars.md:943-963`), cần thêm tiêu chí cấp cứu.

## 6. Giữ, viết mới, bỏ

| Giữ ý tưởng | Viết mới từ đầu | Bỏ hẳn |
|---|---|---|
| FBA/ABC, guardrail L1–L4 | Luồng an toàn: SIB, tự sát, bạo hành, khủng hoảng phụ huynh, cấp cứu y khoa; hotline VN | Suy luận cảm xúc từ mặt, giọng, sinh lý |
| Neurodiversity, AAC, câm chọn lọc | Ghi hành vi bằng pose (MediaPipe on-device) có tracking, gắn nhãn "chưa kiểm chứng" | Chăn nặng, ôm ép, khống chế, nước lạnh, extinction trong khủng hoảng |
| Ý tưởng `video-robustness` | Hồ sơ tiền triệu do giáo viên/phụ huynh khai báo; giáo viên xác nhận | Nhận dạng mặt, đoán tuổi/giới tính, deepfake |
| Social Story, TEACCH, thứ bậc nhắc | SCED tính bằng code (NAP, Tau-U, BC-SMD qua scdhlm); LLM chỉ diễn giải | Tiêu chí chẩn đoán và công cụ đánh giá trong KB |
| | Privacy-by-design, consent, kill switch, xác thực mọi endpoint | Dữ liệu MMASD cho mục đích thương mại |

## 7. Độ phủ và việc còn mở

- Đọc lướt: `full-skill-archive-v91.md` (5.207 dòng, đọc khoảng 300), `2-api-testing-guide.md`, `knowledge-base.md`, `researcher-toolkit-professional.md`. Phần giữa của 6 Edge Function bị cắt.
- Chưa đọc: `research-ethics-compliance`, `robustness-and-edge-cases`, `research-walkthrough-*`, `resource-catalog`, `school-transition-plan`, `slim-down-guide`, `special-ed-debugging-guide`.
- Luật Việt Nam cần chuyên gia pháp lý xác minh hiệu lực: Luật Trẻ em 2016, Luật Người khuyết tật 2010, Luật Giáo dục 2019, Thông tư 03/2018/TT-BGDĐT, Nghị định 13/2023, Luật Bảo vệ dữ liệu cá nhân.
- Hotline VN: 111 (bảo vệ trẻ em, 24/7), 113 (công an), 115 (cấp cứu). Đường dây sức khỏe tâm thần VN phải xác minh trước khi đưa vào sản phẩm.
