# Quy Chuẩn An Toàn Lâm Sàng & Đạo Đức Đa Dạng Thần Kinh (CLINICAL SAFETY)

> **TUYÊN BỐ MIỄN TRỪ Y KHOA BẮT BUỘC:**
> **OpenSpectrum-VN** là nền tảng công cụ giáo dục hỗ trợ và nghiên cứu khoa học mở. Hệ thống **KHÔNG PHẢI thiết bị y tế**, **KHÔNG thực hiện sàng lọc hay chẩn đoán y khoa** (DSM-5 / ICD-11), và **KHÔNG kê đơn hoặc tư vấn thuốc/thực phẩm chức năng**. Mọi quyết định y tế phải do bác sĩ chuyên khoa Nhi / Tâm thần Nhi hoặc chuyên gia lâm sàng được cấp phép thực hiện.

> **TRẠNG THÁI:** Bản thử nghiệm nghiên cứu. Các quy tắc dưới đây mới được công cụ AI rà soát, chưa được bác sĩ hay chuyên gia pháp lý thẩm định; bộ lọc hiện chưa nhận diện câu gõ không dấu (xem README, mục *Hạn chế đã biết*).

---

## 1. Năm Nguyên Tắc Bất Khả Xâm Phạm (Hard Guardrails)

1. **Quy tắc An toàn Cứng (Deterministic Safety First — Không giao phó tính mạng cho LLM):**
   Mọi tình huống cấp cứu y khoa, hành vi tự gây thương tích nghiêm trọng (SIB), nguy cơ tự sát của người chăm sóc, hoặc dấu hiệu bạo hành/xâm hại trẻ em đều được chặn ở **tầng quy tắc tất định (`safety/firewall.ts`)** trước khi gọi bất kỳ mô hình AI nào.
2. **Nghiêm cấm tuyệt đối các biện pháp khống chế cơ thể nguy hiểm:**
   Hệ thống chặn cứng và **không bao giờ gợi ý**:
   - Quấn chăn nặng (*weighted blanket*) hoặc đè ép cơ thể khi trẻ đang kích động/meltdown (nguy cơ ngạt thở tử vong đã được ghi nhận trong y văn).
   - Khống chế nằm sấp (*prone restraint*) hoặc khóa giữ tay chân.
   - Chườm đá lạnh / dội nước lạnh lên trẻ.
   - Áp dụng "phớt lờ dập tắt hành vi" (*extinction / planned ignoring*) khi trẻ đang có hành vi tự gây thương tích (đập đầu, tự cắn) hoặc hành vi nguy hiểm.
   - Các phương pháp phản khoa học/nguy hiểm: thải độc kim loại nặng (*chelation*), oxy cao áp (*HBOT*) để "chữa tự kỷ", thuốc tẩy MMS.
3. **Không suy diễn cảm xúc từ khuôn mặt hay giọng nói:**
   Phù hợp với bằng chứng khoa học thần kinh hiện đại (Barrett et al., 2019) và chuẩn mực đạo đức AI quốc tế (EU AI Act Điều 5(1)(f)), trẻ tự kỷ có cách biểu đạt nét mặt và thanh điệu đa dạng, không đồng nhất với mẫu chuẩn thần kinh điển hình. OpenSpectrum-VN **loại bỏ hoàn toàn** các API chấm cảm xúc khuôn mặt/giọng nói; mọi công cụ thị giác máy tính (MediaPipe Pose chạy cục bộ trên trình duyệt) chỉ hỗ trợ ghi nhận tần suất/thời lượng vận động khách quan và bắt buộc có chuyên gia/giáo viên xác nhận.
4. **Tiếp cận Khẳng định Đa dạng Thần kinh (Neurodiversity-Affirming):**
   - Không coi hành vi tự điều hòa giác quan vô hại (*stimming*: vẫy tay, đung đưa nhẹ, sắp xếp đồ vật) là mục tiêu cần triệt tiêu.
   - Không ép giao tiếp mắt (*forced eye contact*) gây đau đớn hoặc quá tải giác quan.
   - Giao tiếp tăng cường và thay thế (**AAC**) được cung cấp ngay lập tức mà không đặt điều kiện tiên quyết, không cản trở sự phát triển lời nói.
   - Cấm sử dụng ngôn ngữ bệnh lý hóa hoặc gây tổn thương cho phụ huynh (*"chữa khỏi", "bất thường", "hư hỏng", "thất bại"*).
5. **Thống kê Nghiên cứu Minh bạch, Tái lập được (Zero Hallucinated Statistics):**
   Toàn bộ chỉ số nghiên cứu trường hợp đơn (**NAP, Tau-U, PEM, PAND, IRD, BC-SMD, IOA Cohen's Kappa**) phải được tính bằng thuật toán toán học kiểm chứng được trong `services/research-engine`. Mô hình ngôn ngữ chỉ được phép diễn giải kết quả đã tính toán, không bao giờ tự ước lượng con số.

---

## 2. Danh Bạ Khẩn Cấp Tại Việt Nam Được Tích Hợp Cứng

| Tình huống khẩn cấp | Đầu số Quốc gia | Hướng dẫn xử trí tức thời trước khi nhân viên y tế tới |
| :--- | :--- | :--- |
| **Cấp cứu Y khoa / Co giật / Phản vệ / Chấn thương nặng** | **115** (Cấp cứu Y tế) | Đặt trẻ nằm nghiêng an toàn nếu co giật; tuyệt đối không nhét vật cứng vào miệng, không ghì giữ cơ thể. Nếu nghi phản vệ (khó thở, phù nề sau ăn): dùng ngay bút tiêm Adrenaline (nếu bác sĩ đã kê sẵn) và gọi **115**. |
| **Bảo vệ Trẻ em / Bạo hành / Người chăm sóc kiệt sức cùng cực** | **111** (Tổng đài Quốc gia Bảo vệ Trẻ em — Miễn phí 24/7) | Đặt trẻ ở không gian an toàn (cũi/phòng trống không vật sắc nhọn), nhờ người thân/hàng xóm hỗ trợ trông trẻ ngay lập tức và gọi **111** để được hỗ trợ tâm lý - bảo vệ khẩn cấp. |
| **Nguy hiểm An ninh / Trẻ đi lạc gần sông hồ, giao thông** | **113** (Công an Khẩn cấp) | Báo ngay vị trí cuối cùng, đặc điểm trang phục, sở thích đặc biệt (nước, tàu xe, ánh đèn) và việc trẻ có thể không phản hồi khi gọi tên. |

---

## 3. Tuân Thủ Pháp Luật Việt Nam & Đạo Đức Nghiên Cứu (IRB)

- **Luật Trẻ em 2016** & **Nghị định 56/2017/NĐ-CP**: Bảo vệ bí mật đời sống riêng tư của trẻ em; hình ảnh/video của trẻ mặc định xử lý cục bộ trên thiết bị người dùng (*On-device*), không tải lên máy chủ đám mây.
- **Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân**: Dữ liệu trẻ em và sức khỏe thuộc nhóm **Dữ liệu cá nhân nhạy cảm**, áp dụng cơ chế đồng thuận phân tầng tường minh (*Tiered Informed Consent*) và quyền rút lại sự đồng ý bất cứ lúc nào (*Right to Withdraw*).
- **Thông tư 03/2018/TT-BGDĐT** của Bộ Giáo dục và Đào tạo: Khung Kế hoạch Giáo dục Cá nhân (KHGDCN / IEP) bám sát quy định giáo dục hòa nhập đối với người khuyết tật tại Việt Nam.
