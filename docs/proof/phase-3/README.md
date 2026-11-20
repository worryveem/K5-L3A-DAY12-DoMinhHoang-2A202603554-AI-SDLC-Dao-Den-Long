# Bằng chứng Phase 3

| Tiêu chí | Bằng chứng / tái chạy | Trạng thái |
|---|---|---|
| Core v1.2: fuel/refuel/relight/safe/drain/dawn/capacity/score | `tests/phase-3.test.mjs`, `tests.txt` |26 test core mới, gồm tick cuối và ranh giới dầu |
| Hồi quy còn hiệu lực Phase1–2 | `tests/phase-1.test.mjs`, `tests/phase-2.test.mjs` | Cập nhật kỳ vọng bị thay, không skip; xem spec |
| Determinism và schema mới | `scenarios/`, `legacy-scenarios/`, summary.json mỗi bộ |8 mới +10 hồi quy; mỗi cái chạy hai lần so byte |
| Palette/blink/shape/settings | `tests/presentation.test.mjs` |4 test mô hình hiển thị; không thay kiểm chứng hình ảnh |
| ADR + breaking changes | `docs/adr/003-lantern-fuel-and-dawn.md`, CHANGELOG | Đã ghi quyết định và thay đổi luật/test |
| Build/module HTTP | build.txt, http.json | Log chạy thật |
| Clone sạch | clean-check.json/txt | Cài đặt/build/test/HTTP ở commit ghi trong báo cáo |
| Hiệu năng headless | benchmark.json | Stress21.600 bước; không phải FPS |
| Hình ảnh thực tế, FPS1280×720, video | Browser Use không có host | **Chưa kiểm chứng/chưa có video** |
| Test ẩn/reviewer độc lập | Chưa chạy được | Không khẳng định đạt |

Tái chạy: `npm ci`, `npm run verify -- --phase 3`.
Scenario mới: `node scripts/replay-scenarios.mjs .work/phase3 tests/scenarios/phase-3/manifest.json`.
Clone sạch: `npm run verify:clean -- 3`.
Không sửa log Phase1/2: chúng vẫn gắn với tag tương ứng.
