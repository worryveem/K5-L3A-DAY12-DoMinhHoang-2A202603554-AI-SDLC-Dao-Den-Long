# Nhật ký AI

## Ngày 20/11/2026 (ICT)

- Công cụ: OpenAI Codex; chưa có reviewer độc lập hoặc subagent.
- Lời nhắc chính: hoàn thành tất cả phase, kể cả phase đã qua.
- Đọc GUIDE, CHECKPOINTS, RULES, SUBMISSION, RUBRIC trước khi chọn kiến trúc.
- Board bị Cloudflare chặn; Browser Use không có host. Người dùng cung cấp PRD-0 / v1.0 và Ticket-02 / v1.1 qua chat. Phase 3/4 chưa phát hành.
- Phase 1: tiêu chí nghiệm thu và kế hoạch test trước code; JS core độc lập WebGL, renderer Three.js và CLI dùng chung core; `node --test`, so output CLI từng byte, build static và HTTP smoke.
- Token Phase 1: ước tính thủ công 12.000–18.000 token; không có usage API nên không phải số đo. Không có hóa đơn nên chưa xác định chi phí.
- Tiết kiệm: một core cho game/headless, test Node built-in, model/âm thanh bằng code, không framework build.
- Giới hạn: không suy ra contract từ README, đã xin nguyên văn. Chưa kiểm chứng hình ảnh, video hay review độc lập; không ghi các mục này đạt.

## Phase 2

- Đọc Ticket-02 nhận qua chat; lập `docs/specs/phase-2.md` trước khi thay core.
- Chuẩn hóa tuning, map, tick order, timer, score; thêm dash, drop/fall, drifters,
  charms, wind và pause. Core không dùng DOM/audio và renderer không tiêu thụ RNG gameplay.
- Thêm 24 test logic mới và 1 test tích hợp replay 10 scenario CLI; tổng 37 test sau hồi quy.
- Lỗi phát hiện và sửa: kỳ vọng test pulse XZ cũ; test đếm stun thiếu bước kích hoạt.
  Không skip test; ghi rõ thay đổi vì ticket.
- Benchmark thực: ba lượt đủ 21.600 bước, xem JSON đo tự động. Chưa đo FPS.
- Token Phase 2: ước tính thủ công 20.000–35.000 token, sai số lớn; môi trường không
  cung cấp usage API hoặc hóa đơn. Không quy đổi thành tiền giả định.
- Tối ưu token/phạm vi: mô-đun terrain/core dùng chung cho3 đêm, 10 scenario nhỏ,
  WebAudio và hình học thủ tục thay tải asset; không dùng subagent/reviewer ngoài.

## Phase 3

- Nhận Ticket-03/v1.2 từ người dùng; viết spec và ADR-003 trước sửa core.
- Fuel dùng integer1/60; tách lit/ever_lit; safe zone dẫn xuất; drain FSM và finish tại dawn.
- Cập nhật kỳ vọng cũ bị thay: score, all_lit, duration; không skip. Giữ bằng chứng/tag cũ.
- Thêm26 test core,4 test trình bày và8 scenario CLI; tổng68 test với18 scenario chạy hai lần so byte.
- Review đầu vào phát hiện làm tròn fuel scenario theo1/60 có thể đẩy29.999 qua ngưỡng30; giữ nguyên phần lẻ scenario và thêm test ranh giới đó.
- Review diff phát hiện patch chuyển wander nằm nhầm nhánh spawning; sửa sang stunned rồi kiểm tra lại FSM bằng test cụ thể.
- Mỗi transition quan trọng có test đầu/cuối tick; không để drain→wander→drain trong một bước che mất trạng thái thoát.
- Palette/blink/scale kiểm tra bằng mô hình hiển thị thuần; không coi là screenshot, FPS hoặc nghe âm thanh thật.
- Browser Use vẫn báo host unavailable. Chưa có reviewer độc lập, video hay kiểm chứng hình ảnh.
- Token Phase3: ước tính thủ công12.000–22.000 token, không phải usage đo được; chi phí chưa xác định.
- Tiết kiệm: giữ core/CLI/renderer sẵn có, chỉ thêm trạng thái/dữ liệu cần thiết; không engine mới, không tải asset.

## Phase 4

- Nhận Ticket-04/v1.3; dùng cùng renderer/core, thêm scene bench riêng, soak, leaderboard và accessibility. Không đổi luật gameplay Phase3.
- Đọc tài liệu Electron và switch Chromium chính thức; benchmark là render thật, không lấy throughput headless làm FPS.
- Native Browser Use không có host; tạo launcher của chính game để đo/chụp/quay. Instancing thay các mesh Bóng Mực riêng lẻ, không thay output gameplay.
- Test mới kiểm công thức FPS/1%low/P95, fixture200/100, camera orbit,9keybinds, leaderboard HTTP/disk/restart/export và soak cùng PID.18trace hồi quy so từng byte với Phase3.
- Review ảnh phát hiện menu footer chồng chữ và capture trước khi compositor vẽ panel mới; chỉnh layout, đợi2paint trước ảnh. Quay lần đầu gặp EmptyBitmap do capture đồng thời; dùng hàng đợi capture và frame gần nhất để tránh hai yêu cầu chồng nhau, rồi quay lại thật.
- Người dùng yêu cầu **không commit/push**, chỉ điền file MD cần cho lab; đã giữ HEAD ở commit Phase3 và không publish Release. Không tạo báo cáo/sơ yếu lý lịch trùng lặp.
- Người dùng chọn “Tạo video replay+bằng chứng giúp tôi”; video ghi rõ tự động, không nhận là chơi tay.
- Token Phase4: ước tính thủ công20.000–40.000 token, sai số lớn; không có usage API hay hóa đơn nên không ghi chi phí bịa. Tổng4phase ước tính64.000–115.000 token.
- Tiết kiệm: dùng lại Three.js/Game và scenario; không thêm framework web; test Node có sẵn; chạy chuẩn30s khi cảnh đã đúng, giữ raw timings để kiểm công thức.

### Chuẩn bị bàn giao sau rà soát

- Người dùng muốn chỉ cần commit/push rồi nộp. Thêm job release sau test/build ba hệ điều hành; kiểm ZIP/bằng chứng trước khi tạo tag và Release, giữ tag cũ.
- Chưa chạy job GitHub hoặc publish tại máy. Hướng dẫn chính xác ở mục 9 SUBMISSION; không cần thêm file báo cáo cá nhân.
- Điểm xuất phát Đêm 3 là giả định được PRD cho phép, không tự đặt thêm yêu cầu xin phê duyệt. Replay giữ đúng lựa chọn của người dùng và ghi rõ tự động.

### Sửa CI sau lần push đầu

- Run44761663144: Linux/Windows đạt; macOS không có bước nào được chạy, runner_name rỗng. Annotation GitHub báo không cấp được hosted runner và thiếu capacity macOS ARM64; release bị skip do dependency.
- Đổi riêng runner macOS từ `macos-latest` sang `macos-15-intel` theo nhãn chính thức; giữ đủ ba hệ điều hành và chặn release nếu test lỗi. Đặt matrix fail-fast=false để một job lỗi không hủy bằng chứng các job còn lại.
- Kiểm tra YAML tại máy; chưa nhận bản sửa là đã chạy đạt trên macOS/GitHub. Không commit/push thay người dùng.
