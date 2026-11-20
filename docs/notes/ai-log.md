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

## Phase 2

- Đọc Ticket-02 nhận qua chat; lập `docs/specs/phase-2.md` trước khi thay core.
- Chuẩn hóa tuning, map, tick order, timer, score; thêm dash, drop/fall, drifters,
  charms, wind và pause. Core không dùng DOM/audio và renderer không tiêu thụ RNG gameplay.
- Thêm 24 test logic mới và 1 test tích hợp replay 10 scenario CLI; tổng 37 test sau hồi quy.
- Lỗi phát hiện và sửa: kỳ vọng test pulse XZ cũ; test đếm stun thiếu bước kích hoạt.
  Không skip test; ghi rõ thay đổi vì ticket.
- Benchmark thực: ba lượt đủ 21.600 bước, xem JSON đo tự động. Chưa đo FPS.
- Token Phase 2: ước tính thủ công 20.000–35.000 token, sai số lớn; môi trường không
  cung cấp usage API hoặc hóa đơn. Không quy đổi thành tiền giả định.
- Tối ưu token/phạm vi: mô-đun terrain/core dùng chung cho3 đêm, 10 scenario nhỏ,
  WebAudio và hình học thủ tục thay tải asset; không dùng subagent/reviewer ngoài.
