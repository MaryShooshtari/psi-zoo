# Post-5D 2D performance audit

**Subsequent investigation:** the [production-runtime follow-up](RUNTIME_PERFORMANCE_2D.md)
captures the real animation callback, preserves these optimizations, and measures
a validation-only improvement. Its matched interacting UI minute reaches
0.786 → 0.965 throughput with 380 tests passing. The results below remain the
historical measurements from the first audit, not a claim about the later build.

## Scope and environment

This is a performance-only follow-up to the accepted 5A–5D world, not Slice 5E.
No grid, timestep, boundary, propagator, potential exponential, interaction
formula, mood evolution, measurement/RNG, event ordering or terrain/reset rule
was changed. The UI controls and density mapping remain the same.

Host: Windows 10 Home 10.0.19045 x64; Intel i7-1065G7 (4 cores / 8 logical
processors), approximately 8 GB RAM. At inspection Windows reported about 1.65 GiB
free memory. Balanced power scheme; WMI reported 1298 MHz current / 1498 MHz max,
which is not reliable evidence of actual turbo or thermal limits. Normal desktop
applications and the user's existing Chrome/Vite processes were not stopped.
This is not an isolated performance laboratory.

- Node **24.20.0**, npm **11.19.0**.
- Vite **7.3.7**, React **19.3.1**, TypeScript **5.9.3**, Vitest **3.2.7**.
- Installed Windows Chrome **156.0.8078.48**; executable defaults to
  `C:/Program Files/Google/Chrome/Application/chrome.exe` (`CHROME_PATH` override).
- Flags: `--headless --disable-gpu --no-first-run --no-default-browser-check`,
  fresh temporary profile, 1280x1000 window. No virtual time or reduced physics.
- CDP CPU throttle explicitly **1x**, page brought to front; sustained runs
  report `document.visibilityState=visible`. Browser background-tab suspension
  was not the measured cause. OS thermal/power throttling was **not controlled**.
- Fixed 128x128 interior samples, dt=1/120, original domain/zero Dirichlet walls.
  Components use a fixed nonzero vertical barrier. Playback uses free terrain,
  matching the default UI; this distinction is deliberate and unchanged across
  each before/after pair.

Existing regression scripts use a **Vite development server** and historically
reported a single warmed mean. This audit instead bundles the numerical/render
harness with **production Vite/Rollup**, without minification so samples retain
function names, and serves the actual **standard minified production UI** for
React/playback checks. Node imports the same ES harness bundle. Canvas timings
are software/headless and may differ from headful/GPU machines; no headful
performance claim is made.

### What can and cannot be compared

Git history ends at `ab29498` (Slice 4); 5A–5D were present as uncommitted work.
There is **no genuine committed pre-5D revision** to benchmark in an isolated
worktree. No pre-5D source baseline was reconstructed from reports.

Instead, the entire current source was copied outside the repository **before
optimization**, preserving all user work. Controlled comparisons use that
unoptimized **5D snapshot** versus the optimized current source. The same harness,
Chrome, Node, preset, grid, dt and build settings are used, with alternating AB/BA
batch order. This comparison is not a 5C-to-5D regression analysis.

The same unoptimized source produced approximately 4–12 ms two-creature timings
across exploratory harness runs. Startup/JIT history, source/bundle configuration,
OS load/power and browser versions confound the historical reports. These
observations do not identify a single cause of the historical difference, and
must not be described as proof that entanglement caused a source regression.

## Methodology

Scripts under `scripts/performance/` introduce no runtime dependency:

- `build-audit.mjs`: builds one identical audit entry against an explicit source
  root, without writing into or checking out that source tree.
- `audit2d.ts`: deterministic component fixtures, grouped microbenchmarks,
  audit-only phase timing, and real-controller sustained playback.
- `audit-2d.mjs`: Node + Chrome/CDP instrumentation, heap/DOM counters,
  sampling profile, and actual production React UI runs.
- `compare-2d.mjs`: controlled AB/BA comparison and bitwise source-equivalence
  checks against the captured pre-optimization tree.

Significant component comparisons use **five batches per source**, each with
100 untimed warmups and 40 timed samples: **200 steady-state samples per source
per case**. Initialization, Gaussian construction, solver construction and
logging are outside timing. Cases get independent bundled module instances so
one scenario's function/type feedback does not intentionally warm another.
Median/p95 are computed from pooled samples, not a single average. Raw batch
summaries are retained. Very small components use 20/100-call groups to reduce
Chrome's approximately 0.1ms clock quantization; these are per-call group-average
latencies, not individual-call tail distributions. Cold first-step samples are
separate from steady-state samples and are not application-navigation timings.

Instrumentation never runs console logging in hot loops. Profiling is a separate
pass, not active during latency sampling. Complete-step phase timing wraps the
real potential, spatial-solver and registry-evolution methods; it does not replace
their work. Private controller accumulator reads/method wrappers exist only in
the audit harness, never as a live-state API exposed to React.

Sustained runs use **5 seconds warmup + 60 measured seconds per configuration**,
for both a controller/Canvas fixture and the actual production React UI. Five
scenes: two independent, two interacting, one Bell pair, four independent, two
disjoint pairs. The standalone coupled fixture starts from the mood preset;
the actual-UI coupled fixture enables drives/social on its independent preset.
Each fixture is kept identical across its own before/after runs; do not compare
these two differently initialized trajectories as a controlled physics contrast.

Captured counters separate physics steps, diagnostic snapshots, density copies,
draws, frame intervals, fractional accumulator remainder, discarded wall time,
heap/backing-store usage, DOM counters, DOM mutation batches, task/style/layout
durations, long tasks, and 100ms timer jitter (an event-loop responsiveness proxy).
Mutation batches are **not** a precise React reconciliation/commit timer. Exact
isolated React reconciliation is not measured with the normal production React
bundle; no profiling React runtime or new dependency was introduced.

## Findings and changes

### Already efficient: left alone

- Snapshot/inspector APIs do **not** copy full spatial buffers. `state()` and
  `spatialState()` remain defensive-copy APIs for callers that request state.
- Candidate buffers, Thomas workspaces/factorizations, ImageData, per-creature
  density arrays and terrain staging surfaces were already reused.
- Terrain overlays already have revision caching. Pair identity is text in the
  inspector, not a canvas force/connection layer; there is no separate pair-line
  rendering cost to optimize.
- Ordinary stepping consumes no measurement randomness. Independent and joint
  mood work is tiny compared with spatial evolution; it was not changed.
- Paused mode has no continuous animation loop. Explicit actions/resize can
  redraw a paused frame; these are not a steady-state bottleneck.

### Targeted changes

1. **Spatial observables, not full world/mood snapshots, are cached privately.**
   Norm/mean/width data are associated with the committed amplitudes. Successful
   steps and reset clear caches; removal deletes the removed ID; new creatures
   begin uncached. Selection, terrain edits and mood commands leave spatial
   caches valid because they do not change spatial amplitudes. Mood/ownership,
   settings, pair entropy and outcome history are still read afresh. Failed
   candidate solves do not invalidate the still-committed state's data.
2. **Centroid-only physics path.** `positionMean2D` performs the exact existing
   norm/mean loops, without the display-only centered variance pass. Full
   `positionMoments2D` reuses this calculation and also returns its already
   computed norm, removing the inspector's redundant norm scan. No summation
   order in the mean, norm or centered variance was changed.
3. **Terrain-only eligibility fast path.** Registered pair members and worlds
   with both interaction switches off copy the validated current terrain into
   their existing effective buffers. They no longer compute unused means,
   widths, Bloch views or zero drive/social terms. Eligible unpaired interactions
   use the same formulas and stable-ID summation. Terrain is still read every
   step, not cached by array identity. Omitting additions of zero can preserve
   an externally supplied terrain `-0` where the former zero additions produced
   `+0`; the absolute difference is zero and the propagator skips either zero
   phase. No nonzero potential value or amplitude arithmetic is approximated.
4. **Diagnostic cadence matches presentation cadence.** An optional controller
   presentation callback draws every animation frame, while producing full UI
   diagnostics no more often than every 100ms. Existing controller callers keep
   the default per-frame snapshot contract; the world UI opts in. Publication
   always contains a consistent snapshot and its own physical time. Play/reset,
   terrain/preset actions and errors still notify immediately. Physics and the
   existing eight-step accumulator/discard policy are unchanged. React was
   already limited to roughly 10Hz; the formerly discarded per-frame diagnostic
   computations now avoid being generated in the first place.
5. **Exact layer-major color composition.** Hoist color/index lookups outside
   the per-cell inner loop, accumulate channels in a reusable Float64 RGB scratch
   buffer, then convert to Uint8 once. `expm1`, layer order, brightness, saturation,
   identity colors and row orientation are unchanged. No LUT approximation or
   per-layer clipping. Fixed cost: **384 KiB per renderer** at 128x128, not a
   per-frame allocation.

The spatial propagator and potential exponential were **not optimized or
refactored**. Numerical ownership, validation and defensive-copy guarantees were
not weakened.

## Measurements

Machine-readable environment, source SHA-256 hashes, cold samples, five-batch
quantiles, equivalence checks and sustained results are retained in
[`performance-audit-2d/results.json`](performance-audit-2d/results.json).
The full source capture and raw working logs remain outside the repository.

### Component characterization

Unoptimized-source characterization, separate deterministic fixtures, five
batches of 40 samples after 100 warmups. Units **ms per operation**. These are
not additive phase estimates for a running world; use the instrumented world
breakdown below for that. In particular, different fixtures/JIT histories can
make a zero-potential case slower than a nonzero case in a different batch.

| Component | Chrome median / p95 | Node median / p95 |
|---|---:|---:|
| One Cayley propagation, barrier | 2.200 / 3.800 | 1.430 / 2.844 |
| One exact potential half-phase, barrier | 0.200 / 0.400 | 0.084 / 0.151 |
| Position moments | 0.300 / 0.700 | 0.237 / 0.567 |
| Norm with validation | 0.200 / 0.400 | 0.268 / 0.469 |
| Density extraction | 0.200 / 0.400 | 0.150 / 0.367 |
| Defensive 256 KiB state copy | 0.100 / 0.200 | 0.106 / 0.219 |
| Reused candidate-buffer copy | 0.005 / 0.015 | 0.008 / 0.011 |
| Independent mood evolution, grouped calls | <0.001 / 0.001 | <0.001 / 0.002 |
| Pair evolution, grouped calls | 0.001 / 0.002 | 0.001 / 0.002 |
| Pair diagnostics, grouped calls | 0.015 / 0.035 | 0.015 / 0.035 |
| Local mood inspector view, grouped calls | 0.002 / 0.004 | 0.001 / 0.004 |
| Two effective potentials, precomputed sources | 0.400 / 0.800 | 0.412 / 0.789 |
| Canvas putImageData, CPU submission | <0.1 / 0.1 | — |
| Canvas drawImage, CPU submission | <0.1 / <0.1 | — |
| Cached terrain overlay | <0.1 / 0.1 | — |
| Changed terrain overlay | 0.300 / 0.400 | — |

For context, first cold calls in that Chrome characterization were 10.8ms for
Cayley, 6.2ms for moments, 3.2ms for density extraction and 5.7ms for two-potential
composition. Construction was outside these intervals; first-use JIT and solver
factorization were not. Cold samples are retained separately, and **no cold-start
speedup is claimed**.

A separate 1kHz sampled profile of 300 coupled steps plus 150 snapshots places
about **71%** of sampled self time in spatial step/line routines (including
inlined phase/validation work), **14%** in position moments, **7%** in effective
potentials, and **2.3%** in GC. GC is observable but not dominant.
This identifies spatial numerical work and repeated spatial observables—not
four-amplitude entanglement arithmetic—as the substantial costs. The snapshot
cost is scans/observables, **not a hidden full wavefunction copy**.

### Controlled source comparison

Same process/environment, alternating AB/BA batches, 200 samples per source.
**Median / p95, ms.** Before means captured unoptimized 5D, not historical 5C.

| Complete world step | Chrome before | Chrome after | Node before | Node after |
|---|---:|---:|---:|---:|
| Two independent, interactions off | 5.7 / 11.4 | 4.8 / 8.8 | 3.853 / 5.819 | 2.888 / 4.112 |
| Two interacting | 6.3 / 10.6 | 5.5 / 8.7 | 4.358 / 6.112 | 4.206 / 5.738 |
| One Bell pair | 4.8 / 8.4 | 4.0 / 7.6 | 4.425 / 5.641 | 3.194 / 4.485 |
| Four independent | 10.7 / 14.7 | 8.1 / 11.6 | 9.072 / 10.529 | 7.280 / 8.653 |
| Two disjoint pairs | 9.8 / 12.0 | 8.0 / 12.1 | 8.657 / 10.123 | 7.320 / 8.780 |
| One pair + two interacting independents | 13.5 / 22.5 | 11.9 / 19.2 | 10.900 / 23.158 | 8.728 / 10.603 |

| Chrome diagnostics/render operation | Before | After |
|---|---:|---:|
| Repeated same-state two-creature snapshot | 1.0 / 1.3 | <0.1 / 0.1 |
| Repeated same-state Bell snapshot | 1.2 / 1.7 | <0.1 / 0.1 |
| Repeated interacting potential preparation | 1.2 / 1.9 | 0.6 / 1.0 |
| Repeated Bell potential preparation | 1.0 / 1.2 | 0.1 / 0.3 |
| Two-layer color mapping | 2.2 / 2.8 | 2.1 / 2.8 |
| Four-layer color mapping | 4.9 / 6.9 | 4.2 / 5.8 |
| Complete two-interacting density draw | 3.2 / 5.0 | 2.9 / 4.0 |
| Complete Bell density draw | 2.7 / 3.3 | 2.6 / 3.2 |
| Complete four-independent density draw | 6.0 / 8.0 | 5.5 / 7.0 |
| Complete two-pair density draw | 6.0 / 12.5 | 6.2 / 8.2 |

The repeated-snapshot/preparation rows intentionally measure reads of an
unchanged committed revision, so cache hits are expected. They do **not** imply
that a first snapshot after advancing is free. Sustained measurements below
include fresh-state snapshots. Rendering gains are modest/mixed: four-layer color
mapping improved about 14% median and 16% p95, but the two-pair complete-draw median
was slightly worse. There is no universal rendering-speedup claim.

### Instrumented actual step phases

Separate timing pass, 100 warmups then five consecutive 40-step batches, with
method wrappers active. Median / p95 ms in the **optimized** source:

| World | Complete | Potential including sources | Spatial solves | Mood phase |
|---|---:|---:|---:|---:|
| Two interacting | 6.0 / 7.6 | 1.1 / 1.6 | 4.8 / 6.3 | <0.1 / 0.1 |
| Bell pair | 4.1 / 5.1 | 0.1 / 0.2 | 3.9 / 4.9 | <0.1 / 0.1 |
| Four independent | 8.2 / 10.2 | 0.1 / 0.2 | 8.0 / 9.9 | <0.1 / 0.1 |

For 200 complete steps, the wrappers observed exactly **200 potential phases,
200 registry advances, and 400/800 spatial solves** for two/four creatures.
There was no duplicated spatial solve or registry advance. Medians of components
need not sum to the median total. This pass is not AB/BA-controlled: its coupled
total was 5.6ms before and 6.0ms after, illustrating why a single phase pass must
not be used to claim a coupled speedup. The controlled five-batch comparison and
whole-playback measurements are the acceptance evidence.

### Sustained controller + Canvas runs

Free terrain, exact controller state/time, 5s warmup + 60s measurement per scene.
FPS counts draw callbacks, not an external display-presentation measurement.

| Scene | Before physical/wall | After physical/wall | Before → after FPS | After step median / p95 ms |
|---|---:|---:|---:|---:|
| Two independent | 0.754 | 0.984 | 13.2 → 41.6 | 4.9 / 8.2 |
| Two interacting | 0.599 | 0.609 | 9.0 → 9.1 | 12.3 / 14.7 |
| Bell pair | 0.763 | 0.955 | 11.4 → 14.7 | 7.4 / 9.3 |
| Four independent | 0.382 | 0.489 | 5.7 → 7.3 | 14.8 / 17.0 |
| Two disjoint pairs | 0.381 | 0.495 | 5.7 → 7.4 | 14.6 / 16.8 |

After optimization, two-independent playback made 522 snapshots for 2503 draws,
not one snapshot per draw. Fresh snapshot median was 0.9ms. Under the slow coupled
case, 503 snapshots accompanied 550 draws: at roughly 9 FPS the 100ms presentation
cap saves little. This is why reducing diagnostics does not solve the coupled
world's numerical CPU limit.

Accumulator remainder stayed below one dt, **but that is not evidence of keeping
up**: the existing controller discards elapsed wall time beyond eight dt per
callback. Discarded seconds during each optimized 60s run were respectively
**0.91, 23.53, 2.68, 30.68, 30.38**. The cap/dt were not changed. Four creatures
remain far from real time, and the coupled two-creature case is still overloaded.

### Actual production React UI

Same five scenes, same 5s warmup + 60s measured windows before/after. Progress
comes from the displayed snapshot's own physical timestamp, so it can lag the
live canvas by up to the presentation interval; it is not claimed to be exact
private-controller instrumentation.

| Scene | Before physical/wall | After physical/wall | Before → after FPS | After physical seconds / wall seconds |
|---|---:|---:|---:|---:|
| Two independent | 0.751 | 0.936 | 11.3 → 14.1 | 56.158 / 60.018 |
| Two interacting | 0.580 | 0.593 | 8.7 → 8.9 | 35.600 / 60.039 |
| Bell pair | 0.723 | 0.926 | 10.9 → 13.9 | 55.592 / 60.019 |
| Four independent | 0.382 | 0.478 | 5.7 → 7.2 | 28.733 / 60.089 |
| Two disjoint pairs | 0.382 | 0.477 | 5.7 → 7.2 | 28.666 / 60.038 |

Optimized UI p95 rAF callback durations were **75.0, 115.4, 75.6, 148.1, 148.6ms**.
P95 100ms-timer jitter was **114.3, 137.4, 117.2, 198.1, 197.2ms**. Controls remain
functional in browser regressions, but these figures do **not** justify claiming
uniformly responsive playback. Long tasks remain common. More frames can also
produce a larger count of >50ms tasks despite lower per-task latency.

DOM mutation batches were roughly 7–8.5/s, not 120/s. In each 60s optimized UI
window, layout consumed only 0.215–0.286s and measured style recalculation was
below reported resolution, while script execution consumed about 57–58s.
This does not isolate React reconciliation, but it does not identify layout or
excessive React publication as the dominant budget. Numerical/Canvas work on the
main thread remains the limitation.

**Target evaluation:** controlled two-creature median physics times are below
6ms, but independent/interacting p95 values (8.8/8.7ms) miss 8.33ms. Actual coupled
production playback reaches only **0.593 physical seconds per wall second**.
Independent/Bell UI throughput improves substantially but still loses about
6–7% against wall time in these runs. The complete primary real-time target is
**not achieved** on this environment. Isolated microbenchmarks must not be used
to claim otherwise. Four-creature real-time performance is not claimed.

### Live-UI memory and allocation pressure

The throughput runs' instrumentation originally cleared the previous scene's
counter arrays *after* reading the initial heap baseline. Their negative heap
deltas are biased and are **not evidence of leak freedom**. The harness now
clears them before that baseline for future runs. The stored report labels those
original heap values accordingly; timing/physics results are unaffected.

To obtain meaningful current-source retention data, a **separate actual-UI pass**
used no rAF timing arrays, mutation counters, or jitter timers: 5s warmup, then
forced-GC marks at nominal 0/30/60 seconds while the world remained live.
Rounded **KiB of used JS heap**:

| Scene | Start | 30s | 60s | Typed/backing storage, approximately |
|---|---:|---:|---:|---:|
| Two independent | 3211 | 3450 | 3350 | 3866 KiB, stable |
| Two interacting | 3790 | 3247 | 2988 | 3866 KiB, stable |
| Bell pair | 2968 | 4965 | 4964 | 3867 KiB, stable |
| Four independent | 3350 | 3449 | 3385 | 5943 KiB, stable |
| Two disjoint pairs | 3502 | 3495 | 3280 | 5943 KiB, stable |

Within each scene DOM node counts stayed constant. Event-listener counts stayed
constant except the first scene's 184 → 196 → 196, which plateaued. Backing-store
changes were only small string/bookkeeping-scale differences, not growing spatial
or rendering buffers. The Bell case gained about **1.95 MiB** of retained JS heap
by 30s and then plateaued at 60s. This is not enough evidence to label a leak or
to attribute the increase conclusively to JIT/browser caches. It also means the
audit cannot claim a strict no-growth or multi-hour memory guarantee.

There was no observed steadily increasing numerical-buffer or DOM trend in this
bounded run. Fixed renderer scratch costs and transient metadata allocations are
explicit; state-copy APIs remain defensive. A longer heap-retainer/slope study is
appropriate if release acceptance requires stronger memory guarantees.

## Correctness and regression results

- **378 tests in 33 files pass**, including all 375 pre-audit tests unchanged.
  The three additions cover presentation cadence without skipped physics,
  cache invalidation/defensive ownership and exact original scalar pixel mapping.
- Core Gaussian/norm/static-H/convergence, terrain continuity, 5C order and
  feedback behavior, 5D norm/entropy/measurement/no-signalling/replay and all
  1D/Observer tests remain green. The unchanged 5C coupled full-state refinement
  errors and measured norm drift remain the same.
- Against the captured source, six deterministic scenarios run 100 steps each,
  including a mid-run terrain edit. Full complex spatial arrays at checkpoints
  and the endpoint, diagnostic snapshots, seeded measurements, release and reset
  compare exactly. One through four rendered density layers have identical image
  bytes. The random/saturated scalar-reference pixel test also passes.
- Source hashes verify the 2D propagator, grid, Gaussian initialization,
  potential/interaction formulas and independent/joint qubit engines are
  unchanged. The only numerical-core edit is the equivalent observable helper
  and its existing norm result exposure.
- `npm run typecheck`, `npm run build`, DOM-free world compilation and explicit
  `scripts/performance/tsconfig.json` checking all pass.
- Real Chrome regressions: **30 world**, **21 Gaussian/terrain**, **22 1D creature**,
  **14 Observer** checks pass, including overlay alignment, colors, reset,
  selection, pair status, terrain tools, mode switching and loop disposal.
  Completed suites report no uncaught runtime or console errors.
- The first world-browser attempt timed out at its initial 1D time >0.1 wait
  (`Timed out waiting for browser condition`, no browser errors). The harness
  had waited only for inspector mount, not Play availability. It now waits for
  an enabled Play button before clicking; the repeat passed all 30 checks.

## Remaining limits and next step

These are measured improvements to diagnostics, disabled-feedback work and some
render cases, **not a claim that all performance problems are solved**. Sustained
coupled throughput barely improves; four creatures remain slow. Isolated Node,
Chrome component and real React UI timings differ substantially, so summing
microbenchmarks or blaming the two-qubit engine would be misleading.

Next, repeat real production-rAF sampling on an otherwise idle machine with a
stable power/thermal condition and a headful comparison. Focus on the unchanged
Cayley/phase/validation path in the actual application, including runtime/JIT
history, before making a larger source-regression claim. An exact within-step
phasor reuse/solver-local optimization would require its own evidence and
bitwise-equivalence checks; it was not attempted here. If the main-thread budget
still cannot support coupled playback, propose an **explicitly approved Worker
spatial-solve design** with synchronous world commit. A Worker can improve UI
responsiveness but does not automatically fix numerical throughput on a
CPU-constrained machine. No Worker/GPU design or implementation decision is made
by this audit. Do not reduce resolution, dt, feedback cadence or physics to meet
a benchmark, and do not start Slice 5E as part of this work.

## Reproduction and limitations

Baseline verification before changes: `npm run test`, `npm run typecheck`,
`npm run build`, and DOM-free world compilation all passed (375 tests).

For a new controlled comparison, first capture the current source outside the
repository **before** making an optimization. The captured root must contain
`packages/`. Do not use `git reset`, stash/discard user work, or pretend that an
unavailable historical revision exists.

```sh
npm run build
node --expose-gc scripts/performance/audit-2d.mjs --out D:/Temp/psi-audit-before --seconds 60
# Make a targeted optimization; rebuild the production UI.
npm run build
node --expose-gc scripts/performance/compare-2d.mjs --before C:/captured-source --out D:/Temp/psi-comparison
node --expose-gc scripts/performance/audit-2d.mjs --out D:/Temp/psi-audit-after --skip-components --seconds 60
node --expose-gc scripts/performance/audit-2d.mjs --out D:/Temp/psi-audit-memory --memory-only --seconds 60

npm run test
npm run typecheck
npm run build
npx tsc --project packages/web/tsconfig.world2d.json
npx tsc --project scripts/performance/tsconfig.json
node scripts/world-2d-browser-check.mjs
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs --no-screenshots
```

Run timing commands sequentially, not concurrently with tests/builds or other
audits. `--components-only` skips sustained runs; `--skip-components` runs only
controller/UI playback. `--memory-only` runs the separate live-UI retention pass
without accumulating timing arrays. `--source-root` selects an explicitly captured source
root; `--ui-root` selects its built production UI. A source comparison requires
that external capture; Git alone cannot recreate this task's uncommitted baseline.

One minute per scene is a bounded sustained test, **not proof of multi-hour
memory stability** or exhaustive device acceptance. Forced GC measures retention,
not allocation rate. Positive uncollected heap deltas are not called leaks.
Timing arrays, JIT code and normal browser caches also affect retained heap.
Canvas `putImageData`/`drawImage` component timings measure CPU submission, not
an isolated end-to-end compositor/GPU presentation fence. Whole-playback tests
include the actual browser work.

Harness bring-up encountered `SyntaxError: await is only valid in async functions`
(fixed by promise-based module import), dynamic-import query routing failure
(fixed by stripping query strings for static serving), and a `chrome-error://`
module import after a blank 404 page (fixed by serving real HTML and waiting for
readiness). A 240-second tool timeout interrupted an exploratory profile after
its component tables were written. Those exploratory results are not used as a
controlled source comparison. Final controlled comparison and before/after playback runs completed without
uncaught runtime errors; failed exploratory runs were excluded from acceptance.
