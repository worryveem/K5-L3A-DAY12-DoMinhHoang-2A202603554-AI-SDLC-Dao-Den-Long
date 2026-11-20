# Retro Day12 — Đảo Đèn Lồng

Đỗ Minh Hoàng · 2A202603554 · K5-L3A. Ghi nhận ngày20/11/2026 (ICT).
Bản Phase4 hiện ở local theo yêu cầu không commit/push; chưa coi là đã bàn giao GitHub.

## Evaluation qua4phase

| Phase | Kết quả | Điều học được |
|---|---|---|
|1 — PRD-0/v1.0| Một core thuần dùng chung game3D và CLI;12test, build/HTTP, tagphase-1 | Đọc contract trước kiến trúc; chốt tick0, input giữ trạng thái, bán kính và deterministic IDs |
|2 — Ba đảo/v1.1| Chuẩn hóa số,3map, dash/bùa/drifter/wind/pause;37test và10scenario, clone sạch | Chuẩn hóa thay giả định tự chọn; không duy trì số cũ chỉ để test xanh |
|3 — Cạn dầu/v1.2| Fuel/refuel/relight/drain, sức chứa, dawn, score mới;68test và18scenario, ADR-003 | Tách lit với ever_lit; cùng hàm safe-zone; đổi test all_lit có giải thích, không skip |
|4 — Phát hành/v1.3|76test, bench render thật, soak10Đêm, disk leaderboard/export, keybinds/font/cues, ảnh và replay MP4 | Đo đúng renderer, giữ raw frame times; chuẩn bị gói chạy được rồi mới xét publish |

Benchmark/soak thực nằm ở `bench.json`, `soak.json`; log và kiểm chứng ở
`docs/proof/phase-4/`. Đây là số tự đo trên máy hiện tại, không thay phép chấm trên máy Coach.

## Làm việc với AI: hiệu quả và sai sót

Hiệu quả nhất là giữ logic ngoài DOM/GPU và viết tiêu chí nghiệm thu trước code.
Một scenario vài tick bắt được sai số ở biên radius/cooldown nhanh hơn nhìn chơi thử dài.
Test CLI chạy hai subprocess so từng byte cũng bắt được RNG/ID không ổn định.

AI đã mắc các lỗi có thể kiểm chứng: test pulse cũ tính XZ trong khi Ticket02 đổi sang3D;
test stun đếm thiếu tick kích hoạt; patch chuyển trạng thái từng bị đặt nhầm nhánh spawning.
Diff và test FSM đã phát hiện các lỗi này. Khi đổi luật, sửa kỳ vọng đúng theo ticket và ghi lý do,
không đổi output hay skip test để giữ màu xanh.

Fuel hiển thị60.0 có thể thực tế59+59/60, nên thưởng floor không được lấy số đã làm tròn.
Review thêm case29.999 đã bắt nguy cơ làm tròn scenario vượt ngưỡng30; giữ độ chính xác đầu vào.
Ở Phase4, ảnh đã phát hiện menu chồng chữ và ảnh panel cũ do capture trước paint.
Video đầu bị EmptyBitmap; sửa hàng đợi chụp và quay lại từ game thật.

## Harness và bằng chứng

`AGENTS.md` giữ quy ước core/contract và các cấm bịa bằng chứng. Pre-commit hook
`npm test` và CI ba hệ điều hành giúp không quên hồi quy; verify lưu exit code, máy và log thật.
Replay scenarios là harness hữu ích nhất khi thay đổi luật; raw frame times cho phép tính lại FPS/1%low/P95.
Phase4 thêm snapshot working tree vào thư mục sạch để thử npmci/build/test mà không cần commit trái yêu cầu.
Chưa có reviewer độc lập; self-review và test không được gọi là đánh giá của người khác.

Browser Use không kết nối, nên dùng launcher của chính ứng dụng để chụp render và quay replay.
Video là replay tự động được người dùng chọn, không giả là thao tác tay.
Điểm xuất phát Đêm3 là giả định cho phần đề chưa định nghĩa; đã ghi rõ trong spec/README.

## Token, chi phí và lần sau

Ước tính thủ công từng phase:12–18k,20–35k,12–22k,20–40k; tổng64–115k token,
không phải số usage được hệ thống đo. Không có hóa đơn nên chưa xác định chi phí tiền.
Đã tiết kiệm bằng core chung, test Node built-in, asset/âm thanh thủ tục, không thêm web framework
hay tải asset hình ảnh. Chỉ đo benchmark chuẩn sau khi fixture/công thức đã được kiểm tra.

Nếu làm lại: xin ngay các tab đã phát hành, xác nhận spawn Đêm3 và khả năng capture sớm;
tách khâu đo chuẩn khỏi chạy test nền; giữ vài phút cuối cho video và đóng gói.
Hiện chưa tạo tagphase-4/Releasev1.0.0 hoặc đưa video lên mạng vì người dùng yêu cầu giữ local.
