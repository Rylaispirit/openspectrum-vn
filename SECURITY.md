# Chính Sách Bảo Mật & Quyền Riêng Tư Dữ Liệu Trẻ Em (SECURITY)

## Nguyên tắc cốt lõi

1. **Không bao giờ lưu trữ API Key trong mã nguồn:** Mọi khóa kết nối (nếu dùng Gemini/OpenAI tùy chọn) chỉ đọc từ biến môi trường `.env` cục bộ (đã chặn trong `.gitignore`).
2. **Xử lý Thị giác Máy tính 100% Trên Thiết bị (Zero-Upload Video):** Phân hệ quan sát tư thế MediaPipe chạy hoàn toàn bằng WebAssembly/WebGPU trong trình duyệt của người dùng. Luồng camera hoặc tệp video của trẻ **không bao giờ được gửi qua mạng**.
3. **Khử định danh Tự động trước khi Xuất Nghiên cứu:** Mọi dữ liệu xuất từ phân hệ Nghiên cứu Khoa học đều đi qua `deidentify.py` (mã hóa một chiều mã trẻ, dịch chuyển ngày ngẫu nhiên bảo toàn khoảng cách phiên, lọc số điện thoại/CCCD/email/địa chỉ tiếng Việt).

## Báo cáo lỗ hổng bảo mật hoặc rủi ro an toàn lâm sàng

Nếu bạn phát hiện bất kỳ lỗ hổng bảo mật dữ liệu hoặc tình huống mà bộ lọc an toàn lâm sàng (`apps/api/src/safety/firewall.ts`) bỏ sót tín hiệu nguy hiểm, vui lòng mở báo cáo bảo mật riêng tư (Private Security Advisory trên GitHub) thay vì công khai dữ liệu nhạy cảm.
