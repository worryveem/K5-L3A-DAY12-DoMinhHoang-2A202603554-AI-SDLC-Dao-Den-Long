# ADR-003: Đèn có nhiên liệu và nghiệm thu tại bình minh

Trạng thái: chấp nhận theo Ticket-03. Ngày:20/11/2026 (ICT).

## Bối cảnh

Phase2 dùng `lit` và `deposited`, đèn sáng vĩnh viễn và đủ đèn thắng ngay.
Ticket03 thay cả vòng đời đèn, vùng an toàn, điểm và thời điểm xét thắng.

## Quyết định

- Mở rộng mỗi đèn với `fuelUnits` (đơn vị1/60, nguyên trong luồng gameplay; giữ phần lẻ nếu scenario cung cấp chính xác hơn), `ever_lit`, `relit_count`.
  `lit` là trạng thái hiện tại; `ever_lit` là ký ức, không reset khi cạn dầu.
  Tách rõ lần đầu10 với thắp lại5 và châm dầu10fuel/đom đóm.
- Gom hao/hút và tắt đèn vào bước2 trước pickup/interact. Snapshot chỉ làm tròn
  fuel về1 chữ số; kiểm tra ngưỡng, ceil refuel, floor thưởng dùng số nguyên gốc.
- Vùng an toàn là thuộc tính dẫn xuất `lit && fuel>=30`, dùng cùng một hàm cho
  spawn, di chuyển shade, evacuation và chạm. Không giữ một cờ safe riêng dễ lệch.
- Bổ sung drain vào FSM Bóng Mực, giữ chase của Phase2. Ghi lại trạng thái trước
  pulse để thưởng tổng15 cho drain, tổng5 cho các trạng thái khác.
- Chỉ `finish()` quyết định kết thúc sau tất cả cập nhật; no_flames ưu tiên,
  time0 mới xét ngưỡng ceil(.6*n). Không còn nhánh all_lit hoặc thưởng thời gian.
- Sức chứa dẫn xuất từ successful_lights trong Đêm; dựng scenario không tạo thành tích.

## Hệ quả / thay đổi phá vỡ tương thích

Test all_lit, score, duration và đồ họa đèn phải cập nhật có giải thích trong spec/changelog.
Headless và renderer vẫn dùng chung core; accessibility chỉ ảnh hưởng hiển thị/lưu settings.
Không thay tag hay log của Phase1/2. FPS, hình ảnh và video chỉ ghi đạt sau kiểm chứng thật.
