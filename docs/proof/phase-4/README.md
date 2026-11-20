# Bằng chứng Phase 4 / v1.3 — local

Sinh viên: Đỗ Minh Hoàng · MSSV2A202603554 · K5-L3A.
Người dùng yêu cầu không commit/push; không nhận các file local này là đã nằm ở tag/Release.

| Tiêu chí | Bằng chứng | Trạng thái |
|---|---|---|
| Luật v1.0–v1.2 giữ nguyên |76test,18scenario so hash output với baseline Phase3 | Đạt bộ test của repo; chưa chạy test ẩn |
| Bench scene/metrics | `bench.json` ở gốc, raw `bench.frames.json`, `bench.details.json`, screenshot benchmark | Chạy thật30s sau3s warmup;296,9FPS/170,8low/load1173,5ms trên máy tự đo |
| Soak10Đêm/1process | `soak.json`, `soak.details.json` ở gốc |0crash; RSS dưới1,2× baseline; kết quả ngẫu nhiên đều lost, không gọi đó là test win |
| Top10/disk/restart/export | `tests/phase-4.test.mjs` | Test lưu15 mục, top10, thứ tự time, khởi động lại/CLI cùng file; dùng thư mục tạm |
| Đổi phím và accessibility | Unit bindings/settings; `ui-check.json`, `docs/screenshots/` | Font đo thật18px/22,5px; ảnh menu/game/settings/large; API logic/test key conflicts |
| Cài đặt sạch | `clean-check.json/txt` | Snapshot **working tree chưa commit** trên clone sạch; có hash nguồn |
| Headless/HTTP | `headless.jsonl`, clean-check HTTP | Chạy CLI thật, end won477 ở fixture dawn |
| Video | `docs/demo/demo.mp4`, capture.json | Replay tự động + kết quả thật; không thao tác tay; dưới5phút |
| Đóng gói | `artifacts/dao-den-long-v1.0.0-web.zip` | Gói local; không phải Release GitHub |
| Tagphase-4/Releasev1.0.0/commitbench-soak | Chưa thực hiện | **Chưa đạt bàn giao** vì người dùng yêu cầu giữ local |

`readiness.json` tính lại FPS từ raw dt, so ngưỡng bench/soak, kiểm font và decode toàn bộ MP4.
Video hiện dài64,73s. Clean snapshot kiểm code/install; video được kiểm độc lập sau khi quay xong.

Kiểm tra lại: `npm ci`, `npm run verify -- --phase 4`.
Bench/soak lấy đúng lệnh trong `game.contract.json`; không dùng throughput headless thay FPS.
Ảnh/video là capture trang game thật, không phải ảnh tạo bằng AI. Các log Phase1–3 được giữ nguyên theo tag cũ.
Chưa có review độc lập hoặc test ẩn; giả định spawn Đêm3 được ghi ở spec/README theo quyền tự giả định của PRD.

Quy trình bàn giao đã được chuẩn bị trong `.github/workflows/verify.yml`: sau push main,
test/build ba hệ điều hành rồi kiểm bằng chứng/gói trước khi tạo tag và Release.
Không nhận kiểm tra local là kết quả chạy GitHub; trạng thái thực tế xem Actions.
