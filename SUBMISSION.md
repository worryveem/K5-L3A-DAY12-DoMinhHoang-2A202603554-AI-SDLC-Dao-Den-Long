# Hướng dẫn nộp bài và checklist (SUBMISSION)

> **Bài cá nhân:** mỗi MSSV nộp **một** repo GitHub **public**.
> Điểm: [RUBRIC.md](RUBRIC.md). Quy định: [RULES.md](RULES.md). Cách làm: [GUIDE.md](GUIDE.md). Mốc tự kiểm: [CHECKPOINTS.md](CHECKPOINTS.md).
> Yêu cầu của từng phase: **[lab board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**.

---

## 1. Quy tắc đặt tên repo

Theo quy ước chung Khóa 5:

- **Cấu trúc:** `K5-<L3A hoặc L3B>-DAY12-<HoVaTen>-<MSSV>-AI-SDLC-Dao-Den-Long`
  (không dấu, không khoảng trắng, ngăn cách bằng `-`)
- **Ví dụ:** `K5-L3A-DAY12-NguyenVanA-2A2026xxxxx-AI-SDLC-Dao-Den-Long`

Bạn có thể tạo repo mới với đúng tên này, hoặc đổi tên repo sẵn có (Settings, Repository name). Repo phải ở chế độ **Public** khi nộp.

## 2. Deadline

Lab kéo dài **4 giờ**, Phase 1 và 2 khoảng 1 giờ, Phase 3 khoảng 30 phút, Phase 4 khoảng 1 giờ 30 phút. Hạn tag tính theo **mốc giờ trong buổi lab**.

| Mục | Hạn |
|---|---|
| Tag `phase-1` | Trước mốc 1h (khi Phase 2 phát hành) |
| Tag `phase-2` | Trước mốc 2h |
| Tag `phase-3` | Trước mốc 2h30 (khi Phase 4 phát hành) |
| Tag `phase-4`, Release `v1.0.0`, video | Trước mốc 4h (hết giờ lab) |
| Nộp link repo lên LMS | Theo thông báo của Coach. Mặc định: **23h59 cùng ngày làm Lab đối với ca sáng và 11h59 trưa ngày hôm sau đối với ca chiều** (ICT / GMT+7) |

- Thời điểm tính là thời điểm của **tag và Release** trên GitHub. Sau mốc giờ của phase, tag mới hoặc commit mới cho phase đó có thể không được tính.
- Sau khi hết giờ lab, bạn chỉ nộp link; **không** commit thêm nội dung sản phẩm. Commit sau hạn có thể không được tính.
- Gia hạn chỉ khi Key Coach thông báo **trong vòng 48 giờ sau Lab**.
- Nộp muộn bị trừ điểm theo quy định khóa.

## 3. Những gì phải có trong repo

Bạn tự quyết cách tổ chức thư mục. Nhưng người chấm phải tìm được các mục sau.

| Mục | Yêu cầu |
|---|---|
| Mã nguồn | Toàn bộ mã nguồn của game sau Phase 4 |
| Tag | `phase-1`, `phase-2`, `phase-3`, `phase-4` đúng tên, trỏ vào commit hoàn thành mỗi phase |
| Release | `v1.0.0` có bản chạy được (file thực thi, thư mục web tĩnh hoặc Docker kèm hướng dẫn) |
| README | Link video demo ở đầu; mô tả ngắn; cài đặt và chạy trong tối đa 3 lệnh; điều khiển; cách chạy test và chế độ headless |
| Test Contract | Tệp khai báo và chế độ headless theo yêu cầu trong tài liệu từng phase |
| Bằng chứng | Bằng chứng kiểm chứng của từng phase, đặt ở đâu tùy bạn nhưng phải **tìm được và khớp tag** |
| Harness AI | Các file bạn dùng với AI (`AGENTS.md` hoặc tương đương, skills, hooks, plugins, cấu hình MCP...), **giữ nguyên** trong repo và lịch sử git |
| Ghi chép | Giả định mỗi phase; nhật ký dùng AI gồm token/chi phí ước tính; retro |
| Video | `.mp4` dưới 5 phút (xem mục 4) |
| `CREDITS` và `LICENSE` | Nguồn mọi asset, âm thanh, công cụ AI tạo nội dung; giấy phép |

Một cấu trúc **gợi ý** (không bắt buộc):

```text
README.md
LICENSE  CREDITS.md  CHANGELOG.md
AGENTS.md                      (hoặc CLAUDE.md, .cursor/rules ...)
.agents/skills/ hoặc .claude/skills/     (skills, nếu có)
.claude/settings.json          (hooks, nếu có)
src/                           (hoặc cấu trúc của engine bạn chọn)
tests/
docs/
  notes/        giả định, nhật ký dùng AI, retro
  proof/        bằng chứng từng phase
  demo/         demo.mp4 (nếu không đính kèm Release)
```

Không commit `.env`, API key, token.

## 4. Video demo `.mp4` dưới 5 phút

**Nội dung nên có:**
- Chơi trực tiếp một đoạn.
- Cho thấy bằng chứng game chạy đúng (chạy kiểm tra và thấy kết quả đạt).
- Nếu ticket có yêu cầu đo hiệu năng: chạy đo và cho thấy kết quả.
- Lướt nhanh qua harness AI và lịch sử git.

**Đưa lên GitHub theo một trong hai cách:**

Cách A (khuyến nghị): đính kèm vào Release `v1.0.0`.

```bash
gh release create v1.0.0 demo.mp4 --title "v1.0.0" --notes "Ban phat hanh cuoi"
```

Nếu đã có Release, thêm file:

```bash
gh release upload v1.0.0 demo.mp4
```

Cách B: commit vào `docs/demo/demo.mp4`, nếu file dưới 100 MB.

**Quay và nén gợi ý (macOS):** Cmd + Shift + 5 để quay màn hình. Nén xuống dưới 5 phút và dung lượng nhỏ:

```bash
ffmpeg -i input.mov -t 300 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k demo.mp4
```

Đặt link video (Release hoặc file) ở **đầu README**.

## 5. Gắn tag đúng cách

Gắn tag ngay khi hoàn thành mỗi phase, trước hạn của phase đó.

```bash
git tag phase-1
git push origin phase-1
```

Làm tương tự cho `phase-2`, `phase-3`, `phase-4`. Kiểm tra bằng `git tag --list` và trên trang repo, mục Tags.

Nếu gắn nhầm commit, xóa và gắn lại **trước hạn**:

```bash
git tag -d phase-2
git push origin :refs/tags/phase-2
git tag phase-2 <commit-dung>
git push origin phase-2
```

## 6. Người chấm sẽ làm gì với repo của bạn

1. Clone sạch repo, checkout từng tag `phase-N`.
2. Làm theo README, chạy game và chạy chế độ headless theo Test Contract với các kịch bản của giảng viên (bạn không biết trước kịch bản).
3. Chạy lại các kiểm chứng bạn cung cấp để xem bằng chứng có khớp mã ở tag không.
4. Với phase có yêu cầu đo: chạy đo trên **một máy chấm chung** cho mọi bài.
5. Xem lịch sử git, harness AI, ghi chép và video demo.

## 7. Checklist trước khi nộp

Sản phẩm
- [x] Repo ở chế độ Public, tên đúng quy ước.
- [ ] Clone sạch sang thư mục khác, làm theo README (tối đa 3 lệnh), game chạy được. **Snapshot local Phase4 đã qua cài/build/test/HTTP trong thư mục sạch; chưa có commit Phase4 trên remote để clone.**
- [x] Chế độ headless đã qua kiểm chứng contract và hồi quy của repo (chưa chạy test ẩn).
- [ ] Tag `phase-1` đến `phase-4` có đủ, trỏ đúng commit. **Hiện có1–3; chưa tạo4 theo yêu cầu không commit/push.**
- [ ] Release `v1.0.0` có bản chạy được. **Chỉ chuẩn bị gói local, chưa publish.**

Bằng chứng và ghi chép
- [x] Mỗi phase có bằng chứng cho các yêu cầu chính; chỗ chưa đạt đã ghi trung thực.
- [ ] Bằng chứng khớp mã ở tag tương ứng, không sửa tay. **Phase1–3 giữ nguyên; Phase4 có log/hash local nhưng chưa có tag.**
- [x] Test cũ bị yêu cầu mới làm sai đã được sửa hoặc bỏ kèm lý do.
- [x] Có giả định cho chỗ mơ hồ, nhật ký dùng AI (gồm token/chi phí ước tính), retro.

Harness AI
- [x] File harness (AGENTS.md hoặc tương đương, skills, hooks, plugins...) còn trong repo và trong lịch sử git.
- [x] Nếu dùng công cụ không có file cấu hình, các lời nhắc chính được ghi trong nhật ký dùng AI.

Video, giấy phép, bảo mật
- [ ] Video `.mp4` dưới 5 phút, link ở đầu README, mở được khi chưa đăng nhập. **Đã có MP4 local64,73s và link README; chưa đưa lên public theo yêu cầu không push/publish.**
- [x] `CREDITS` ghi nguồn mọi asset, âm thanh, công cụ AI tạo nội dung; có `LICENSE`.
- [x] Đã rà tên file lịch sử và mẫu key phổ biến, không phát hiện `.env` hoặc key/token; xem `docs/proof/phase-4/repository-audit.json` (không phải bộ dò bí mật toàn diện).

## 8. Mẹo kiểm tra nhanh

```bash
git clone <link-repo-cua-ban> kiem-tra && cd kiem-tra
git tag --list
git log --oneline | head -20
```

Mở trang repo bằng cửa sổ ẩn danh để chắc repo, Release và video xem được khi chưa đăng nhập.

## 9. Bàn giao bản này

Bản local đã có thông tin Đỗ Minh Hoàng / 2A202603554 / K5-L3A, báo cáo bắt buộc,
video và bằng chứng. Không cần fork hoặc tạo repo khác. Chỉ thực hiện:

```sh
git add .
git commit -m "release: complete Phase 4 and v1.0.0 submission"
git push origin main
```

Workflow **Verify game** tự chạy test/build trên Linux, macOS và Windows.
Khi cả ba đạt, job `release` kiểm bằng chứng, giải nén/chạy thử gói rồi tạo
`phase-4`, `v1.0.0` và GitHub Release đính kèm ZIP, MP4, bench và soak.
Không sửa tag Phase 1–3, không ghi đè Release đã phát hành.
Workflow dùng `GITHUB_TOKEN` tự cấp, không cần điền token vào repo.
Quyền phát hành được khai báo riêng ở job release theo [tài liệu GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions).

Sau push, đợi job `release` màu xanh ở tab **Actions** và mở **Releases → v1.0.0**.
Nếu Actions bị tắt hoặc quy tắc repo chặn quyền tạo tag/Release, job sẽ báo lỗi;
không coi push thành công là đã phát hành. Xem log để xử lý đúng lỗi đó.

Khi Release hiển thị đủ ZIP/video, nộp link repo:
https://github.com/worryveem/K5-L3A-DAY12-DoMinhHoang-2A202603554-AI-SDLC-Dao-Den-Long

Các ô chưa đánh dấu ở mục 7 phản ánh phần GitHub chưa thực hiện tại lúc chuẩn bị local;
kết quả workflow và Release là bằng chứng bàn giao sau push. Không đánh dấu trước là đã phát hành.
