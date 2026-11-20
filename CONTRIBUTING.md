# Hướng Dẫn Đóng Góp Cho Cộng Đồng Mở OpenSpectrum-VN (CONTRIBUTING)

**OpenSpectrum-VN** hoan nghênh sự đóng góp liên ngành từ:
- **Bác sĩ Nhi khoa / Tâm thần Nhi, Chuyên gia Tâm lý Lâm sàng, Giáo viên Giáo dục Đặc biệt:** Hiệu đính kho chiến lược hỗ trợ dựa trên bằng chứng (EBP), mẫu KHGDCN (Thông tư 03/2018/TT-BGDĐT), bộ từ vựng AAC văn hóa Việt Nam và kịch bản kiểm thử an toàn lâm sàng (`CLINICAL_SAFETY.md`).
- **Nhà nghiên cứu Khoa học Giáo dục & Thống kê:** Mở rộng thuật toán thực nghiệm trường hợp đơn (SCED), kiểm chứng chéo kết quả với gói R `SingleCaseES` / `scdhlm`, bổ sung mẫu xuất chuẩn FAIR/BIDS.
- **Kỹ sư Phần mềm & AI Mở:** Cải tiến giao diện thân thiện giác quan (WCAG 2.2 AA), tối ưu mô hình tiếng Việt chạy offline (`PhoWhisper`, `Piper TTS`, `Ollama`), sửa lỗi và viết kiểm thử tự động.

## Quy tắc bắt buộc khi gửi Pull Request (PR)

1. **Không thêm dịch vụ độc quyền thiếu minh bạch hoặc gửi dữ liệu thô của trẻ em lên bên thứ ba** khi chưa có cơ chế tắt mặc định và đồng thuận tường minh.
2. **Không đưa vào kho tri thức bất kỳ can thiệp chưa kiểm chứng hoặc gây hại nào** (xem danh mục cấm trong `CLINICAL_SAFETY.md`).
3. **Chạy toàn bộ bộ kiểm thử trước khi gửi PR:**
   - Python Research Engine: `cd services/research-engine && uv run pytest`
   - TypeScript API & Web: `pnpm test && pnpm build`
