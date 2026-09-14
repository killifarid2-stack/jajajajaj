# WAB-TKD — Design Studio Final Hardening — 2026-09-13

## تم تنفيذ هذه الدفعة

### 1) Draft / Publish isolation
- Draft edits are now stored in the Studio draft store only.
- Public Display / Broadcast runtime reads the last **published** version only.
- Publish writes a separate published snapshot per `animationId` and broadcasts only that snapshot.
- Existing published designs from the legacy store are migrated automatically on first read.
- Restore Original affects the current Studio draft; it is not public until Publish.

### 2) Timeline / Keyframes
- Existing time-local keyframe model remains active.
- Later edits are stored at the current time and do not mutate the base pose.
- Added keyframe duplicate and copy/paste controls.
- Timeline keyframes can be moved horizontally.
- Graph Editor now exposes visual property curves for position/scale/rotation/opacity/effect values.
- Supported easing remains Linear, Ease In, Ease Out, Ease In/Out, Smooth, Back, Bounce and Step.

### 3) Motion Path
- Motion paths now support cubic Bezier control handles (`cp1` / `cp2`).
- Path points and Bezier handles are draggable on the Canvas.
- Added Draw Path mode.
- Added Reverse / Loop / Rotate-with-path controls.
- Runtime evaluates the same path model, including Bezier interpolation and optional path rotation.

### 4) Canvas editing
- Multi-selection drag now moves selected layers together.
- Existing Resize / Rotate / Move handles remain active.
- Added distribution controls in addition to alignment.
- Safe Area / Title Safe / Action Safe guides are visible in the 1920×1080 editor.

### 5) Localization
- Design Studio root now uses real `dir="rtl"` for Arabic and `dir="ltr"` for English/French.
- Existing AR / EN / FR labels remain in the Studio.
- Public output is not switched to a draft language change accidentally.

### 6) Existing animations
The existing animation IDs remain unchanged:
- Team Call
- Player Call
- Player Change
- Winner
- KO
- Doctor
- Kyeshi
- WOO-SE-GIROK
- Match Result

No replacement animation was introduced by this hardening pass.

## State protection
Public runtime now rejects draft/original design updates. This prevents a saved-but-unpublished Studio edit from replacing the currently published public version.

## Verification
- `tsc --noEmit --pretty false` — **PASS** in the available environment.
- Full Vite/Electron build could not be executed because project dependencies were not installed in the uploaded archive; an attempted dependency installation timed out.
- Existing test suite was not falsely reported as executed for the same dependency limitation.

## Important production behavior
The intended production flow is now:

`OPEN EXISTING ANIMATION → FREEZE → EDIT → PREVIEW IN STUDIO → SAVE DRAFT → PUBLISH → PUBLIC DISPLAY`

Public Display never consumes an unpublished draft.
