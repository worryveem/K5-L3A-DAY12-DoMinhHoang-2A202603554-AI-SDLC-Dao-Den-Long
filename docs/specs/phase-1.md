# Phase 1 — PRD-0 / Test Contract v1.0

Nguồn: người dùng cung cấp nguyên văn lab board trong phiên làm việc ngày 20/11/2026 (ICT).
Board: https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW

## Yêu cầu nghiệm thu

- Đêm 1, đảo tròn, Mây đội nón lá treo đèn, camera 3D, đi và nhảy.
- Nhặt đom đóm, nạp ánh sáng thắp đủ 5 đèn, Bóng Mực đuổi/gây sát thương.
- Tỏa sáng tiêu hao đom đóm, đẩy và làm choáng Bóng Mực; đèn sáng là vùng an toàn.
- HUD máu, ánh sáng, đèn, thời gian, điểm; thắng/thua và chơi lại.
- `game.contract.json` khai báo đúng tuning; chạy được trên macOS/Linux bằng Node và trình duyệt.
- CLI `--seed --night --scenario --inputs --ticks --out --snapshot-every`.
- 60 Hz; snapshot 0 trước input; input k tạo trạng thái và event k+1; dừng khi kết thúc.
- Input cập nhật từng trường, nút kích hoạt theo cạnh false→true; camera biến đổi đúng công thức contract.
- Scenario cập nhật đèn theo ID; danh sách thay thế; dựng không cộng điểm/phát event.
- JSONL snapshot/event/end, XZ inclusive, tọa độ 3 số lẻ, output tất định.
- Input/scenario sai trả mã 2, lỗi khác khác 0 và stderr.

## Giả định được chọn trước khi code

- Tuning cụ thể là `game.contract.json`; đảo bán kính 38 m, biên chặn thay vì phạt rơi.
- L1…L5 nằm trên vòng tròn bán kính 26 m; tương tác đèn chưa sáng gần nhất.
- Nạp một lần tối đa số còn thiếu của một đèn, giữ lại số dư.
- Mất máu rơi `floor(carried * hit_drop_ratio)` đom đóm; miễn thương theo tuning.
- Đom đóm đánh rơi chỉ nhặt lại sau 1 giây để tránh nhặt lại ngay trong cùng bước.
- Tỏa sáng chỉ kích hoạt nếu đủ đom đóm và hết hồi chiêu; điểm stun tính mỗi Bóng Mực bị tác động.
- Nhảy có trọng lực; khoảng cách tương tác vẫn tính XZ theo contract.
- Điểm: nhặt +10, thắp đèn +100, stun +15; thắng cộng `floor(time_left_s)*2 + flames*50`.
- Hết máu ưu tiên thua, đủ đèn thắng, hết giờ thua bình minh; thời gian vẫn giảm ở bước kết thúc.
- Khi các đèn được đặt sáng sẵn, game chỉ đánh giá kết thúc ở bước gameplay đầu tiên.

## Kế hoạch kiểm chứng (trước triển khai)

Unit/scenario: tick 0 và N; input giữ trạng thái/cạnh; camera 90° và chuẩn hóa chéo;
nhặt đúng biên và sức chứa; nạp từng phần; scenario không phát điểm; pulse chi phí,
bán kính, hồi chiêu, stun/push; sát thương/miễn thương/drop; safe zone; thắng/thua;
JSONL cuối file; invalid input mã 2; chạy hai lần so từng byte; build và HTTP smoke.

Kiểm chứng giao diện cần trình duyệt hoạt động; hiện chưa có kết nối Browser Use.
Không ghi đạt kiểm tra hình ảnh/video trước khi thực sự quan sát hoặc quay được.
