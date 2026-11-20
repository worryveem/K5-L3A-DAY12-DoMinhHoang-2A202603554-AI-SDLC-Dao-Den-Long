# Tiến độ lab

| Mốc | Trạng thái |
|---|---|
| CP0 | Repo cá nhân public có remote; Node 24.21.0, npm 11.19.0; đã build/HTTP smoke |
| Phase 1 | Đã commit/tag/push phase-1; 12 test pass, build pass; chưa kiểm chứng trực quan |
| Phase 2 | Mốc phase-2: đã triển khai v1.1, ba Đêm; 37 test (gồm replay 10 scenario); clone sạch install/build/test/HTTP đạt; FPS/UI/video chưa kiểm chứng |
| Phase 3 | Mốc phase-3/v1.2: fuel/drain/dawn/capacity/điểm/accessibility;68 test và18 scenario đạt; build, clone sạch và HTTP đạt; UI/FPS chưa kiểm chứng trực quan |
| Phase 4 | Bản localv1.0.0/v1.3:76test,18trace hồi quy giữ hash; benchmark296,9FPS/170,8low/load1173,5ms; soak0crash/RSS38,66→45,64MB; font18px/22,5px; snapshot sạch cài/build/test/HTTP đạt |
| Video / release | Có `docs/demo/demo.mp4`64,73s, decode đầy đủ đạt; replay tự động+bằng chứng, không chơi tay. Gói local ở `artifacts/`; **chưa commit/tagphase-4/push/Release** theo yêu cầu người dùng |

Các tag, bằng chứng và thời điểm phát hành sẽ phản ánh thao tác thật trong phiên này;
không ghi lùi ngày hoặc coi deadline cũ là đã đạt.

## Rà soát thông tin và file cần điền

- Thông tin đang dùng: Đỗ Minh Hoàng ·2A202603554 ·K5-L3A; README và `game.contract.json` nhất quán với tên repo.
- Bài yêu cầu README, changelog4phase, credits/license, spec/giả định, AI log/tokenước tính, retro và bằng chứng. Các mục này có trong cấu trúc hiện tại; không tạo thêm báo cáo/trang thông tin sinh viên trùng lặp.
- Chỉ đánh dấu mục tự kiểm đã xác minh trong SUBMISSION; không thay ví dụ Nguyễn Văn A/MSSV trong phần hướng dẫn. GUIDE/RULES/RUBRIC và CHECKPOINTS là tài liệu hướng dẫn/gợi ý, không cần điền câu trả lời vào từng đoạn.
- Không bắt buộc fork. SUBMISSION cho dùng repo cá nhân public mới hoặc đổi tên repo sẵn có; repo hiện tại đúng tên nên không cần tạo thêm.
- Phần bàn giao do người học thực hiện: commit/push main, đợi Actions đạt rồi nộp link LMS. Job release đã được chuẩn bị để tự tạo tagphase-4/Releasev1.0.0 và upload ZIP/video sau khi kiểm tra đạt. Chưa chạy GitHub tại lúc chuẩn bị local. Thời hạn theo thông báo Coach; spawnĐêm3 là giả định đã ghi theo PRD.
