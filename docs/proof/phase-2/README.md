# Bằng chứng Phase 2

| Yêu cầu | Cách kiểm chứng / file | Trạng thái |
|---|---|---|
| Hồi quy Phase 1 với số chuẩn | `tests/phase-1.test.mjs` và `tests.txt` | Test thực, đã cập nhật pulse 3D theo ticket |
| Dash, pause, bùa, drifter, fall, pads, terrain, spawn, wind, score | `tests/phase-2.test.mjs` | Có assert ranh giới và thời điểm |
| Scenario mỗi nhóm tính năng mới, tất định | `tests/scenarios/`, `scenarios/*.jsonl`, `scenarios/summary.json` | 10 scenario, mỗi cái chạy hai lần so byte |
| Headless 21.600 bước ≤30 giây | `benchmark.json`; tái chạy `node scripts/benchmark.mjs` | Ba đêm đo riêng, gồm I/O JSONL |
| Build/module HTTP | `build.txt`, `http.json` | Kiểm tra serve file thật |
| Clone sạch theo README | `clean-check.json`, `clean-check.txt` | Install/build/37 test/HTTP pass ở commit được ghi; tái chạy `npm run verify:clean -- 2` |
| Môi trường | `environment.json` | Sinh bởi verify |
| ≥30 FPS @1280×720 | Chưa có công cụ trình duyệt kết nối | **Chưa đo**, không dùng benchmark core thay FPS |
| Cảnh3D, menu, HUD, nhạc, settings, chuỗi ba Đêm | Đã có mã renderer và UI | **Chưa kiểm chứng trực quan/âm thanh** |
| Video và review độc lập | Chưa có | **Chưa đạt** |

Tag phase-2 ghi mốc phần đã triển khai, vẫn còn các giới hạn trên.
Không khẳng định đã qua test ẩn của giảng viên. Test riêng không thay thế test ẩn.

Đêm 3: origin contract mâu thuẫn vị trí đĩa tầng2/tháp. Xem giả định ở spec;
renderer chọn điểm đáp (0,6,6), headless giữ origin và hỗ trợ scenario chính xác.
