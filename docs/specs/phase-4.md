# Phase 4 — Ticket-04 «Bình minh: phát hành v1.0.0» / Contract v1.3

Nguồn: Ticket-04 nguyên văn do người dùng cung cấp ngày20/11/2026 (ICT).
Kế hoạch trước triển khai. Giữ luật/snapshot/event v1.0–v1.2.

| Nhóm | Acceptance | Kiểm chứng |
|---|---|---|
| Bench | CLI seed42, warmup3s + đo duration; cửa sổ content1280×720, orbit30m/Y15/15s,200wander/100motes/3đèn100 dầu; tắt spawn/damage/pickup/fuel/end/creative | Fixture/count/camera tests; chạy Electron thật30s, lưu raw frame times + bench.json; FPS/1%low/load đúng công thức |
| Soak |10 Đêm1→2→3 vòng trong1 process, seed7+i (i=0..9), inputseed mỗi30tick và xác suất đúng; RSS sau loadđầu/resetcuối | CLI thật, results/ticks/seeds/log, crashes0, RSS≤1.2x |
| Leaderboard | Nhập tên sau lost hoặc wonĐêm3; top10 score desc/time asc; nights_won/seed/ISOtimezone; persisted disk và CLI export | Unit thứ tự/validation, HTTP POST/GET/khởi động lại, subprocess export; UI lưu/đọc cùng API |
| Keybinds |9 hành động:4 hướng+jump/dash/interact/pulse/pause, duplicate báo lỗi, reset và persist | Unit bindings/collision/normalization + UI/Electron evidence |
| Accessibility | Visual spawn+edgearrow/wind/last10s/lowfuel; reduced motion; font≥18px1280×720 vàlarge×1.25 | State tests, tính computed font trong app verification; screenshots |
| Packaging | Clone npmci/build/start≤3lệnh; READMEảnh/controls/tests/bench/soak; LICENSE/CREDITS/4-phase changelog; releasev1.0.0 | Clone sạch, archive runnable, checksum, GitHub release/tag state |
| Demo/retro | MP4<5phút từ gameplay thật + bằng chứng; retro1–2trang4phase/tokenước tính | Capture real renderer replay, include actual test/bench/soak data; verify duration/filesize |

## Quyết định triển khai

- Web game vẫn là bản chơi chính, Node localhost server cung cấp leaderboard trên đĩa.
  Static hosting có localStorage fallback/export bằng UI; CLI chính thức dùng cùng file server.
- Bench là Electron app của repo dùng cùng Three.js View, không phải giả lập FPS từ core.
  Memory web có thể null theo contract; ghi rõ vsync_off=false nếu không chứng minh tắt được.
- Cảnh bench dùng wander-only (tắt nhận biết Mây), cùng thuật toán đi tới đèn tắt;
  không cho chuyển chase/drain. Chỉ mở rộng tham số benchmark, không đổi default gameplay.
- Soak đo RSS thật, collect garbage nhất quán tại hai ranh giới nếu --expose-gc;
  không đệm memory để làm tăng baseline, không sửa số đo để đạt.
- Video nếu quay tự động sẽ ghi rõ replay tự động; không gọi là thao tác tay của người dùng.
- Chỉ ghi tiêu chí đạt sau chạy thật. Các ngưỡng FPS vẫn phải xác minh lại trên máy chấm.
- Chỉ dẫn mới của người dùng: toàn bộ Phase4 chỉ ở local, không commit/tag/push/publish. Chuẩn bị artifact/bằng chứng để review; để trống các mục bàn giao GitHub chưa thực hiện.
- Người dùng đã chọn MP4 replay tự động kèm bằng chứng. Không mô tả nó là thao tác chơi tay.
