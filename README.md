# Đảo Đèn Lồng

**Video demo:** chưa quay — không có bằng chứng video tại mốc Phase 1.

Game web 3D góc nhìn thứ ba. Mây gom đom đóm để thắp 5 Đèn Lồng Lớn trên Đảo Bến,
tránh Bóng Mực và mang ánh sáng trở về. Đỗ Minh Hoàng · 2A202603554 · L3A.

## Chạy (Node.js 22+ và trình duyệt WebGL 2)

```sh
npm ci
npm run build
npm start
```

Mở http://localhost:4173. macOS, Linux, Windows dùng cùng mã nguồn.
`dist/` là web tĩnh có thể phục vụ bằng HTTP server, không cần CDN.

## Điều khiển và luật chơi

WASD di chuyển theo camera; kéo chuột xoay camera; Space nhảy; E nạp ánh sáng;
Q tỏa sáng; Esc/P tạm dừng. Thu thập tự động, mang tối đa 20; đèn cần 10,
nhớ tiến độ nạp. Tỏa sáng tốn 3, hồi 2 giây, xua Bóng Mực trong 7 m.
Đèn sáng tạo vùng an toàn. Đủ 5 đèn thắng; hết 3 Ngọn Lửa hoặc 5 phút thì thua.
Có nút chơi lại, cài đặt âm lượng/chuột lưu trên trình duyệt.

Điểm: +10/đom đóm nhặt, +100/đèn thắp, +15/Bóng Mực trúng tỏa sáng;
thắng cộng `floor(giây còn)*2 + 50*Ngọn Lửa còn`.
Tuning đang dùng: [game.contract.json](game.contract.json).
`fall_enabled=false`: biên đảo chặn ở 38 m, không phạt rơi tại Phase 1.

## Test và headless

```sh
npm test
npm run verify -- --phase 1
node src/headless.mjs --seed 42 --night 1 --ticks 600 --out output.jsonl
```

Thêm `--scenario file.json --inputs file.json --snapshot-every 10` theo v1.0.
Không GPU/cửa sổ; dòng cuối `end`; dữ liệu sai trả mã 2.
Core dùng chung: `src/core/game.mjs`.
[Spec/giả định](docs/specs/phase-1.md), [bằng chứng](docs/proof/phase-1/README.md).
CI test/build trên Windows/macOS/Linux. Bật hook nếu cần:
`git config core.hooksPath .githooks` (chặn commit khi test đỏ).

## Sáng tạo của tôi

Đảo biển mây, cây low-poly, trăng, sao, đom đóm nhấp nhô, vòng tỏa sáng,
đèn nhỏ treo trên nón lá; hình học thủ tục, không asset ngoài.
Trang trí chỉ ở renderer, không làm đổi output headless. Core có test tất định.
Chưa có kiểm chứng hình ảnh/video vì trình duyệt chưa kết nối.

## Hồ sơ lab

- [Tiến độ thật](docs/notes/progress.md), [nhật ký AI](docs/notes/ai-log.md), [harness](AGENTS.md).
- [README lab gốc](docs/lab/README-original.md), [checkpoint](CHECKPOINTS.md), [nộp bài](SUBMISSION.md).
- [Nguồn](CREDITS.md), [LICENSE](LICENSE).
- Đã nhận Ticket-02; Ticket-03/04 chưa phát hành. Chỉ tag phase đã triển khai.
