# Session handoff — Slice 5F visual / UX redesign

## Latest correction — genuine rectangular world and minimal controls

The owner explicitly requested correcting the prior letterboxed-square design.
See [domain, UI, numerical tests, performance and evidence](PLAYGROUND_DOMAIN_VALIDATION.md).

- Main terrarium geometry is now chosen once from actual playground dimensions:
  approximately 128² samples redistributed between axes, **unchanged dx=dy=20/129
  and dt=1/120**, four zero Dirichlet edges. Desktop tested at 200×82 interior
  samples, x≈±15.58/y≈±6.43, >98% real physical viewport occupancy. This widens
  the box and shortens its height, not image stretching or coarsening the grid.
- Existing rectangular solver/terrain/detector/marginal support required no core
  or world implementation changes. Actual propagation, painting and measurement
  beyond the old x=10 edge were checked. Ordinary resize/view changes preserve
  the same geometry and states; significant later aspect changes may letterbox
  that existing world instead of resampling it. Fresh mounts fit their aspect.
- Top: view switch, centered title, Menu. Bottom: essential controls/compact
  selected summary/help at right. Removed permanent instruction and chart text,
  duplicate chart legends and empty terrain guide. Notebook/help retain science.
- Success confirmations dismiss after 3.2 seconds without a layout strip. Full
  stable live announcements, latest action details in Experiments, persistent
  error/recovery and armed-instruction semantics remain. No competing executor.
- **569 tests / 47 files passed**, typecheck/build, separate world and performance
  TypeScript checks passed. Browser suites: **25 playground**, **91 spatial-action**,
  **38 redesign/projection** checks passed. Actual screenshots inspected, including
  receipt expiry (no strip/scrollbar), desktop, phone and short landscape.
- Bounded Node two-creature medians: old square 3.734 ms/step; near-equal-cell
  rectangle 3.569; larger 300×128 option 8.350. Chose the bounded grid rather than
  >2× solver cost. Final five-second browser probe: 4.925 physical / 5.074 wall
  seconds, 146 rAF callbacks; earlier probe 4.992/5.032 and 290 callbacks. This
  variation is retained, not a sustained smoothness pass or four-creature claim.
- Final focused evidence:
  `C:/Users/marys/AppData/Local/Temp/psi-projection-check-ij3Nvr/`.
  Cost probe: `C:/Users/marys/AppData/Local/Temp/psi-domain-cost-KI0jiW/`.
  Logs: `/tmp/psi-playground-test-final.log`, `/tmp/psi-playground-browser-final.log`,
  `/tmp/psi-playground-actions.log`, `/tmp/psi-playground-projection.log`.
- All unrelated dirty work preserved. No dependency, solver/RNG, commit, push,
  destructive cleanup or full runtime matrix changes. Prior CDP closure is still
  not evidence of a physics failure. Real-device/AT and sustained acceptance open.

Next: human/device review of the corrected playground; do not auto-run a full
matrix or commit the dirty tree.

## Prior owner-authorized 5F pass (superseded square-domain layout)

The user explicitly authorized Slice 5F implementation after the historical stop
record below. This pass refines the existing mounted implementation and preserves
all unrelated dirty work. See [5F files, design and validation](REDESIGN_5F_VALIDATION.md).

- Full available shared view rectangle, unchanged square physical domain with a
  faint boundary; 1D remains its true marginal, without state loss on switching.
- Brighter fixed nonlinear density transfer, bounded colored overlap, softened
  image sampling, expressive ink eyes/cheeks/mouths without head rings or names.
- Five menu sections, existing action executor and Clear terrain retained;
  separate compact science updates while open and reflects active interactions.
- Root tests: **564 passed / 46 files**; typecheck and production build passed.
- Mounted spatial-action browser suite: **91 passed**. Focused redesign +
  projection browser suite: **38 passed**. No runtime/console errors in successful
  runs. Actual desktop, phone, short-landscape, menu and science screenshots were
  inspected; white overlap and header collisions corrected. Short-screen playback
  was further compacted after screenshot inspection.
- One strict projection pixel/state assertion flaked on an earlier rerun; a full
  subsequent rerun passed without weakening it. Older full historical browser
  suites have not all been migrated to five-section/full-viewport assumptions.
- No solver/world/RNG implementation changes by this pass, no dependencies,
  commits, push, reset or expensive runtime matrix. The CDP closure and prior
  sustained-performance gates below remain unresolved, not physics failures.
- Final focused rerun after the short-screen CSS adjustment: **38 passed**;
  final typecheck/build also passed. Final short-screen screenshot inspected.
  Evidence: `C:/Users/marys/AppData/Local/Temp/psi-projection-check-ZBpvjb/`.
  Earlier desktop/phone/menu/science inspections:
  `C:/Users/marys/AppData/Local/Temp/psi-projection-check-uWPfcL/`.
  Root logs: `/tmp/psi-redesign-test.log`, `/tmp/psi-redesign-browser-final.log`,
  `/tmp/psi-redesign-actions.log` in the executing bash environment.

Next: human visual/device acceptance of 5F and bounded performance profiling if
requested; do not automatically restart the runtime matrix or commit this dirty tree.

---

# Historical spatial-action integration stop record

Checkpoint: 2026-11-01. The owner requested a stop and status report, then this
handoff update. Do not automatically resume the runtime matrix, implement another
slice, launch an independent re-audit, commit, push or deploy.

## Current slice and working tree

- `docs/ROADMAP.md` still names **Slice 5E.4 — museum onboarding, science and
  notebook (implemented for review)** as current. Its historical sustained
  performance and human acceptance gates remain open.
- The subsequently owner-authorized spatial-action plan is in
  `../design_draft.md`. Baseline/core/world steps 1–3 were implemented separately;
  steps 4–8 were prepared and tested together, then **activated in the normal
  application** after isolated integration checks. Do not confuse older
  “unmounted/preactivation” records with the current mounted state.
- Step 9 acceptance work is **partially complete**: the entire action latency and
  bounded retention audit passed; the sustained-runtime matrix did not finish.
  The overall slice is not declared accepted or finished.
- HEAD: `7035c8260d1f58e486cc3025df84f0a28a2fb2dc`.
- Before this handoff edit: **32 modified tracked files, 16 untracked files,
  nothing staged**. This includes earlier approved work, not just the latest
  interaction integration. This status-only turn changes only this handoff,
  making 33 modified tracked files if nothing else changes.
- Preserve the dirty tree. No commit, push, deployment, dependency/version change
  or new independent audit was performed. The historical independent **Not ready**
  verdict in `../implementation_readiness_report.md` has not been replaced by a
  new review of this implementation.

## What changed and is working in automated checks

### Numerical/world work already present

- Pure `packages/sim-core/src/measurement2d.ts`, additive exports, independent
  reference and numerical/failure/continuation tests implement finite-resolution
  x-only or joint x/y position measurement without mutating the input state.
- `packages/web/src/world/world2d.ts` owns a separate seeded spatial RNG, staged
  committed/rejected/failed results, target-only cache invalidation and bounded
  chronological spatial/mood receipts. Legacy mood randomness remains separate.

### Integrated interaction and UI work

- `creatureActionState2d.ts` and tests: one current interaction owner, captured
  world/roster/view/epoch tokens, immutable native drafts, explicit canvas arming,
  ordered Bell targets, strict ambiguity rejection and gesture cancellation.
  Secondary pointers cannot steal a gesture; dragging beyond six pixels cancels
  a click even if the pointer returns to its starting point.
- `Gaussian2DDemo.tsx`, `CreatureActions2D.tsx` and
  `EntanglementControls2D.tsx`: mounted native/pointer actions share one guarded
  executor. Stale, guide-blocked and morphing requests cannot mutate physics.
  Successful commits are not replayed on publication faults; recovery redraws
  the committed result without another draw, solver step or forced pause.
- `TerrariumShell.tsx`, `WorldControls2D.tsx`, `App.tsx` and `style.css`:
  action-first menu, explicit native targets, terrain canvas handoff, persistent
  result/live region, focus handoff, equal largest-fitting square views with DPR
  backing sizes, one persistent bottom science trigger, and advanced spatial
  diagnostics. Redundant main creature selection/help controls were removed.
- Guide correction: Draw terrain is available at guide step 3 while creature
  actions remain disabled. Added a unit regression. Terrain shortcut navigation
  preserves the chosen brush; Reset clears brush interaction state.
- `render/creatureDecoration.ts`: receipt-triggered surprise affects only actual
  measured targets, lasts at most 600 ms, expires while paused and clears on
  invalidation, reduced motion or disabled decorations/animation. No new physics
  randomness or per-frame React animation loop.
- `museumScience.ts`, `Museum.tsx` and museum notebook chapters: chronological
  action descriptions and correct initial-Gaussian provenance after a time-zero
  measurement. Ordinary time-zero commands cannot restore that provenance.
- Owner-selected **F1 + P1** appearance remains applied: twilight/pastel colors,
  direct dark-ink faces, corner selection brackets and neutral Creature A/B/etc.
  labels. Density transfer function, grid, solver, dt and scheduling were not
  changed for visual or performance results.

### Audit/tooling work

- Added `scripts/spatial-actions-browser-check.mjs` and
  `scripts/spatial-actions-browser-cases.mjs`.
- Extended `scripts/projection-browser-check.mjs` for external candidate builds,
  production-only audit instrumentation/faults, external evidence output and
  latency runs. Fixed its query-string root-URL serving bug.
- Added `scripts/performance/spatial-measurement.mjs`: full separate-population
  cold/warm latency, trace and retained-heap audit through the actual detector and
  shared UI executor, with no shipped feature switch.
- Extended `scripts/performance/runtime-2d.mjs` and its summarizer for one-creature
  scenes, fixed-size comparisons in either view, an explicit finite action script,
  and paired window/uncertainty reporting. Fixed-script cost includes the actual
  view changes necessary to alternate x and x/y; it is not detector-only cost.
- Updated legacy browser fixtures for explicit Bell targets, changed navigation,
  reset brush behavior and settled layout before image assertions.
- Some old source comments/dated design checkpoints still say “unmounted”; these
  are documentation debt, not the actual current wiring.

## Checks actually run

These are inspected saved results, not newly rerun tests during the status-only
turn. The final root checks ran before the long runtime matrix:

| Check | Recorded result |
| --- | --- |
| `npm run test` | **563 passed across 46 files** |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `tsc -p packages/web/tsconfig.world2d.json` | Passed |
| `tsc -p scripts/performance/tsconfig.json` | Passed |
| New isolated production action browser suite | **91 checks passed before activation** |
| New mounted production action browser suite | **91 checks passed** |
| Latest world browser rerun | **31 checks passed**, no runtime/console errors |
| Latest creature-design/projection rerun | **52 checks passed**, no runtime/console errors |

The serial legacy run also passed projection, museum, shell, Gaussian/terrain 2D,
1D creature and Observer suites. World and creature-design initially failed and
later passed after fixture/readiness corrections. The old `regression-results.json`
contains the **initial**, not final, statuses; use the individual rerun logs.
There has not been another complete final mounted/legacy browser sweep after all
subsequent audit-harness edits. The Bell setup was intermittently missing during
an earlier rerun; a readiness checkpoint was added, but one later pass is not a
proof of universal flake elimination.

The status inspection also scanned normal production
`packages/web/dist/assets/index-Cr5_1SP_.js`: no matches for `__spatialCoreSample`,
`__projectionCheck`, `__psiRuntime`, `__spatialFault`, `__actions` or `__controller`.
Audit registrations are build-time transforms, not normal-app hooks.

## Action latency, retention and trace results

Authoritative output: `D:/Temp/psi-spatial-latency-2026-11-01-run2/`.

- All **36 conditions** (x/xy × 1/2/4 creatures × paused/running × sigma
  0.2/0.4/2) were evaluated separately: **180 fresh-document first-action samples,
  720 warmups and 7,200 measured warmed actions**. No pooled pass/fail.
- Both warm p95 budgets passed in every condition. Worst per-condition core p95:
  **4.7 ms** against ≤16.7 ms. Worst synchronous handler p95: **21.3 ms** against
  <50 ms. Maximum measured warm handler: **26.6 ms**; cold handler: **46.2 ms**.
- Double-rAF render-opportunity proxy p95 reached **157.1 ms** for four creatures
  playing. This is not exact visible-pixel latency and not a smoothness pass.
- Five 200-action memory batches after warmup had unchanged whole-browser counts:
  481 Float64Array objects, 92 candidate-size backing stores, 37,369,856 backing
  bytes and eight spatial-receipt objects. These include prior browser contexts;
  saved strong root paths show current and prior global/native-context handles.
  Treat this as **no observed incremental per-action growth over 1,000 actions**,
  not universal app memory usage or a proof against all leaks.
- Reaction stress: at most one 600 ms timer; paused expiry cleared it.
- Ten-second play/hover/no-action trace: **zero detector calls**.
- Seventeen traced long tasks overlapped action-containing tasks. Investigation
  of every one found its large `V8.InvokeApiInterruptCallbacks` block ended
  **before** the synchronous action marker; marked spans were 2.129–7.684 ms.
  See `long-task-investigation.json`, `long-task-summary.json` and
  `long-task-attribution.json`; do not equate task overlap with detector causality.

The first latency attempt failed with a readiness timeout: the audit server
served query-string root navigation incorrectly. That harness bug was fixed;
its adverse log/output were retained. The second complete run passed.

## What failed or remains unverified

The 24-command / 150-window sustained-runtime plan **stopped on command 2**:

1. **Completed:** matched 480×480 no-action 2D, one interacting creature, five
   alternating before/after pairs of 60-second windows after five-second warmups.
   Median physical/wall throughput: **1.000061 before / 0.999877 after**;
   ratio of medians **0.999816**, above the 0.95 relative gate. Matched geometry
   passed. Descriptive paired-resampling percentile interval:
   **[0.999039, 1.000154]**. This result applies only to this condition.
2. **Incomplete:** matched 2D two-creature comparison saved five individual
   windows, then exited with **`Error: CDP socket closed: Runtime.evaluate`** at
   `scripts/performance/runtime-2d.mjs:76:1691` in that run. No full paired result
   exists for this condition. The cause of the connection closure is unknown;
   this is not evidence of a failed numerical assertion.

The orchestrator stopped rather than falling back or silently reducing samples.
Four-creature source pairs, 1D source pairs, full current action/no-action runtime
comparisons and full largest-fitting-square runtime characterization were **not
completed**. Short runtime pilots passed, but do not substitute for these windows.
There is no completed matrix-wide `MATRIX.json` or `VERDICT.json`.

Other open gates: real screen reader/AT, touch/pen, actual browser zoom/high-DPR
hardware, target devices, overall human visual/accessibility approval and
historical absolute sustained-performance acceptance. Diffuse-face contrast on
twilight and crowded overlap labels remain limitations. No new independent
review was run. The comprehensive final integration validation report and final
cumulative hash/diff acceptance record have not been assembled.

## Scientific boundaries

- Units: hbar = m = 1; 128×128 interior samples on [-10,10] per axis,
  dx = dy = 20/129, zero Dirichlet boundaries, dt = 1/120 and the existing
  eight-step scheduling policy. No smaller grid/dt change, probability floor,
  invented tail brightness or display peak normalization was used to pass checks.
- Gaussian localization is a **finite-resolution POVM update**, not an exact
  orthogonal position projection. Reported probabilities are discrete outcome
  masses. Underflow failure retains actual consumed draws but not a false success.
- X-only measurement acts on the full 2D state, reports no y and may condition a
  correlated y marginal. Neither a face nor a historical receipt is a current
  particle position.
- Independent spatial densities do not automatically interfere. Entanglement is
  in registered joint mood states, not a joint spatial solver. Feedback is an
  approximate mean-field model; no many-body energy conservation is claimed.
- Norm preservation is numerical floating-point evidence for the stated discrete
  model, not continuum accuracy. Sharp widths and repeated localization do not
  establish continuum resolution; measurement does not conserve energy in general.
- Companion Lean results concern exact mathematical models, not formal
  verification of TypeScript, the Gaussian POVM or the browser.

## Evidence locations

- Integration source backup, activation manifest, candidate and logs:
  `D:/Temp/psi-spatial-integration-2026-11-01/`.
  Key logs: `final-test.log`, `final-typecheck.log`, `final-build.log`,
  `final-world-typecheck.log`, `final-performance-typecheck.log`,
  `mounted-actions.log`, `regression-world-2d-2.log`,
  `regression-creature-design-4.log`, `latency-run-1.log`, `latency-run-2.log`,
  `runtime-matrix.log`.
- Runtime completed/partial raw data and exact commands:
  `D:/Temp/psi-spatial-runtime-2026-11-01/` (`commands.json`, `progress.json`,
  per-condition logs and `sessions.json`; one-creature `summary.json`).
  Orchestrator: integration directory `run-runtime-matrix.mjs`.
- Full latency: `D:/Temp/psi-spatial-latency-2026-11-01-run2/`
  (`LATENCY.md`, `verdict.json`, raw populations, traces, heap snapshots,
  `memory.json`, `memory-world-retainers.json`, source hashes and environment).
- Appearance selection/evidence: `D:/Temp/psi-spatial-appearance-2026-10-31/`.
- Original actual-filesystem baseline:
  `D:/Temp/psi-spatial-baseline-2026-10-31T12-50-10-561Z/`.

These are local external artifacts, not committed repository content. Retain them;
this handoff is not a substitute for their raw results.

## Exactly one sensible next action

**Diagnose the closed CDP connection with a bounded two-creature matched-source
2D runtime reproduction, preserving the existing logs, rather than restarting the
long matrix.** This is a recommendation only: the current request is to stop and
report, not authorization to execute that follow-up now.
