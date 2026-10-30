# Slice 5E.1 — visual foundation and fixed viewport

## Status and scope

Implemented and automatically validated **for review**. This is only 5E.1, not
completion of Slice 5E. Human visual, device, screen-reader and sustained-use
acceptance remains separate. No 5E.2 projection/morph, 5E.3 faces/personality or
navigation redesign, or 5E.4 guide/contextual notebook was implemented.

The app now opens in the existing **2D creature world**, paused, with its existing
two-creature mood-drive initial conditions. This phase does not change the roster
or replace the existing world preset. Standalone **1D simulations** and the
**2D Gaussian demo** remain persistent top-left entry points. These are separate
simulations, NOT projected views: switching disposes the previous controller and
starts the destination afresh, as before. The interface explicitly says so.

## Try it

```sh
npm run dev
```

Open the Vite URL shown in the terminal.

1. Use **Play**, **Pause**, and **Reset evolution** in the bottom bar. Physical
   time and the selected creature remain visible. Reset preserves terrain under
   the existing current-roster reset rules.
2. Use the **Creature** dropdown to select A/B without measurement. It invokes the
   same world selection command as the complete inspector in the menu.
3. Open **Menu** at top right, or **Help & settings** at bottom right. The panel
   floats above the unchanged playground and scrolls internally. Close with its
   Close button, Escape, or a click outside. Tab/Shift-Tab remain in the open
   panel; Escape restores the corresponding trigger's focus.
4. In Terrain, select **Barrier (+)**, **Well (−)**, or **Eraser**; close the menu
   and drag on the square field. Reopen the menu for brush/overlay controls,
   Clear terrain, and diagnostics. Terrain changes H, not the wavefunction.
5. Scroll through the menu for existing creature management, interaction settings,
   world presets, mood pairing/measurement/release, complete inspection, model
   notes and grid information. Controls retain their previous semantics.
6. Use the top-left entries for Gaussian 2D presets or standalone 1D experiments.
   In 1D, the Observer notebook remains under **Why did it jump?** in settings.

The small-screen Help icon has an explicit accessible name even when its text
label is visually hidden. The complete museum notebook and contextual help are
intentionally deferred; this phase's help opens existing explanations/settings.

## Architecture and presentation decisions

- `App.tsx` owns only the existing simulation-choice state and the shell header.
  The default changes from standalone 1D to the existing 2D world. No inactive
  world is kept running and no hidden warmup simulation is created.
- `TerrariumShell.tsx` supplies a reusable `PlaybackBar` and `SettingsPopover`.
  Opening settings changes local React presentation state only. Closed controls
  stay mounted under `hidden`, retaining their values and existing controller
  connections. No simulation instance is created by the popover.
- The floating nonmodal dialog takes focus on opening, contains keyboard focus,
  supports Escape/outside-click dismissal and restores a visible trigger when
  needed. An outside click on another focusable control retains its native focus.
  The existing native Observer notebook manages its own dialog focus/Escape.
- Existing control components are grouped conservatively with headings and
  fieldsets. The full eight-section/navigation redesign belongs to 5E.3.
- `style.css` defines sky/panel/pastel/ink/focus/shadow tokens. Flex layout uses
  `100vh` then `100dvh`, shrinking content with `min-height: 0`, safe-area insets,
  stationary document overflow and internal menu scrolling. Modern CSS size
  container units constrain the 2D canvas to the smaller available dimension.
- The physical 2D domain remains square and centered. No canvas border/padding
  changes its drawing/pointer rectangle. The shared physical/sample-center
  transform, y orientation and potential mapping are unchanged. Empty space
  around the square is presentation background, not additional physics space.
- 2D renderers retain `f(rho)=1-exp(-rho/0.08)`, reusable density/RGB/ImageData
  buffers and staging canvases. Only the sky/cloud palette changes. There is no
  per-creature peak normalization, amplitude modification or extra spatial scan.
  Palette invariants are read outside pixel loops. The pixel helpers retain
  their legacy background defaults for existing callers; the UI explicitly
  supplies the terrarium palette.
- Pastel identity swatches accompany readable ink-colored creature labels.
  Positive/negative terrain remains warm/blue with explicit +/- tool labels.
  The legacy 1D scientific plot retains its existing density/terrain styling.
- No new runtime dependency, Worker, WebGL/WebGPU, package/version change, backend
  or Lean change. No commit, push or discard of unrelated work.

## Physics and state preservation

All 20 TypeScript source files under `packages/sim-core/src` and these seven web
files were compared byte-for-byte against the external pre-5E.1 source capture:

- `simulation2d.ts`
- `world/world2d.ts`
- `world/moodRegistry2d.ts`
- `world/worldPresets2d.ts`
- `random.ts`
- `terrainBrush.ts`
- `terrainPresets.ts`

**All 27 match exactly.** Hashes are in the compact performance record below.
No spatial propagator, grid, boundary, timestep, potential evolution, mean-field
formula, committed-step ordering, qubit/joint state, normalization, Born
probability, seeded randomness or no-signalling safeguard changed.

The previously validated 128×128 interior grid on [-10,10]² remains
`dx=dy=20/129`, `dt=1/120`, hbar=m=1, with zero unstored Dirichlet boundaries.
Existing whole-step playback and approximately 100ms diagnostics publication
cadence remain intact. Opening/closing settings does not pause, reset, step or
measure the world. Selection invokes the existing nonmeasurement command.
Numerical validation remains in the 5A–5D reports; this redesign introduces no
new quantum-mechanical claim.

## Executed validation

| Check | Result |
| --- | --- |
| `npm run test` | **384 tests / 35 files pass** |
| `npm run typecheck` | pass |
| `npm run build` | pass |
| DOM-free world compile | pass |
| Performance entry TypeScript check | pass |
| New shell Chrome automation | **36 checks pass** |
| Existing world Chrome automation | **30 checks pass** |
| Existing Gaussian/terrain Chrome automation | **21 checks pass** |
| Existing 1D creature Chrome automation | **22 checks pass** |
| Existing Observer Chrome automation | **14 checks pass** |
| `git diff --check` | pass; existing LF/CRLF conversion warnings only |

All completed browser suites report no uncaught runtime/console errors.
Observer screenshots were not overwritten (`--no-screenshots`). A temporary shell
screenshot was inspected, not presented as proof of numerical physics.

Shell checks cover **1920×1080, 1440×900, 1366×768, 1280×720 and 1024×600**:
no document overflow, square field, visible primary controls, no playground
movement or paused-canvas change on menu opening, internal scrolling, visible
focus, Shift-Tab wrapping, Escape and focus restoration. Further checks exercise
native Enter/Space opening, Help focus, outside dismissal, playback with settings
open, deterministic rendered reset, native terrain click/drag, nonmeasurement
selection, all three simulations and reduced-motion settings. A **512×300 CSS
viewport at DPR 2** tests layout equivalent to doubling zoom on 1024×600; this
is not a substitute for actual browser-zoom/device acceptance.

Existing numerical tests include norm/energy/Gaussian/convergence, terrain
continuity, world feedback/order, joint moods, measurement, seeded replay and
no-signalling. Four new tests cover shell/default structure, mounted-but-hidden
controls, retained standalone 1D functionality and recoloring without state
mutation. The existing notebook markup test now targets `Simulation1D` directly
instead of assuming the application's default is 1D.

Browser harness adaptations explicitly select standalone 1D for legacy tests,
read preserved advanced diagnostic content using `textContent`, open settings
before keyboard observation and derive plot height from the actual canvas rather
than the obsolete fixed 340px size. The new shell suite separately checks visible
controls/focus, so hidden diagnostic checks do not stand in for accessibility.

### Issues found and fixed during validation

- The first unit run had **379 passing / 1 failing** because the notebook test
  still rendered the old default. Targeting the retained standalone component
  restores the intended coverage; its observation assertions remain intact.
- An early shell check caught focus returning to body for a programmatic opening;
  opening now records the actual initiating button.
- An expanded outside-click check caught browser pointer focus handling undoing
  restoration. Dismissal now runs at click time and preserves native outside
  control focus. Native keyboard checks also needed CDP Enter text to generate
  the browser's default activation; no synthetic app-only handler was added.
- The first updated Observer suite timed out focusing a now-hidden observation
  button. It now opens settings before the native keyboard action; all 14 checks
  subsequently pass.

## Production performance

Raw data remain outside the repository under `D:/Temp/psi-5e1-*`. Compact results,
environment, source hashes and reproducible dataset locations are retained in
[`performance-audit-2d/terrarium-shell-results.json`](performance-audit-2d/terrarium-shell-results.json).

Method: same installed production Vite/React and Chrome 156, Windows
10/i7-1065G7, headless, GPU disabled, 1280×1000 browser window, CPU throttle 1×,
128×128 grid and dt=1/120. Each production run has five seconds of playback warmup.
The interacting fixture loads the independent world preset then enables both
mood drives and social interactions on free terrain, exactly as in the preceding
runtime audit. Plain mode wraps rAF only; no world/solver method wrappers or
trace sampling run during acceptance. UI square size naturally differs from the
previous dashboard. User applications and OS power settings were not changed.

The original external source capture is
`C:/Users/marys/AppData/Local/Temp/psi-5e1-before`; it contains the original UI and
the same physics/controller source. The harness supports either original 1D
startup or the new default world. There is no audit hook in the shipped build.

### Investigation and unfavorable evidence

An initial unpaired new-shell minute reached only **0.687** physical/wall time.
A subsequent three-batch alternating source comparison measured **0.961 before /
0.822 after**. Those results were treated as a potential regression, not accepted.
Deep-wrapper and renderer-isolation exploratory runs were much slower/variable
for both sources and did not isolate a reliable cause. Matching startup history
through 1D improved results, but this is not a shipped workaround.

Palette indexing/deltas were then hoisted out of per-pixel loops. Subsequent
three-batch plain comparison reached **0.927 before / 0.931 after**, and a separate
minute reached **0.934 / 0.998**. The final release-source checks below were run
after the remaining focus/label fixes, sequentially without concurrent tests or
builds. Because host/runtime history varies, these experiments do **not** prove
that palette hoisting alone explains the initial slowdown or a universal speedup.

### Final release-source acceptance

| Metric | Previous UI | 5E.1 shell |
| --- | ---: | ---: |
| Three alternating 10s windows: total physical/wall | 0.990 | 1.000 |
| Same windows: callback median / p95 | 10.9 / 13.7 ms | 11.0 / 12.1 ms |
| Continuous minute: physical / wall seconds | 57.217 / 60.038 | **59.550 / 60.027** |
| Continuous minute: physical/wall ratio | 0.953 | **0.992** |
| Continuous minute: callback median / p95 | 13.0 / 64.3 ms | **16.4 / 51.3 ms** |
| Continuous minute: completed steps | 6866 | **7146** |
| Continuous minute: discarded wall seconds | 2.801 | **0.485** |
| Continuous minute: rendered callbacks per second | 40.14 | **39.62** |

The new source's three short windows each reach about 1.000. Values slightly
above one are measurement-window/step-boundary effects, not a changed timestep.
The final minute meets the prior >=0.9 target and is comparable to the accepted
historical 0.965 result; no substantial throughput regression is observed in the
final matched acceptance. It is **not** an FPS improvement claim: the final
minute's callback median is higher and FPS slightly lower than its control.
Long callbacks and some discarded wall time remain. No four-creature, mobile,
thermal or multi-hour guarantee follows from this bounded two-creature test.

Presentation retains existing reusable buffers and adds no full complex-state
copies or additional numerical loop. The ordinary production JS bundle is about
344.73 kB / 107.16 kB gzip.
The CSS is about 7.11 kB / 2.34 kB gzip. No dependencies were added.

## Reproduction

Run performance commands sequentially, not alongside tests/builds or another
browser performance run. A source comparison requires a genuine pre-edit capture;
Git's committed Slice 4 revision cannot reconstruct the uncommitted 5A–5D source.

```sh
npm run test
npm run typecheck
npm run build
npx tsc --project packages/web/tsconfig.world2d.json
npx tsc --project scripts/performance/tsconfig.json
node scripts/terrarium-shell-browser-check.mjs --screenshot
node scripts/world-2d-browser-check.mjs
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs --no-screenshots

node scripts/performance/runtime-2d.mjs --out D:/Temp/psi-shell-ab-new --compare-before C:/Users/marys/AppData/Local/Temp/psi-5e1-before --scene two-interacting --mode plain --batches 3 --seconds 10
node scripts/performance/runtime-2d.mjs --out D:/Temp/psi-shell-long-new --compare-before C:/Users/marys/AppData/Local/Temp/psi-5e1-before --scene two-interacting --mode plain --batches 1 --seconds 60
node scripts/performance/summarize-runtime-2d.mjs D:/Temp/psi-shell-long-new
```

The optional audit-only `--startup-1d` flag equalizes legacy navigation history for
investigation; it was **not** used in final acceptance. `CHROME_PATH` can override
the installed Windows Chrome path. No browser package installation is required.

## Remaining manual checks and deliberate limits

- Human visual/contrast/color-vision review, assistive-technology review and
  actual high browser zoom remain required; automated geometry is not human
  accessibility acceptance.
- Review touch/pen capture, older browsers without modern CSS container units,
  safe-area devices, long sessions and other hardware. Desktop/laptop modern
  browsers are the primary target. The tiny-viewport fallback prioritizes
  controls/internal scrolling over decorative layout.
- Terrain painting remains a pointer action. Existing keyboard-accessible tools,
  presets, selection and physics commands remain; no new keyboard terrain editor
  was invented in this presentation phase.
- The 1D switch still opens standalone physics and resets the active experiment.
  This is the explicitly required 5E.1 exception to the eventual unified design.
- No mirror morph, marginal density, faces, pair connectors, full navigation
  redesign, first-visit guide or new notebook content. Those belong to later
  independently reviewed phases. Existing two-creature defaults are retained.

**Next step: review and accept 5E.1. Do not start 5E.2 automatically.**
