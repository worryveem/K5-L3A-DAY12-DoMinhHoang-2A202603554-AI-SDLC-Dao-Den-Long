# Bằng chứng Phase 1

| Yêu cầu | Bằng chứng | Kết quả |
|---|---|---|
| Tick, input giữ giá trị, camera, pickup, deposit, pulse, hit, safe zone, kết thúc | `tests/phase-1.test.mjs`, `tests.txt` | Chạy thật bằng verify |
| Output tất định, JSONL, mã lỗi 2 | Test CLI so hai subprocess từng byte | Có assert giá trị và mã thoát |
| Build web | `build.txt` | Log build thật |
| Máy chạy | `environment.json` | Sinh tự động |
| 3D, HUD, hình dáng, chơi bằng phím | Mã `public/`; cần mở web | Chưa kiểm chứng trực quan vì Browser Use chưa kết nối |
| Video demo | Chưa có | Chưa đạt |

Log thời lượng có thể khác giữa các lần chạy. Gameplay cùng seed/input/scenario phải giống từng byte.
