# Đảo Đèn Lồng — AI harness

- Read `docs/specs/` and `game.contract.json` before changing gameplay.
- The user's lab-board text is authoritative; do not invent later tickets.
- Keep gameplay in `src/core/`, independent of DOM, GPU and wall-clock time.
- Use fixed 60 Hz simulation and the seeded PRNG for gameplay randomness.
- Commands: `npm ci`, `npm run build`, `npm start`, `npm test`.
- Verification: `npm run verify -- --phase 1` saves actual test output and machine metadata.
- Never edit generated evidence to make a failure pass. A failed check must exit nonzero.
- Preserve event names, tick semantics, camera transform and inclusive XZ radii.
- Scenario setup must not emit events or award points.
- Do not mark a phase complete or create its tag before its ticket is implemented and checked.
- Keep previous tests unless a received ticket explicitly replaces their rule; document why.
- Phase 2: score per_mote is awarded on deposit, never on pickup. See phase-2 spec for superseded rules.
- Preserve fixed tick order, pause clock separation, 3D pulse, 15-tick push and 30-tick safe-zone evacuation.
- Every new Phase 2 feature needs a headless scenario; do not substitute FPS claims with simulation throughput.
- Do not fabricate screenshots, videos, token usage, external reviews or release status.
- No credentials, `.env` files, dependency folders or private user data in Git.
