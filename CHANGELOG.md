# Changelog

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
