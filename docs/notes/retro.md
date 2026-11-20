# Retro hiện tại (Phase 1–2)

- Hiệu quả: chốt Test Contract trước kiến trúc; một core thuần dùng cho renderer và CLI;
  scenario nhỏ theo từng tính năng giúp kiểm tra ranh giới/timer nhanh.
- Đã phát hiện: test pulse cũ dùng XZ, ticket mới đổi 3D. Test thất bại sau tích hợp,
  đổi tâm mục tiêu theo luật mới và ghi lý do trong spec, không skip.
- Một test stun đã đếm thiếu tick kích hoạt. Đối chiếu timer ở snapshot, sửa kỳ vọng
  để trạng thái tồn tại đúng 120 tick và thoát ở bước tiếp theo.
- Harness bổ sung: CI ba hệ điều hành, pre-commit `npm test`, verify lưu log thật,
  replay 10 scenario so byte, benchmark tách riêng khỏi FPS.
- Chưa có review độc lập; không ghi tự review là review của người khác.
- Giới hạn: Browser Use không kết nối nên chưa quan sát gameplay, nghe âm thanh,
  đo FPS 1280×720 hoặc quay video. Cần thực hiện trước khi kết luận DoD đầy đủ.
- Nếu làm lại: xin toàn bộ tab đã phát hành ngay đầu, xác nhận spawn Đêm 3 với Coach,
  kiểm tra trình duyệt/khả năng quay video trước khi dành thời gian renderer.
- Chỉ số xác thực nằm ở `docs/proof/phase-2/`; token trong ai-log là ước tính,
  không phải usage hệ thống. Không có số chi phí chính xác.
