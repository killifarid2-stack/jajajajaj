# WAB-TKD — Final Production Additions — 2026-09-14

## Added in this delivery

### Design Studio
- Persistent project snapshots for Draft edits, with Restore.
- Reusable Design Templates with scope: Global, Tournament, Competition Mode, Gender, Age, Weight, Tournament + Weight.
- Template application keeps animation identity and published version isolation.
- Template and snapshot management UI is available directly in Design Studio.
- Existing native renderer, layer tree, keyframes, multi-select, group/parent-child, safe area, import/export and live draft channel remain intact.

### Dynamic data
- Added bindings for Best Team, Best Club, Best Referee, Fair Play, Top Scorer and Top Hitter.
- Medal/Trophy image bindings now prefer live award asset fields when supplied and fall back to the project's real local assets.

### AI Designer
- Added advanced local commands for:
  - Red left / Blue right.
  - Scale by percentage.
  - Gold frame + glow.
  - Winner right.
  - Timed show/hide using seconds.
  - Unified font.
  - Native 1920×1080 canvas enforcement.
- Added optional secure Supabase Edge Function `design-ai`.
- External AI secrets are server-side only; browser code never contains the provider API key.
- The external AI contract is design-only and explicitly forbids match score, timer, winner, player database and tournament-state mutation.

### Safety
- Draft/Published separation remains enforced.
- Published version history remains separate from project snapshots.
- Design actions operate on design state only.

## Validation
- ZIP source integrity verified.
- Full npm dependency installation could not complete within the available execution window, so a full Vite build/Electron package and real two-device E2E run are still external validation steps.
- No production claim is made for those environment-dependent tests.
