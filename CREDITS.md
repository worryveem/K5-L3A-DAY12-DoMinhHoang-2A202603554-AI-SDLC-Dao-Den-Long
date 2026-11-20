# Nguồn và công cụ

- Tên game, Mây, Ông Đăng, Bóng Mực, Gió Lạc và yêu cầu: bộ tài liệu lab Day 12 của giảng viên. Giấy phép mã mới không cấp lại quyền đối với nội dung lab.
- Mã game, mô hình thủ tục, cảnh đảo, giao diện và âm thanh tổng hợp: tạo trong repo này với trợ giúp OpenAI Codex theo yêu cầu Đỗ Minh Hoàng.
- Three.js 0.187.0: https://github.com/mrdoob/three.js — MIT. Build kèm `vendor/THREE-LICENSE.txt`.
- Electron45.4.1: https://github.com/electron/electron — MIT, dùng làm launcher đo benchmark/chụp/quay web game. Chromium có giấy phép riêng kèm Electron; không đóng gói binary Electron trong bản web.
- ffmpeg-static5.3.0: https://github.com/eugeneware/ffmpeg-static — GPL-3.0-or-later theo LICENSE của gói. Binary Windows dùng để quay là FFmpeg6.1.1 GPLv3+, ghi nhận trực tiếp qua `ffmpeg -L`; không kèm binary này trong gói web.
- Ảnh và MP4: chụp trang game đang render bằng Electron, mã hóa H.264 bằng FFmpeg; replay tự động từ `public/demo.scenario.json` và `public/demo.inputs.json`, không phải video người dùng thao tác tay.
- Công cụ phát triển: Node.js/npm, Git, Prettier; nội dung/code được hỗ trợ bởi OpenAI Codex. Không có usage API/hóa đơn chi phí để khai số chính xác.
- Python 3 standard library: đóng gói ZIP và kiểm thử bản giải nén; chỉ cần cho công cụ đóng gói, không cần để chơi game từ source hoặc gói phát hành.
- Font hệ thống và Georgia trên thiết bị; không đóng gói font ngoài.
- Không tải model, ảnh, nhạc hoặc asset của game/phim khác. Không sử dụng ImageGen.
