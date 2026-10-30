# Slice 5E.3 — creature identities, controls and interaction

## Status / phase boundary

Implemented for review. **408 tests and 174 browser checks pass**, including
numerical regressions, exact-state/RNG comparisons, native selection, terrain,
friendship lifecycle, navigation and keyboard focus checks. The bounded incremental
Canvas draw-cost budget passes. **Whole-app/sustained throughput acceptance remains
open**: an early whole-source comparison was unfavorable, despite near-real-time
final same-build on/off windows. All results are retained below and in the JSON.

Stop before **5E.4**. No onboarding, expanded notebook content pipeline, new
measurement operation, solver, world architecture or physics policy was added.

## What the user sees

- Four supported terrarium IDs have stable pastel identities: **Mochi · A**,
  **Pip · B**, **Lumi · C**, **Nori · D**. Names/colors come from IDs, not RNG,
  rendering order, selection or quantum state. Other IDs have deterministic pool
  fallbacks and remain explicitly labeled with their actual ID.
- Probability density still supplies the entire cloud body: shape, position,
  spread, overlap and intensity. The original `1-exp(-rho/0.08)` heatmap and
  common linear marginal scale are unchanged. Independent densities are not
  coherently added amplitudes; overlapping creatures do not thereby interfere.
- Tiny translucent face badges, names, expectation/mixed-mood indicators and a
  selection halo sit over the density. A compact persistent inspector shows
  selected name/ID/color, a simple mood description and registered pair status.
- Registered mood pairs have a static dotted identity connection and ∞ badges.
  **No traveling dots, pulses, communication animation or force arrows.** Pairing
  means genuine joint mood ownership, not spatial entanglement. A measured product
  pair remains linked until explicit release, matching the existing safeguards.
- **Display → Show creature decorations** hides all overlays for raw-density
  inspection. Selection still works. The independent animation checkbox disables
  blinking; reduced motion also disables it regardless of that checkbox.

“Bright”, “Quiet” and “Balanced” are informal visual descriptions of the sign/range
of the published Z expectation, not sampled eigenstates, energies, happiness
measurements or new behavior parameters. “Mixed mood” uses the already-published
local purity. Numerical Bloch/purity/entropy values remain available.

## Density anchoring and inexpensive animation

`render/creatureDecoration.ts` borrows the body renderers' existing density
buffers. It never receives or writes live spatial or mood amplitudes.

1. At most once per 100 ms for a stable mean index (or when the published mean,
   dimensionality or roster changes), find the density maximum.
2. Use the nearest mean grid sample only if it has at least **35% of that peak**.
   Otherwise use the first global maximum, a deterministic significant mode. A
   split cloud therefore does not place its face at a nearly empty midpoint.
3. Suppress an empty/negligible distribution (`peak < 1e-8`), a cached anchor that
   has fallen below 20% of its cached peak, or a badge that would be clipped at
   the field edge. Do not move the density or push the face off-density to fit.
4. Use physical interior grid coordinates. In the marginal, place the face near
   the same curve's actual height on the shared scale, including selected-only
   views with a hidden creature setting the common maximum.

The chosen point is a **UI annotation**, not a sampled position or tracked quantum
particle. It cannot recover missing phase/y information from a marginal.

Blinking changes only tiny eye strokes: a deterministic ID offset in a 4.2 s
wall-clock cycle, closed for 140 ms. Small eye/mouth changes use published mood
expectations/purity. Paused faces are open/static; reduced motion disables blinks.
No random draw, extra rAF/timer, React animation update or amplitude copy is used.
The existing physics/display loop draws the overlay. Current-state safety checks
suppress a stale cached anchor before its next scheduled rescan.

Body renderers expose borrowed **display-density** layers (not psi) and the
marginal's already-computed scale. Roster-sized maps/objects are small; there is
**no grid-sized allocation per animation frame** for faces. Density buffers remain
reused. Detailed spatial moments come from the accepted publication cadence and
caches, not a new per-frame `getSnapshot` or full-state query.

## Selection: explicit, deterministic, not a measurement

Primary click/tap in 2D View/inspect or in a 1D hill selects an ID. A terrain tool
continues to paint in 2D instead; projected view cannot paint because y is absent.

- Use visible creatures' local **density contributions**, not blended RGB pixels.
- Largest local contribution wins. Near-exact ties (32 machine epsilons times the
  peak scale) retain current selection; otherwise lexical ID breaks the tie.
- Ignore contributions below `max(1e-8, 0.01 * largest visible peak)`.
- In 1D require the pointer to lie inside a visible hill's fill, not in the signed
  terrain band or above the hill. Physical x sampling follows the existing grid.
- Ignore drags over 6 CSS pixels, nonprimary buttons/pointers and morph-time
  interactions. Leaving/cancelling/blur clears unfinished selection gestures,
  preventing an outside drag from reusing an earlier canvas press.
- The persistent native selector and **Creatures** radio list select every ID,
  including diffuse/hidden clouds. Clicking a cloud is never required.

Selection invokes only the existing `world.select(id)` and a UI refresh. It never
measures, samples, normalizes, resets, advances time or edits terrain. The retained
standalone 1D Observer's explicitly chosen Observe mode is still its original
measurement demonstration; it is not the main terrarium selection interaction.

## One internally navigated popover

All scenes use the same top-right anchored popover and these eight sections:

| Section | Contents |
| --- | --- |
| Simulation | Current model/experiment, playback/reset semantics; legacy reset-applied momentum |
| Terrain | Existing brush/radius/strength, clear, paint/erase help |
| Creatures | Named list, bounded add/remove and release-before-deletion safeguards; legacy inspector |
| Moods & friendships | Existing live mean-field controls, Bell preparation, paired measurements/release, detailed pair/outcome disclosures; legacy coupling |
| Experiments | World/preset commands, Create a barrier, Build a well, Watch scattering; legacy observation controls |
| Display | Overlay/opacity, selected-only density, decoration/blink toggles; legacy plot conventions |
| Physics notebook | Existing model/projection/units/measurement notes; retained Observer notebook trigger |
| Advanced | Spatial/norm/Bloch/purity/entropy/pair/outcome diagnostics and Advanced / Legacy experiment entrypoints |

The home navigation hides while a section is active; Back returns to it. Children
stay mounted, preserving partner, basis, pending controls and display settings.
There is one settings panel, not competing sidebars. The original Observer viewer
remains a native modal dialog within its legacy notebook route; its existing
pause/focus/Escape behavior is retained, not replaced by a new notebook system.

Keyboard navigation focuses the new section heading. Back restores its originating
navigation button. Tab/Shift-Tab are contained; Escape/Close restore the opening
Menu/Help control. Native outside dismissal and notebook focus handling remain.
The popup scrolls internally and never resizes the playground. Required desktop
sizes and the existing 200%-equivalent small CSS viewport checks pass.

**Create a barrier / Build a well** choose the existing tool and navigate to Terrain;
they do not stamp anything until the user paints. **Watch scattering** explicitly
opens the retained standalone Gaussian barrier experiment, paused at t=0, replacing
the current experiment. Its preset/solver are unchanged; press Play to watch. It
is not a main view switch or a calibrated transmission experiment. Repeated Watch
commands deliberately create a fresh experiment. Main 1D/2D switching still keeps
one controller and current state.

**Make an entangled friendship** is the existing explicitly global Bell preparation
(`Entangle moods` remains the technical button text). **Observe a mood** groups
the existing paired Z/X measurement commands. No independent-mood or spatial
measurement operation was invented. Measure & Release retains its exact existing
global semantics. Outcome history remains under its clearly named disclosure;
selected last outcome, purity, pair identity and entropy also appear in Advanced.
X outcomes are labeled +/−; Z outcomes use 0/1.

## Diagnostics and state preservation

The default screen is compact. Advanced retains every existing norm, position
mean, width, Bloch vector, mood norm, force, direction/frequency and social-potential
readout. Selected purity, entropy, pair ID and last recorded outcome are added
from existing published snapshots/events. Full joint probabilities, session events
and technical notes remain accessible in Moods & friendships. Gaussian and
standalone 1D energies remain where meaningful; no conserved mean-field many-body
energy or new expensive per-frame energy calculation is claimed.

**37 protected source files are byte-identical** to the pre-5E.3 snapshot at
`C:/Users/marys/AppData/Local/Temp/psi-5e3-before`. This covers all existing sim-core
and world implementation sources, both numerical playback controllers, RNG,
terrain/input helpers, legacy plot, view-transition class, notebook and legacy
inspector. Package metadata is unchanged. Source hashes are recorded in
[the compact evidence](performance-audit-2d/creature-design-results.json).

No numerical formulas, qubit/joint state math, probabilities, seeded streams,
normalization, force rules, pairing ownership, feedback suspension, timestep,
128×128 grid, `dx=dy=20/129`, x,y ∈ [−10,10], zero Dirichlet boundaries, `hbar=m=1`,
or committed-step/stall policy changed. No dependencies, package versions, Lean
files, commits or pushes changed. Pre-existing uncommitted/untracked work remains.

## Checks actually run

| Check | Result |
| --- | --- |
| `npm run test` | **408 / 39 files** (399 previous + 9 new tests) |
| `npm run typecheck` | Both workspaces pass |
| `npm run build` | Pass; JS ~365.74 kB / 113.72 kB gzip, CSS 9.01 / 2.83 kB gzip |
| DOM-free world TypeScript project | Pass |
| Performance-entry TypeScript project | Pass |
| Creature-design + projection production browser audit | **51** (28 new + 23 projection) |
| Shell browser audit | **36** |
| Existing world / Gaussian-terrain / legacy creature / Observer audits | **30 / 21 / 22 / 14** |

All 174 browser checks pass without runtime/console errors. Temporary audit hooks
are injected only into test builds; they do not ship in `dist`.

Tests cover ID/color/name stability, split/empty/stale anchors, cached scans,
blink/reduced-motion behavior, local-density/tie selection and exact spatial/mood
state plus subsequent seeded outcomes after repeated decoration. Native production
checks cover both canvases, list keyboard selection, outside-drag cancellation,
all navigation/focus paths, real shared terrain painting, pair registration,
measurement/release/deletion/re-addition, diagnostics, four IDs and real scattering
entry. With animations enabled and both views changing, a reference world takes
exactly the committed number of steps and matches every spatial/mood component.

Existing raw-density pixel regressions explicitly disable optional decorations:
selection halos and changed mood faces are meant to alter UI pixels, not psi.
These assertions are not weakened into screenshot-as-physics claims; the new
state/RNG tests separately verify the overlays. Legacy keyboard scripts navigate
to the newly named section before focusing observation/notebook controls.

During implementation, private playback-field access and Canvas closure narrowing
were corrected in UI code. A browser-audit variable collision and an assumption
about which selected ID was removed/re-added were corrected. No numerical tolerance
or physics invariant was relaxed to make a check pass.

## Rendering and whole-app performance — separate conclusions

Final 600×600 synchronous Canvas probes, 50 measured samples per arm after warmup:

| Creatures | Bare density/terrain median / p95 | With decoration median / p95 |
| --- | ---: | ---: |
| 2 | 5.0 / 6.8 ms | 5.0 / 7.0 ms |
| 4 | 7.0 / 9.1 ms | 7.1 / 9.0 ms |

The incremental median budget is **<2 ms** for up to four creatures (about 12% of
a nominal 16.7 ms visual frame, not a budget for the solver too). It passes. The
probe holds the same frozen state/terrain and changes only the overlay call;
state and RNG counts are checked. These are synchronous Canvas API timings,
**not compositor time, sustained FPS, or physical/wall throughput**. Do not infer
an improvement from small median/p95 reversals.

Production-loop probes retain the interacting two-creature scene, free terrain,
plain rAF audit, five-second warmup, unchanged grid/dt and 1280×1000 viewport.
Chrome 156 headless/GPU disabled on Windows 10 / i7-1065G7. Runs are sequential,
not concurrent with test/build workloads. All five datasets and raw paths remain
in the evidence JSON:

- Early whole-source alternating comparison: **0.79311 before / 0.59937 after**
  physical/wall throughput — unfavorable, not a cleared regression gate.
- Reloading same-source off/on: **0.57260 / 0.39020**, with a large first-window
  effect and slow later off controls too.
- Earlier same-page serial off/on: **0.72736 / 0.69148**.
- Later serial off/on: **0.97792 / 0.99947**.
- Final-source serial ABBA, two 10 s windows per arm: **0.97503 off / 0.99857 on**.

The serial comparison isolates optional decorations within one build/page; it
cannot establish parity of every UI change with 5E.2. The bounded final run is
near real time, but host/JIT/order variability does **not prove every adverse
difference environmental**. The prior sustained-performance issue and the adverse
whole-source result remain open. No Worker, weakened validation, smaller grid,
larger dt, altered scheduler or hidden physics pause was introduced to improve
numbers. Further controlled target-device work is required before claiming
sustained acceptance or a universal speed improvement.

## Edited files / reproduce / review

New UI/tests: `creatureIdentity.ts`, `CreatureSummary2D.tsx`, `TerrainShortcuts.tsx`,
`creatureDesign.test.ts`, `render/creatureDecoration.ts` under `packages/web/src/`.
Integration: `App.tsx`, `Gaussian2DDemo.tsx`, `TerrariumShell.tsx` and its test,
`TerrainControls.tsx`, `WorldControls2D.tsx`, `EntanglementControls2D.tsx`, `style.css`,
`render/creatures2d.ts`, `render/projection1d.ts`.

New audit entry/cases: `scripts/creature-design-browser-check.mjs` and
`creature-design-browser-cases.mjs`. Existing projection, shell, world, creature
and Observer scripts are adapted to optional overlays/section navigation.
`scripts/performance/runtime-2d.mjs` adds on/off/ABBA decoration controls. Docs:
this report, its evidence JSON, README and roadmap. Other working-tree files
predate the phase.

```sh
npm run dev
npm run test
npm run typecheck
npm run build
npx tsc --project packages/web/tsconfig.world2d.json
npx tsc --project scripts/performance/tsconfig.json
node scripts/creature-design-browser-check.mjs --screenshot
node scripts/terrarium-shell-browser-check.mjs
node scripts/world-2d-browser-check.mjs
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs --no-screenshots
```

Use Menu to choose a section, Back to return, Escape to close. Click a cloud/hill
or use the native list. Choose Terrain to paint; Moods & friendships to prepare,
measure or release a real pair. Advanced preserves complete technical inspection
and legacy entrypoints. The retained Observer's interaction/measurement controls
are under Experiments, and its notebook trigger under Physics notebook.

The design audit serves its own temporary production build and prints paths to
its screenshot and JSON. Other browser audits use the existing dev-server
workflow. Set `CHROME_PATH` when needed. Performance example, run separately:

```sh
node scripts/performance/runtime-2d.mjs --out D:/Temp/my-5e3-abba --scene two-interacting --mode plain --serial --decorations alternating --batches 4 --seconds 10
node scripts/performance/runtime-2d.mjs --out D:/Temp/my-5e3-source-ab --compare-before C:/Users/marys/AppData/Local/Temp/psi-5e3-before --scene two-interacting --mode plain --batches 3 --seconds 10
node scripts/performance/summarize-runtime-2d.mjs D:/Temp/my-5e3-source-ab
```

The generic runtime summarizer groups source versions, not decoration settings;
use per-session `decorations` in `sessions.json` for on/off groups (as the compact
evidence does).

Still manual: actual screen-reader/zoom/touch/pen/device acceptance, color vision,
overlap/face/connection readability, blink feel, safe-area/older-browser support,
long-running hardware behavior and resolution of the whole-app performance gate.
No claim of exhaustive accessibility certification. Review 5E.3 before authorizing
anything in 5E.4.
