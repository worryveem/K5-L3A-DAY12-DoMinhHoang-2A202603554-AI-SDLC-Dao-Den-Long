# Phase 3 — Ticket-03 «Đèn cạn dầu» / Contract v1.2

Nguồn: Ticket-03 do người dùng cung cấp nguyên văn ngày 20/11/2026 (ICT).
Phase 4 vẫn chưa được cung cấp. Kế hoạch và giả định này được viết trước code Phase 3.

## Tiêu chí nghiệm thu và kế hoạch kiểm chứng

| Nhóm | Hành vi bắt buộc | Kiểm chứng |
|---|---|---|
| Nhiên liệu | Mỗi lần thắp 100; hao 1/60 mỗi bước; cạn tắt ngay sau bước2, reset deposited, giữ ever_lit | Test 6000 bước chính xác, pause, dầu cạn tick bình minh |
| Châm dầu | min(carry,ceil((100-fuel)/10)); không chọn đèn đầy; gần nhất rồi ID | Full/exact/partial refuel, chọn lamp, chi phí/điểm, input edge |
| Thắp lại | ever_lit cần5, relit_count tăng, lần đầu10; scenario không cộng điểm | Chu kỳ light/out/relight, scenario init |
| Safe zone | Chỉ khi lit và fuel≥30; yếu dưới30 cho shade vào; refuel khôi phục đẩy ra≤30tick | Ranh giới30, refill/evacuation, chase không đổi mục tiêu |
| Hút dầu | wander chọn đèn yếu gần nhất; drain≤2; +5/60/con cộng hao; thoát theo6m/châm/tắt/khoảng cách/pulse | Multi-shade, 60tick event, transition, interruption, stacked loss |
| Bình minh | 240/270/300s; sống và đủ ceil(.6*n) khi time0; không thắng sớm; no_flames luôn ưu tiên | Đủ/thiếu3/4/5 đèn, last-tick light/refuel/out/hit |
| Sức chứa | min(20,10+2*successful_lights), reset đầu Đêm; scenario lit không tăng | Initial/relight/cap/scenario/next-tick pickup |
| Điểm | Nạp5, thắp100/40, pulse5/15drain, thắng50+floor(fuel)/đèn +50/lửa; bỏ time bonus | Assert điểm cụ thể và không double count |
| UI | Bar dầu, blink1Hz khi<30; HUD capacity; saved accessible palette, warning⚠; đèn tắt xẹp20% và rách | Test model hiển thị thuần, build/HTTP; cần browser để xác nhận hình ảnh |
| Contract | v1.2, snapshot fuel1 số lẻ/ever_lit/relit_count/capacity; scenario mới; event mới; deterministic | CLI scenario replay hai lần so byte, invalid data exit2 |

## Giả định tại điểm ticket chưa nói chi tiết

- Luồng game bình thường dùng đơn vị nguyên1/60 (100=6000), giảm1 hoặc5 mỗi bước; scenario có độ chính xác cao hơn được giữ nguyên phần lẻ đơn vị, không làm tròn đầu vào qua ngưỡng30. Chỉ làm tròn fuel khi xuất.
- `fuel_drain` phát sau mỗi60 bước thực sự hút liên tục của từng shade; bộ đếm reset khi ngừng hút, pause giữ nguyên. Không dùng wall-clock.
- Bước2 dùng các shade đang drain khi bước bắt đầu, có mục tiêu sáng yếu trong2m; sau cộng hao/hút mới xét tắt. Chuyển chase theo vị trí sau di chuyển Mây ở bước8.
- Refuel xét sau hao dầu, đúng thứ tự bắt buộc: đèn đầy ở snapshot0 sẽ thiếu1/60 ở bước tương tác đầu tiên và có thể nhận1 đom đóm theo ceil.
- Wander vẫn phát hiện Mây trong12m theo Phase2; mục tiêu đèn chỉ được chọn khi không chuyển chase. Drain dùng ngưỡng phát hiện6m như ticket thay thế.
- Hết stun ghi trạng thái wander ở bước đó, rồi lựa chọn/phát hiện ở bước kế tiếp.
- Thoát drain về wander cũng ghi trạng thái wander ít nhất ở bước chuyển; chỉ chọn mục tiêu lại ở bước kế tiếp, tránh hai lần chuyển làm mất dấu thay đổi.
- Scenario lit:true luôn ever_lit:true; mặc định fuel100. Scenario tắt có fuel0; relit_count bắt đầu0 vì contract không yêu cầu dựng lịch sử relight.

## Test cũ bị thay thế

- Phase1 win reason `all_lit` → `dawn_survived`; chỉ thắng khi time hết, còn sống và đủ ngưỡng.
- Phase2 điểm deposit10→5, tổng thắp đèn200→150; chuỗi pause dùng thời lượng240.
- Scenario `last-tick-win`: giữ input cuối Đêm, đổi reason và tính thưởng từ dầu/các đèn thay thưởng thời gian.
- Giữ nguyên các test movement/pickup/dash/jump/stun/push/hit/fall/TTL/charm/drifter/spawn/map còn hiệu lực.
- Không sửa bằng chứng Phase1/2 cũ; chúng khớp tag phase-1/phase-2. Chỉ cập nhật test và ghi bằng chứng Phase3 mới.
