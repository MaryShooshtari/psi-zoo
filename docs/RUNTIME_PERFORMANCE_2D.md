# Production 2D runtime follow-up (before 5E)

This follows [the post-5D audit](PERFORMANCE_AUDIT_2D.md). It investigates the
**actual production React application's** animation callback, not a replacement
physics loop. No Slice 5E features, Worker, timestep/resolution changes or
propagator changes are included.

## Method and observability limits

`node scripts/performance/runtime-2d.mjs` builds the ordinary minified production
application with two **audit-only** registration calls inserted by a Vite plugin:
one for the existing controller and one for the existing terrain renderer.
These calls never enter the shipped source/build. The plugin supplies source
maps. The audit uses the existing locked Vite/Rollup source-map tooling; no
package installation or dependency/version change is required.

- **plain:** wrap the real browser rAF callback, read controller counters and
  timestamps, and retain one small record per callback. No world/solver method
  replacement. This is the acceptance throughput/frame measurement.
- **timed:** additionally time the real `world.step` method. Its extra method
  wrapper can change JIT/call-site behavior, so this is a separate before/after
  experiment, not assumed to have zero observer effect.
- **deep:** time nested world potential/mean/diagnostic methods, spatial solves,
  potential phases, density extraction, whole drawing, terrain drawing, and the
  synchronous publication callback. Timings are **inclusive**, not additive.
- **trace:** deep mode plus a Chrome Performance trace with 1kHz V8 CPU sampling,
  browser tasks/layout/paint/GC/events and one trusted CDP mouse move per second.
  `--shallow` removes the nested method wrappers from a trace. Mouse moves use
  View mode, never edit terrain or trigger measurement. The final trace targets
  the center of the actual world canvas; the exploratory shallow trace used a
  generic page position and is only a queue-latency proxy.

The source capture before the change is outside the repository. `--compare-before`
builds that source and current source against the **same installed dependencies**
and alternates AB/BA order. Each measured batch has five seconds of playback
warmup. No console logging, source construction or JSON serialization occurs
inside the measured callback. Results are serialized after the measurement.

Same host as the previous audit: Windows 10.0.19045, i7-1065G7, 4C/8T, about 8 GB
RAM; Node 24.20.0, Vite 7.3.7, Chrome 156.0.8078.48. Headless, GPU disabled,
1280×1000 window, CPU throttle 1×. The user’s applications remain running and
power/thermal conditions are not locked. A separate Windows-counter sample
observed total Processor Performance ranging approximately 157–218% of nominal;
that does **not** establish a causal clock explanation for individual batches.
No power settings were changed. No headful/device performance guarantee is made.

## What the production loop actually does

`SimulationPlayback2D.schedule()` is the real callback used by
`Gaussian2DDemo.tsx` in world mode:

1. Read the rAF timestamp delta.
2. Add **min(max(delta, 0), 8 dt)** to the accumulator.
3. Complete at most **eight synchronous world steps**, each at **dt = 1/120**.
4. Generate diagnostics only when the 100ms presentation interval is due.
5. **Draw once after the batch**, not once per physics step.
6. Request the next rAF if still playing.

The important loss is in step 2: wall time beyond **66.667ms per callback** is
never added. It is discarded before the step loop. The fractional remainder can
therefore remain below one dt even while physical/wall progress is poor. This
policy is unchanged by this investigation.

React publication can schedule a short `setTimeout` in the component to maintain
its approximately 100ms publication cadence. That timer does not step physics or
request a second animation loop. React work, layout/paint and input handlers can
run between animation callbacks. Native input cannot interrupt a synchronous
world step or an eight-step batch.

The report's `requested` counter is the sum of per-callback whole-dt demand from
the **unclipped** delta plus the existing fractional remainder. `completed`
counts actual committed world steps. Fractional discarded intervals mean that
`requested - completed` is not exactly `discardedSeconds / dt`. Physical time is
read from the authoritative world clock, not inferred from a displayed label.
A short measurement window can produce a ratio slightly above 1 because its
first/last committed steps straddle the measurement boundaries; it does not
indicate a larger dt or changed simulation speed.

## Why the interacting scene loses wall time

The slow production trace does **not** contain a hidden React/render loop that
explains a 5.5ms step becoming a 0.593 throughput ratio. Its actual steps are much
slower than the short isolated benchmark. The following is the **pre-change deep
production trace**, 5s warmup + 15s measured per scene. Method wrappers and tracing
slow this pass; use the plain controlled results below for throughput acceptance.

| Per completed world step, mean ms | Independent | Interacting |
|---|---:|---:|
| Entire world step | 8.47 | 15.27 |
| Potential preparation, including means | 0.21 | 3.01 |
| Spatial solves, including potential phases | 8.14 | 12.15 |
| Potential phases alone (inside spatial solves) | 0.20 | 3.65 |
| Spatial remainder (line solves/validation/etc.) | 7.95 | 8.50 |

Approximately **3.45ms extra in dense potential phases** plus **2.79ms extra in
potential/centroid construction** explains most of the **6.80ms interacting-step
increase** in that pass. With interactions off the free-terrain phases skip zero
angles. With drives/social enabled the effective potential is nonzero across
almost the entire grid. Those exact phase multiplications/trigonometric calls
are required physics, not optional presentation work. Every step also needs fresh
endpoint centroids and freshly constructed effective potentials. No repeated
width pass or duplicate world solve was found.

The source-mapped interacting CPU trace places about **33.5%** of samples in the
line solver, **21.2%** in potential phases, **16.6%** in state validation, **6.9%**
in potential composition and **2.1%** in GC. This gives a measured reason to
investigate finite-array guards rather than speculate about React or remove
physical evolution.

In that slow interacting window:

- 108 callbacks complete 864 steps (eight per callback).
- Callback median/p95: **130.9 / 146.3ms**.
- Summed world-step time: **13.194s** of roughly 15s wall time.
- Diagnostics: **0.183s**, entire drawing: **0.952s**, synchronous publication:
  **0.017s**. Density extraction is nested inside drawing, not an extra cost.
- Median outside-callback gap: **6.2ms**, not a missing 50–100ms scheduler sleep.
- Each roughly 131ms callback leads to another timestamp interval exceeding
  66.7ms; the cap discards the excess. This is an effect of the CPU overrun, not
  evidence of an independently slow animation scheduler.

The short isolated benchmark used a different fixture (mood preset with opposite
initial moods, nonzero barrier, roughly the first second of evolution) and an
unminified numerical bundle without the production callback/render workload.
The production fixture enables both interactions on the independent preset,
starts both moods in |0>, and uses free terrain. Its late trajectory, runtime/JIT
history and OS conditions differ. **5.5ms is not a valid production-step budget.**
There is no evidence that a duplicated inspector or an extra physics callback is
responsible. We cannot attribute all cross-run timing variability conclusively
to either JIT or OS frequency from these captures.

### Variability and instrumentation control

The unchanged source itself ranged from near 1.0 throughput to about 0.62 across
plain runs. In five fresh-document batches, interacting ratios were approximately
1.000, 1.001, 0.696, 0.619, 0.620. Reusing a single page for serial scene/preset
changes produced approximately 0.879, 0.879, 0.894. A shallow traced fresh run
reached 0.975. Deep traced runs were slower still. These are deliberately retained
as counterevidence to a universal hardware/architecture limit or a claim that the
historical 0.593-to-new-result difference is entirely a code speedup.

Acceptance therefore uses a matched, alternating **plain-mode** source comparison
and a separate 60-second production run, not a favorable isolated measurement.

## Targeted change

Only `packages/sim-core/src/grid2d.ts` changes production behavior internally:
replace the two finite-value guards' typed-array `for…of` traversal with an
ascending indexed traversal. The full size check, every `Number.isFinite` check,
error strings, failure order for ordinary typed arrays and read-only behavior
remain. No guard is removed, weakened or amortized across changed states.

This targets the repeatedly sampled validation cost without changing the
propagator, numerical formulas, summation order, potential generation, buffers,
randomness, UI cadence, accumulator or command ordering. All previous audit
optimizations remain intact. The new loops do not allocate an iterator; specific
boxing/JIT mechanisms are not claimed as proven by sampling alone.

Two tests exhaustively place NaN/±Infinity at every state/potential index, verify
no buffer writes, retain length errors, and check finite extremes and signed zero.

## Controlled before/after results

Machine-readable results, source hashes and verification record:
[`performance-audit-2d/runtime-results.json`](performance-audit-2d/runtime-results.json).
Only `packages/sim-core/src/grid2d.ts` differs among the captured/current production
source files. The prior caches, rendering and presentation optimizations are
unchanged, as are the solver, observables, interaction formulas, moods and UI.

### Plain production callback: five alternating batches

Each source/scene has **five 5s warmups + five 10s measured windows**. Quantiles
pool actual callbacks, not batch means. Throughput is total committed physical
time divided by total measured wall time. Frame time includes the complete
physics batch, diagnostics if due, and drawing; it is not one step's time.

| Scene | Before physical/wall | After physical/wall | Before callback median / p95 ms | After callback median / p95 ms | FPS before → after |
|---|---:|---:|---:|---:|---:|
| Two independent | 0.997 | 1.000 | 18.4 / 41.5 | 12.4 / 21.5 | 42.2 → 56.8 |
| Two interacting | 0.916 | 0.996 | 44.8 / 91.6 | 20.5 / 50.4 | 20.3 → 38.8 |
| Bell pair | 0.997 | 1.000 | 18.9 / 40.1 | 12.6 / 22.3 | 42.0 → 55.9 |

All five optimized interacting windows reached **0.984–1.002** throughput. Before
windows ranged **0.865–0.953**. The slight >1 ratios are window-boundary effects,
not overspeed evolution. Optimized pooled interacting outside-callback gaps were
**2.1ms median / 4.5ms p95**, versus **2.1 / 3.9ms** before. The gain is not from
removing an unexplained scheduler gap.

| Scene/source | Requested steps | Completed steps | Rendered callbacks | Eight-step callbacks | Discarded wall seconds |
|---|---:|---:|---:|---:|---:|
| Independent before | 6012 | 6002 | 2118 | 25 | 0.084 |
| Independent after | 6008 | 6008 | 2846 | 0 | 0 |
| Interacting before | 6024 | 5520 | 1022 | 346 | 4.203 |
| Interacting after | 6016 | 5992 | 1947 | 63 | 0.201 |
| Bell before | 6010 | 6000 | 2108 | 21 | 0.084 |
| Bell after | 6018 | 6018 | 2804 | 0 | 0 |

The counters show that more actual evolution is completed; no presentation trick
or skipped world update creates the improvement. Drawing remains once per rAF.

### Separately timed physics steps

Five alternating **5s warmup + 5s measurement** windows per source in the actual
interacting UI, with only the additional world-step wrapper:

| Metric | Before | After |
|---|---:|---:|
| Individual physics-step median / p95 | 6.5 / 14.0ms | 6.0 / 12.0ms |
| Complete callback median / p95 | 43.0 / 101.7ms | 27.9 / 71.5ms |
| Physical/wall throughput | 0.861 | 0.962 |

This pass has a measurable observer effect and is **not substituted** for the
plain acceptance results. Its tails also demonstrate why a 5.5ms isolated median
cannot predict sustained callback behavior.

### Continuous 60-second interacting acceptance

Same source pair, same browser process, separate fresh-page runs, five seconds
warmup followed by **60 measured seconds per source**:

| Metric | Before | After |
|---|---:|---:|
| Physical seconds / wall seconds | 47.217 / 60.063 | **57.983 / 60.062** |
| Physical/wall ratio | 0.786 | **0.965** |
| Callback median / p95 | 72.6 / 110.0ms | **28.9 / 75.0ms** |
| FPS | 14.2 | **27.0** |
| Requested / completed steps | 7202 / 5666 | **7208 / 6958** |
| Rendered callbacks | 854 | **1620** |
| Eight-step callbacks | 568 (66.5%) | **274 (16.9%)** |
| Discarded wall time | 12.803s | **2.087s** |
| Outside-callback gap median / p95 | 2.5 / 4.7ms | **2.3 / 4.4ms** |

**The ≥0.9 target is met in this bounded acceptance run and all five optimized
short windows.** This is not lossless 1.0× playback: some wall time is still
discarded, long callbacks remain, and performance under other loads/devices is
not guaranteed. The matched gain here is **0.786 → 0.965**, not a claim that all
of the historical **0.593 → 0.965** difference came from this code change.

## Final production trace: diagnostics, rendering, React and input

The optimized deep trace is a separate 15s/scene characterization. It reaches
0.964 / 0.861 / 0.897 throughput for independent/interacting/Bell respectively;
**profiling instrumentation can itself push playback below the target**. Those
figures are retained, not hidden or treated as acceptance results.

| Optimized deep-trace phase | Independent | Interacting | Bell |
|---|---:|---:|---:|
| Complete callback median / p95 ms | 13.2 / 67.3 | 61.3 / 99.9 | 16.8 / 88.2 |
| Physics-step median / p95 ms | 5.5 / 10.1 | 8.2 / 12.7 | 6.4 / 12.6 |
| Potential preparation median / p95 ms | 0.2 / 0.5 | 1.2 / 2.3 | 0.2 / 0.6 |
| Total centroid-helper time, ms | 0 | 636.3 | 0 |
| Snapshot median / p95 ms | 0.6 / 1.6 | 0.7 / 1.2 | 0.9 / 2.0 |
| Full drawing median / p95 ms | 3.0 / 6.6 | 4.5 / 7.5 | 3.8 / 8.8 |
| Terrain draw total, ms | 12.5 | 4.4 | 9.8 |
| Synchronous publication total, ms | 5.4 | 11.7 | 5.5 |

Centroid, phase, density extraction and terrain timings are nested in their
parents and must not be added again. Paired and disabled worlds correctly make
no centroid calls in the physics path. Diagnostics still compute real spatial
moments and current mood diagnostics when published. No paired feedback was
reintroduced, and no conditional Bloch value was substituted or suppressed.

Source-mapped optimized interacting sampling puts about **41%** of samples in
line solves, **25%** in potential phases, **6%** in state validation, **6%** in
potential composition, and **1.2%** in GC. The remaining numerical path dominates,
not rendering/publication. These are self-sample shares in a characterization
pass, not exact exclusive wall-clock accounting or a matched GC-allocation-rate
study.

The **shallow pre-change trace**, which does not wrap solver/world methods,
independently corroborates this: approximately **59.5%** of samples are in the
spatial step/line routines (including inlined work), **6.6%** in potential
composition, **6.6%** in the centroid helper, about **8.6%** in color mapping and
**3.3%** in GC. This is stronger evidence than assuming nested probes are free.

React/DOM evidence:

- Source-mapped React/scheduler **self** samples are approximately 0.3% in the
  shallow and optimized traces. This is not a full inclusive reconciliation or
  commit-duration measurement; the standard production React bundle is not the
  profiling renderer.
- In the final interacting trace, layout totals **52.7ms**, paint **75.9ms**,
  and all ten `TimerFire` events total **2.55ms** over the approximately 15s trace.
  The timer events are not a duplicate physics loop.
- Synchronous `onFrame` timing includes the existing `setSnapshot`/timer setup;
  asynchronous reconciliation can occur outside that callback and is visible in
  the source-mapped CPU trace. It was not assigned to world stepping by fiat.

Queued input and actual handling are different:

| Canvas View-mode pointer probe | Independent | Interacting | Bell |
|---|---:|---:|---:|
| Dispatch-to-listener delay median / p95 ms | 15.1 / 75.5 | 32.8 / 80.2 | 23.8 / 95.4 |
| Pointermove event handling median / p95 ms | 0.331 / 0.719 | 0.228 / 0.492 | 0.326 / 0.768 |

There are 14 moves per scene, so these are sparse latency probes, not a complete
touch/pen responsiveness guarantee. CDP round-trip timings corroborate the queue
delays. The input handler is short; waiting for an uninterruptible physics batch
is the substantial delay. Reducing frame CPU cost helps without changing input
ordering. No click, brush mutation or measurement is injected into acceptance
throughput windows.

## Numerical and browser regressions

- **380 tests / 34 files pass**, including all 378 previous tests unchanged.
- Type checking, production build, DOM-free world compile and audit-entry
  TypeScript checking pass; both new Node tools pass syntax checks.
- Against the captured source: six scenarios, 100 steps including a mid-run
  terrain edit; full complex arrays at checkpoints and endpoint, diagnostic
  values, seeded measurement/release/reset and 1–4 layer image bytes agree
  exactly. Existing norm/energy/Gaussian/convergence, ownership, paired feedback,
  no-signalling, measurement probability and seeded replay tests remain green.
- Chrome regressions pass: **30 world, 21 Gaussian/terrain, 22 1D creature,
  14 Observer**. No runtime/console errors were reported. Mode switches, painting,
  reset, selection, pair inspectors/measurements/release and cleanup are retained.
- All eight runtime datasets have no captured uncaught runtime exceptions.
  The ordinary shipped production build contains **no audit registration hook**.
- `git diff --check` passes (existing CRLF conversion warnings only). User-owned
  uncommitted work is preserved; no commit/push/version/dependency changes.

## Recommendation and remaining limits

**Proceed to the separately scoped Slice 5E after review of these results.**
Do not implement a Worker migration as a prerequisite based on the old isolated
median/throughput comparison. A modest, numerically neutral finite-guard change
meets the requested ≥0.9 target in the measured production acceptance runs.

No evidence here establishes that the current main-thread architecture is
fundamentally unable to meet this two-creature target, so the conditional Worker
implementation/design decision is not triggered. A Worker might later improve
input responsiveness, but it would not automatically increase CPU throughput;
it would need separate approval, state/command ordering design and validation.

Remaining limits are real: 75ms p95 callbacks and about 2.1s of discarded time in
the optimized minute, variable OS/runtime conditions, slower profiled runs,
headless/software-Canvas measurements, and no new four-creature or multi-hour
memory guarantee. Existing one-minute memory findings remain in the prior audit.
Do not weaken physics or increase dt to conceal these limits.

## Reproduction

Capture `packages/` outside the repository before a proposed change, without
stashing/discarding existing work. The capture root must contain `packages/web`
and `packages/sim-core`; the harness resolves React from the current project's
locked installation, not from a new installation in the capture.

```sh
node scripts/performance/runtime-2d.mjs --out D:/Temp/runtime-ab --compare-before C:/captured-root --mode plain --batches 5 --seconds 10
node scripts/performance/runtime-2d.mjs --out D:/Temp/runtime-timed --compare-before C:/captured-root --scene two-interacting --mode timed --batches 5 --seconds 5
node scripts/performance/runtime-2d.mjs --out D:/Temp/runtime-long --compare-before C:/captured-root --scene two-interacting --mode plain --batches 1 --seconds 60
node scripts/performance/runtime-2d.mjs --out D:/Temp/runtime-trace --mode trace --batches 1 --seconds 15
node scripts/performance/summarize-runtime-2d.mjs D:/Temp/runtime-ab
node scripts/performance/summarize-runtime-2d.mjs D:/Temp/runtime-trace
```

Run timing commands sequentially, without simultaneous builds/tests/other audits.
Raw traces can be opened in Chrome Performance (load profile) or Perfetto.
`--serial` retains one page between presets; the default navigates to a fresh
page per batch. `--shallow` is useful for an observer-effect check on a trace.
Source capture, traces, raw per-callback records and working logs are retained
outside the repository under `D:/Temp/psi-runtime-*`. Compact acceptance results are retained in
[`performance-audit-2d/runtime-results.json`](performance-audit-2d/runtime-results.json).

Harness bring-up: building the external capture initially failed to resolve
`react/jsx-runtime`; the builder now explicitly resolves both sources against
the current installed React dependencies. Early registration transforms emitted
a source-map warning; the final builder supplies precise maps with MagicString.
Neither failed build nor warning-bearing controller source positions are used as
acceptance results. Core-source positions in the exploratory trace were checked
separately. No application error was suppressed to make a benchmark pass.
