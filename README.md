# Đảo Đèn Lồng

**Video demo:** chưa quay. **Bản hiện tại:** Phase 3 / Test Contract v1.2.

Game web 3D góc nhìn thứ ba: Mây thu đom đóm, thắp và châm dầu cho Đèn Lồng Lớn,
giữ Đảo Bến, Đảo Cau và Đảo Chuông sáng tới bình minh. Đỗ Minh Hoàng · 2A202603554 · L3A.

## Chạy trong 3 lệnh

Cần Node.js 22+ và trình duyệt WebGL 2. macOS, Linux và Windows dùng cùng lệnh:

```sh
npm ci
npm run build
npm start
```

Mở http://localhost:4173. Bấm **Thắp lại hòn đảo**, đọc lời Ông Đăng và bắt đầu.
`dist/` là bản web tĩnh, không cần CDN, có thể phục vụ bằng HTTP server khác.

## Điều khiển và luật chơi

| Phím | Hành động |
|---|---|
| WASD | Đi theo camera |
| Kéo chuột | Xoay camera |
| Space | Nhảy |
| Shift | Lướt |
| E | Nạp đèn / châm dầu vào đèn nhận được gần nhất |
| Q | Tỏa Sáng, tốn 3 đom đóm |
| Esc / P | Tạm dừng / tiếp tục |

Sức chứa ban đầu **10**, tăng 2 mỗi lần thắp thành công, kể cả thắp lại, tối đa **20**.
Thắp lần đầu cần **10** đom đóm; đèn đã từng sáng chỉ cần **5** để thắp lại.
Đèn đầy có **100 dầu**, hao **1/giây**. E châm **10 dầu/đom đóm** theo
`used=min(carried,ceil((100-fuel)/10))`. Cạn dầu làm đèn tắt và xóa tiến độ nạp.
Thứ tự tick trừ dầu trước tương tác: đèn đầy ở snapshot 0 đã thiếu 1/60 dầu khi E được xử lý.

Đèn dưới **30 dầu** nhấp nháy **1 Hz** và mất vùng an toàn; đúng 30 vẫn an toàn trong 6 m.
Bóng Mực wander tìm đèn yếu, đứng hút **5 dầu/giây/con** trong 2 m. Dùng Tỏa Sáng
để ngắt hút. Thanh dầu nằm trên các đèn đang sáng.

**Không thắng sớm khi thắp hết đèn.** Đêm 1/2/3 dài **240/270/300 giây**;
ở tick bình minh cần ít nhất **3/5, 4/6, 5/7** đèn đang sáng và Mây còn sống.
Hết Ngọn Lửa luôn thua, kể cả ở tick cuối. Có chơi lại Đêm và chuỗi ba Đêm;
tổng điểm chỉ cộng các Đêm đã thắng.

Tỏa Sáng: bán kính 3D 5 m, choáng 2 s, đẩy 4 m trong 15 tick, hồi 3 s.
Lướt: 14 m/s trong 0,2 s, hồi 1,5 s, không bất tử. Bùa Gió tăng tốc chạy lên
7,2 m/s và bỏ hồi lướt trong 10 s. Rơi Y < −10 mất 1 lửa và toàn bộ carry, chờ 1 s hồi sinh.
Đêm 2 có cầu tre/bục đỏ; Đêm 3 có tầng/dốc/bục và gió có báo trước. Gió Lạc cướp đom đóm,
dùng Tỏa Sáng để xua hoặc lấy lại đồ.

Điểm v1.2: **+5/đom đóm nạp**, +100 thắp lần đầu, +40 thắp lại; pulse tổng +5/Bóng Mực,
tổng +15 nếu nó đang drain. Khi thắng: mỗi đèn sáng +50+floor(fuel), mỗi lửa còn +50.
**Không thưởng thời gian**. Số liệu dùng thật: [game.contract.json](game.contract.json).

Pause → Cài đặt → **Bảng màu dễ phân biệt**: viền/mắt Bóng Mực cyan, cảnh báo trắng kèm ⚠.
Palette, âm lượng và độ nhạy chuột được lưu giữa các lần mở. Đèn tắt xẹp 20% và có vết rách
để phân biệt bằng hình dáng ở cả chế độ màu thường.

Đêm 3 có điểm chưa rõ trong đề: origin v1.0 (0,0,0) nằm dưới tầng 2/tháp.
Bản chơi dùng điểm đáp (0,6,6); headless vẫn giữ origin contract hoặc vị trí scenario.
Giả định cần Coach xác nhận được ghi trong [spec Phase 2](docs/specs/phase-2.md).

## Test, headless và bằng chứng

```sh
npm test
npm run verify -- --phase 3
node src/headless.mjs --seed 42 --night 2 --ticks 600 --out output.jsonl
```

CLI nhận `--night 1|2|3`, thêm `--scenario file.json --inputs file.json --snapshot-every 10`.
60 tick/s, không GPU/cửa sổ, không chờ thời gian thực. Snapshot 0 trước input;
input k tạo trạng thái/event k+1. Pause tăng tick nhưng giữ sim_tick, dầu và timer.
JSONL kết thúc bằng `end`; dữ liệu sai trả mã 2 và thông báo ra stderr.
Mỗi đèn snapshot có fuel (làm tròn 1 số lẻ), ever_lit, relit_count; player có capacity.

```sh
node scripts/replay-scenarios.mjs
node scripts/replay-scenarios.mjs .work/phase3 tests/scenarios/phase-3/manifest.json
node scripts/benchmark.mjs
npm run verify:clean -- 3
```

**68 test**, gồm 18 scenario CLI có kỳ vọng, mỗi scenario chạy hai lần so từng byte.
[Bằng chứng Phase 1](docs/proof/phase-1/README.md), [Phase 2](docs/proof/phase-2/README.md),
[Phase 3](docs/proof/phase-3/README.md). Benchmark stress 21.600 bước đặt thời gian scenario 360 s,
khác thời lượng mặc định các Đêm. **Chưa đo FPS hoặc kiểm chứng trực quan**, vì Browser Use
chưa kết nối. Không khẳng định đã đạt test ẩn hoặc có video.

CI test/build trên Windows, macOS, Linux. Hook chặn commit khi test đỏ:
`git config core.hooksPath .githooks`.

## Sáng tạo của tôi

Biển mây, cây low-poly, trăng/sao, ánh đom đóm nhấp nhô, vòng Tỏa Sáng và chiếc đèn nhỏ
trên nón lá đều tạo bằng hình học thủ tục. Nhạc/hiệu ứng tổng hợp bằng WebAudio.
Trang trí/âm thanh không dùng RNG gameplay; headless không khởi tạo renderer.
Test kiểm tra tính tất định; chưa có ảnh/video chứng minh hình ảnh.

## Hồ sơ lab

- [Spec Phase 1](docs/specs/phase-1.md), [Phase 2](docs/specs/phase-2.md), [Phase 3](docs/specs/phase-3.md).
- [ADR-003](docs/adr/003-lantern-fuel-and-dawn.md), [breaking changes](CHANGELOG.md).
- [Tiến độ](docs/notes/progress.md), [nhật ký AI/token ước tính](docs/notes/ai-log.md), [retro](docs/notes/retro.md).
- [Harness](AGENTS.md), [lab gốc](docs/lab/README-original.md), [checkpoints](CHECKPOINTS.md), [nộp bài](SUBMISSION.md).
- [Nguồn](CREDITS.md), [LICENSE](LICENSE).
- **Ticket-04 chưa được cung cấp:** chưa triển khai/tag Phase 4 và chưa tạo Release cuối `v1.0.0`.
