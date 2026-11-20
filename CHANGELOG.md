# Changelog

## Phase 3 — Contract v1.2 — Breaking changes

- Thay đèn vĩnh viễn bằng fuel100, hao1/s; cạn tắt/reset deposited nhưng giữ ever_lit.
- E châm dầu theo ceil, thắp lại cần5; thêm refuel/lantern_out/fuel_drain, lantern_lit.relight.
- Safe zone chỉ khi fuel≥30. Wander tìm đèn yếu, drain cộng5/s/con; pulse ngắt drain thưởng tổng15.
- **Bỏ thắng sớm/all_lit**. Thời lượng240/270/300s; sống tới dawn với≥ceil(.6*n) đèn sáng mới thắng dawn_survived; no_flames ưu tiên.
- **Thay toàn bộ điểm**: nạp5, lần đầu100/relight40, pulse5/drain15, dawn50+floor(fuel)/đèn và50/lửa; không time bonus.
- Capacity10→20 theo successful_lights; snapshot fuel/ever_lit/relit_count/player.capacity và scenario v1.2.
- UI có bar dầu, blink1Hz, đèn tắt xẹp20%/rách; palette lưu, viền/mắt cyan và cảnh báo trắng+⚠.
- Test cũ được cập nhật có lý do trong spec Phase3; không skip. ADR-003 ghi thiết kế thay đổi.

## Phase 2 — Contract v1.1

- Chuẩn hóa tuning/map/score theo Ticket-02; giữ core thuần và fixed-step60 Hz.
- Ba Đêm, dash, bùa, Gió Lạc, fall/respawn, wind, safe-zone evacuation, recoil.
- Pause tách tick/sim_tick; snapshots đầy đủ mảng và trạng thái v1.1.
- Menu/giới thiệu/chuỗi Đêm/Bình Minh/settings; WebAudio; renderer terrain theo map.
- Hồi quy Phase1 cập nhật pulse sang3D và push15 tick; không skip test.
- Bổ sung24 test logic, 1 test tích hợp10 scenario CLI tất định và benchmark21.600 bước.
- Chưa kiểm chứng FPS/UI/video; xem giới hạn trong docs/proof/phase-2.

## Phase 1 — Contract v1.0

- Game3D Đảo Bến, Mây, 5 đèn, đom đóm, Bóng Mực và Tỏa Sáng.
- CLI deterministic JSONL, scenario/input validation, fixed60 Hz.
- 12 test, build static và HTTP smoke; tag phase-1 đã push.
