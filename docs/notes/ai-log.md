# Nhật ký AI

## Ngày 20/11/2026 (ICT)

- Công cụ: OpenAI Codex; chưa có reviewer độc lập hoặc subagent.
- Lời nhắc chính: hoàn thành tất cả phase, kể cả phase đã qua.
- Đọc GUIDE, CHECKPOINTS, RULES, SUBMISSION, RUBRIC trước khi chọn kiến trúc.
- Board bị Cloudflare chặn; Browser Use không có host. Người dùng cung cấp PRD-0 / v1.0 và Ticket-02 / v1.1 qua chat. Phase 3/4 chưa phát hành.
- Phase 1: tiêu chí nghiệm thu và kế hoạch test trước code; JS core độc lập WebGL, renderer Three.js và CLI dùng chung core; `node --test`, so output CLI từng byte, build static và HTTP smoke.
- Token Phase 1: ước tính thủ công 12.000–18.000 token; không có usage API nên không phải số đo. Không có hóa đơn nên chưa xác định chi phí.
- Tiết kiệm: một core cho game/headless, test Node built-in, model/âm thanh bằng code, không framework build.
- Giới hạn: không suy ra contract từ README, đã xin nguyên văn. Chưa kiểm chứng hình ảnh, video hay review độc lập; không ghi các mục này đạt.
