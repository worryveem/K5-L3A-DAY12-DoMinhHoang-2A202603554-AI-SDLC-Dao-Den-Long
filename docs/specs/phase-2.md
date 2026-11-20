# Phase 2 — Ticket-02 «Ba hòn đảo» / v1.1

Nguồn: nguyên văn Ticket-02 do người dùng cung cấp ngày 20/11/2026 (ICT).
Phase 3 và 4 chưa phát hành. Đây là kế hoạch trước triển khai Phase 2.

## Thay đổi bắt buộc

- Chuẩn hóa toàn bộ tuning; điểm chuyển từ nhặt sang nạp đèn. Sức chứa 10,
  pickup XZ 1 m / cao 1.5 m; tương tác 2 m; safe 6 m; pulse 3/5 m/3 s;
  stun 120 tick, push 4 m/15 tick; shade 4/4.5 m/s; hit drop floor(n/2).
- Thực thi đúng thứ tự tick; pause tăng tick nhưng đóng băng sim_tick và timer.
- Đêm 1 bán kính 40, tọa độ 5 đèn chuẩn; Đêm 2 hai đảo/cầu/bục, 6 đèn;
  Đêm 3 các tầng/dốc/bục/tháp/gió, 7 đèn; spawn theo các điểm/tick quy định.
- Dash 14 m/s trong 12 tick, hồi 90 tick từ lúc bắt đầu, giữ Y khi trên không;
  chạy 6 m/s, nhảy 7 m/s, trọng lực -20; hướng quay mặt mặc định +Z.
- Rơi Y < -10: xử lý một lần, bỏ bất tử, mất toàn bộ carry; chờ 60 tick;
  hồi sinh vận tốc 0, bất tử 90 tick; không hồi nếu hết lửa.
- Safe-zone mới thắp đẩy shade đang ở trong ra mép trong 30 tick, không gây hit.
- Hysteresis shade detect/release 12/18 m; recoil sau hit 2 m/60 tick.

## Acceptance và kiểm chứng tính năng mới

| Tính năng | Tiêu chí | Scenario/test dự kiến |
|---|---|---|
| Dash | 12 tick/2.8 m; hướng đang đi hoặc facing; không bất tử; giữ Y trên không | dash hướng/fall/cooldown |
| Ba bản đồ | đèn/spawn/đất/biên đúng tọa độ | map geometry, bridge, ramp, pad |
| Bục | giữ vận tốc phóng tới chạm đất; dash vẫn có tác dụng | pad2, pad3 |
| Spawn | 20 đom đóm khác điểm, +1/240 tick; shade 2 ở 300 và lịch kế; drifter 1200n | spawn schedule |
| Gió Lạc | idle→chase khi ≥5 trong15; cướp ≤3 trước hit; flee240; pulse trả đồ | drifter steal/drop |
| Bùa | buff600 tick, chạy7.2; dash không hồi; respawn2700 | charm expiry/respawn |
| Gió Đêm3 | cảnh báo2 s, cơn5 s/30 s; đẩy2 m/s hướng có seed | wind timeline |
| Chuỗi Đêm | menu→giới thiệu→chơi→kết quả→Đêm sau; thua replay; Bình Minh tổng điểm | UI cần browser |
| Pause | không timer/spawn/TTL khi pause; input edge đúng | pause frames |
| Settings | âm lượng/chuột lưu giữa lần mở | localStorage; cần browser |
| Âm thanh | nhạc và các sự kiện quy định | WebAudio; cần nghe thực tế |
| HUD/màu | ô carry10, cooldown, prompt, đồng hồ đỏ≤30, hướng đèn ngoài màn hình | code và browser |
| Contract | schema v1.1, snapshots đầy đủ, CLI nhận3 đêm, ≤30s/21.600 bước | CLI/scenario/performance |

## Giả định chi tiết chưa định nghĩa

- Bóng Mực sinh tự nhiên có telegraph `spawning` 60 tick; scenario mặc định `chase` hoạt động ngay.
- Di chuyển áp vận tốc ngay (đáp ứng tăng/dừng ≤0.1s). Không sửa vị trí Y của entity do scenario dựng.
- Đèn/bùa tương tác XZ; bùa áp cùng điều kiện cao như đom đóm; đèn không có giới hạn cao vì ticket không đặt.
- Giây/timer là số nguyên tick nội bộ. Tất cả định dạng giây trong JSONL được làm tròn 3 số lẻ.
- Đầu vào tick đang pause vẫn cập nhật, cạnh nhấn khi đang pause bị tiêu thụ.
- Spawn chọn điểm hợp lệ bằng PRNG có seed; không trùng điểm đang có đom đóm random, 30 là trần random.
- Shade đi trên đất, bị chặn bởi mép đảo, tầng và tháp; không teleport qua vật cản.
- Nhạc/hiệu ứng tạo bằng WebAudio; trang trí và âm thanh không dùng RNG gameplay.
- Ticket không chỉ rõ xuất phát Đêm 3, còn origin v1.0 nằm dưới đĩa tầng 2/tháp.
  Headless giữ mặc định (0,0,0) của contract và cho phép scenario đổi vị trí;
  bản chơi chọn điểm đáp (0,6,6) cho Đêm 3, hồi sinh tại đó. Đây là giả định cần
  Coach xác nhận, không phải yêu cầu gốc. Đêm 1/2 dùng (0,0,0).

## Hồi quy

Giữ mọi kiểm tra Phase 1 còn hợp lệ. Sửa test pulse (không push tức thì mà 15 tick,
3D), điểm nhặt (0 thay +10), drop (1/2), radius/capacity/tuning mới. Không skip test.
Lưu kết quả Phase 1 cũ ở tag phase-1; log Phase 2 chạy lại toàn bộ test đã cập nhật.
