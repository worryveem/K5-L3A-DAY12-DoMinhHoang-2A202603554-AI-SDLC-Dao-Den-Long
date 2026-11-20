# Đảo Đèn Lồng

**Video demo:** chưa quay. **Bản hiện tại:** Phase 2 / Test Contract v1.1.

Game web 3D góc nhìn thứ ba, gồm Đảo Bến, Đảo Cau và Đảo Chuông. Mây gom đom đóm,
thắp Đèn Lồng Lớn và tránh Bóng Mực / Gió Lạc để mang bình minh về ba hòn đảo.
Đỗ Minh Hoàng · 2A202603554 · L3A.

## Chạy trong 3 lệnh

Cần Node.js 22+ và trình duyệt hỗ trợ WebGL 2. Dùng cùng lệnh trên macOS, Linux, Windows:

```sh
npm ci
npm run build
npm start
```

Mở http://localhost:4173. Nhấn **Thắp lại hòn đảo**, đọc lời Ông Đăng rồi bắt đầu.
`dist/` là bản web tĩnh, không phụ thuộc CDN; có thể phục vụ bằng bất kỳ HTTP server nào.

## Điều khiển và luật chơi

| Phím | Hành động |
|---|---|
| WASD | Đi theo camera |
| Kéo chuột | Xoay camera |
| Space | Nhảy |
| Shift | Lướt |
| E | Nạp ánh sáng vào đèn gần nhất |
| Q | Tỏa Sáng (tốn 3 đom đóm) |
| Esc / P | Tạm dừng / tiếp tục |

Tự động nhặt đom đóm khi gần; mang tối đa **10**. Mỗi đèn cần **10**, nạp nhiều lần
và nhớ tiến độ. Đèn sáng tạo vùng an toàn 6 m. Tỏa Sáng có bán kính 3D 5 m,
làm choáng Bóng Mực 2 s và đẩy 4 m trong 15 tick; hồi 3 s. Lướt 14 m/s trong0,2 s,
hồi1,5 s; không bất tử. Bùa Gió tăng tốc chạy lên7,2 m/s, bỏ hồi chiêu lướt trong10 s.

Đêm2 có hai đảo, cầu tre và bục nhảy đỏ. Đêm3 có tầng/dốc/bục và gió báo trước bằng
lá bay, âm thanh. Gió Lạc cướp đom đóm; dùng Tỏa Sáng để xua hoặc lấy lại đồ.
Đủ đèn thì thắng Đêm; hết3 Ngọn Lửa hoặc thời gian thì thua. Thắng Đêm3 mở Bình Minh.
Tổng điểm chỉ cộng các Đêm đã thắng. Có chơi lại Đêm, menu pause và cài đặt lưu trên trình duyệt.

Điểm chuẩn: **+10 mỗi đom đóm nạp**, +100 mỗi đèn thắp, +5 mỗi Bóng Mực trúng pulse;
thắng cộng `floor(giây còn)*2 + 50*Ngọn Lửa còn`. Không cộng điểm nhặt.
Thời lượng300/330/360 s, 5/6/7 đèn. Tuning: [game.contract.json](game.contract.json).
Rơi dưới Y=-10 mất1 lửa và toàn bộ carry, chờ1 s rồi hồi sinh; hết lửa thua ngay.

Đêm3 có điểm chưa rõ trong đề: origin v1.0 (0,0,0) nằm dưới tầng2/tháp.
Bản chơi dùng điểm đáp (0,6,6); headless vẫn giữ origin contract hoặc vị trí trong scenario.
Giả định cần xác nhận với Coach được ghi trong [spec Phase2](docs/specs/phase-2.md).

## Test, headless và bằng chứng

```sh
npm test
npm run verify -- --phase 2
node src/headless.mjs --seed 42 --night 2 --ticks 600 --out output.jsonl
```

CLI nhận `--night 1|2|3`, thêm `--scenario file.json --inputs file.json --snapshot-every 10`.
60 tick/s, không GPU/cửa sổ, không đợi thời gian thực. Snapshot0 trước input;
input tick k tạo event/trạng thái k+1. Pause tăng tick nhưng giữ sim_tick/timer.
JSONL kết thúc bằng `end`; lỗi input/scenario trả mã2, thông báo ra stderr.

```sh
node scripts/replay-scenarios.mjs
node scripts/benchmark.mjs
```

10 scenario CLI đều có kỳ vọng và chạy hai lần so từng byte; mặc định lưu ở`.work/`.
[Bằng chứng Phase1](docs/proof/phase-1/README.md), [Phase2](docs/proof/phase-2/README.md).
Benchmark headless 21.600 bước đo được dưới1 giây mỗi Đêm trên máy hiện tại;
**chưa đo FPS hoặc kiểm chứng trực quan**, vì Browser Use chưa kết nối.
Chưa khẳng định đạt test ẩn, đủ DoD đồ họa hay có video.

CI test/build trên Windows, macOS, Linux. Hook chặn commit khi test đỏ:
`git config core.hooksPath .githooks`.

## Sáng tạo của tôi

Biển mây, cây low-poly, trăng/sao, ánh đom đóm nhấp nhô, vòng Tỏa Sáng và chiếc đèn
nhỏ trên nón lá của Mây đều tạo bằng hình học thủ tục. Nhạc/hiệu ứng tổng hợp bằng
WebAudio. Trang trí/âm thanh không dùng RNG gameplay; headless không khởi tạo renderer.
Test tất định kiểm tra điều đó ở mức core; chưa có ảnh/video chứng minh hình ảnh.

## Hồ sơ lab

- [Spec Phase1](docs/specs/phase-1.md), [Phase2](docs/specs/phase-2.md), [changelog](CHANGELOG.md).
- [Tiến độ](docs/notes/progress.md), [nhật ký AI và token ước tính](docs/notes/ai-log.md), [retro](docs/notes/retro.md).
- [Harness](AGENTS.md), [hướng dẫn lab gốc](docs/lab/README-original.md), [checkpoints](CHECKPOINTS.md), [nộp bài](SUBMISSION.md).
- [Nguồn](CREDITS.md), [LICENSE](LICENSE).
- **Ticket-03/04 chưa phát hành:** chưa triển khai/tag Phase3/4, chưa tạo Release cuối`v1.0.0`.
