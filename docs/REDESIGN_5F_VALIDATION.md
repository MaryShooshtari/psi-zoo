# Slice 5F — visual and UX polish

> Historical first-pass record. The owner requested a correction to the
> letterboxed square domain and permanent UI clutter. The current rectangular
> physical domain, bottom-right help and transient feedback supersede the layout
> below: see [latest validation](PLAYGROUND_DOMAIN_VALIDATION.md).

Implemented directly on the pre-existing dirty spatial-action integration. No
solver, world implementation, grid, timestep, measurement, RNG, dependency or
package-version changes were made in this pass. Existing numerical/world changes
in `git diff` predate this task and were preserved.

## Experience and contracts

- Twilight/pastel P1 palette and cloud-as-body F1 styling retained. Faces now use
  soft ink eyes with tiny highlights, translucent cheeks, and small mood-dependent
  mouths. There is no head disc, halo or ring. Only the selected simple Creature
  A/B/etc. identifier is labeled on-canvas; existing significant-density anchoring,
  split-cloud fallback, blink policy and actual-target measurement reactions remain.
- Fixed brightness is now `sqrt(rho/(rho + 0.012))`, where rho is actual simulated
  density. Zero remains exactly zero; no frame maximum, floor, rescaling,
  probability normalization or invented tail is used. Brightness is deliberately
  nonlinear, **not probability mass**. Bilinear Canvas2D image scaling softens
  the sampled image; it is not a higher-resolution solver or an extra blur pass.
- Independent RGB layers use bounded screen compositing instead of clipping an
  additive sum to white. Overlap remains colored, not coherent interference.
  Selected-only density inspection remains available. Terrain stays a separately
  scaled signed overlay with adjustable visibility/opacity. Phase mode and extra
  probability contours were not added; density remains the intuitive display.
- Both views occupy one full available presentation rectangle. The unchanged
  square physical domain is aspect-preservingly letterboxed in the twilight sky,
  with a faint square boundary distinguishing it from non-simulated gutters.
  The 1D view is still the actual dy-weighted marginal of the same 2D world.
  No remount/reset or numerical state conversion occurs on view switching.
- Contextual science is a separate compact dialog, not a menu shortcut. Its
  primary explanation follows the active tool, with other current-state topics
  collapsed into short expandable explanations. An open help dialog polls only
  the already-published scene reference every 500 ms and does not pause playback.
  Gaussian measurement versus exact projection, self-interference versus separate
  clouds, terrain/tunnelling caveats and mood versus spatial entanglement remain
  explicit. Detailed derivations stay in the science notebook.
- Menu home has five intention-based entries: Creatures, Terrain, Experiments,
  Appearance, Science notebook. Explicit creature actions live in Experiments;
  Draw terrain is in Terrain. Old mounted controls are grouped rather than
  reimplemented; diagnostics/legacy experiments are collapsed in the notebook.
  The existing focus trap, Back, Escape, handoff, action executor, canvas arming,
  ordered targets, stale guards, persistent receipts and redraw recovery remain.
- Existing bottom Clear terrain is retained and validated, not replaced by a
  competing command. It clears only editable external potential and preserves
  spatial/mood states, time and registered entanglement. Reset remains separate.
- Help is in the minimal header rather than a separate layout row. Controls are
  compact on short screens; the selected summary yields space there (inspection
  remains in the menu). No page scrolling or permanent sidebar is introduced.

## Files touched by this pass

- UI: `packages/web/src/{App,Gaussian2DDemo,Museum,TerrariumShell}.tsx`, `style.css`
- Context: `packages/web/src/museumScience.ts`
- Rendering: `packages/web/src/render/{density2d,creatures2d,creatureDecoration}.ts`
- Tests: `TerrariumShell.test.tsx`, `creatureDesign.test.ts`, `museum.test.tsx`,
  `simulation2d.test.ts`, `performance2d.test.ts`, `render/creatures2d.test.ts`
- Browser checks: `scripts/projection-browser-check.mjs`,
  `scripts/spatial-actions-browser-cases.mjs`, new `scripts/redesign-browser-cases.mjs`
- Records: this file, `ROADMAP.md`, `SESSION_HANDOFF.md`

## Validation

- `npm run test`: **564 tests passed, 46 files**.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `node scripts/spatial-actions-browser-check.mjs`: **91 checks passed** through
  the mounted production app, including measurements, RNG separation, stale
  guards, ordered targets, ambiguous hits, publication failure/redraw, reaction
  lifecycle, guide restrictions and DPR1/2 viewport/backing-store checks.
- `node scripts/projection-browser-check.mjs --redesign --screenshot`:
  **38 checks passed**, including projection/playback continuity, five-section
  navigation, Tab wrap/Escape focus, live compact science, Clear terrain with a
  real registered Bell pair, and identical rectangles/no scrolling at desktop,
  390×844 and 512×300. Screenshots inspected using the image tool; corrections
  made for overlapping header controls, white-clipped cloud overlap and excessive
  short-screen playback height.
- Initial unit runs exposed obsolete ellipse-count and additive-pixel assertions;
  updated to independently check only small facial features and bounded blending.
  Initial browser runs exposed the phone header collision, which was corrected.
  One projection rerun hit the existing strict immediate pixel assertion
  `Edited signed terrain projects from canonical shared V with unchanged psi/time`;
  a full subsequent rerun passed. This remains a browser-readiness flake to watch,
  not evidence of a numerical failure, and is not hidden by weakening the assertion.

Evidence is external and generated by each runner in a fresh
`C:/Users/marys/AppData/Local/Temp/psi-projection-check-*` directory. Latest paths
and any final rerun results are recorded in the session handoff.

## Remaining acceptance

No expensive sustained-runtime matrix was rerun. Its earlier CDP connection
closure is not a physics failure. No four-creature smoothness or universal FPS
claim is made; the larger presentation backing surface may increase compositor
cost even though numerical rendering still samples the unchanged 128×128 grid
and reuses buffers. Real touch/pen, AT, hardware zoom/DPR, subjective visual
acceptance and historical sustained-performance gates remain open. Older browser
suites with eight-section/square-viewport assumptions need migration before a
complete historical suite sweep; only the two named suites were run for this pass.
No commit, push, reset, install or destructive cleanup was performed.
