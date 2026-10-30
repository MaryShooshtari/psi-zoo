# Slice 5E.4 — museum guide, science help and notebook

## Review status

Implemented for independent review; **not blanket acceptance of Slice 5E**.
The functional, numerical and bounded automated accessibility checks pass.
**Historical sustained performance acceptance remains open**, as does real
assistive-technology/device acceptance. No next phase, commits or pushes.

The working tree already contained the earlier 5A–5E.3 work. This phase preserved
it. A diff against HEAD is not a phase-only diff. Before editing, source was copied
to `C:/Users/marys/AppData/Local/Temp/psi-5e4-before/packages/`.
Machine-readable preservation checks and measurements:
[`performance-audit-2d/museum-results.json`](performance-audit-2d/museum-results.json).

## Experience and lifecycle

- First visit offers an optional invitation; **Not now** only dismisses it.
  The global **What am I seeing?** control remains available, including legacy
  demonstrations. Help is compact; the full notebook is a separate internally
  scrolling native modal. Reading does not implicitly pause or reset playback.
  Help explicitly reports the publication time and asks the visitor to reopen
  for updated context rather than presenting a stale snapshot as live diagnostics.
- Starting/replaying requires explicit confirmation that the active experiment
  will be replaced and that there is no scene save/undo. Cancel preserves the
  controller, amplitudes, terrain, time, playback, joint ownership and RNG.
  This chooses the request's **confirmed replacement** option, not scene backup.
- Step 1 requires a real Play action, positive physical time and **at least 20%
  growth in one position standard deviation** of the real single-creature state.
  This is perceptible state evolution, not a wall timer or a scripted animation.
- Step 2 requires the real 1D marginal view after its presentation transition.
  It is still the same 2D state/controller. Reduced motion completes the view
  presentation immediately; it does not bypass the learning interaction.
- Step 3 asks the visitor to return to 2D themselves, choose **Barrier (+)** and
  paint a short native pointer stroke. Completion needs an actual positive
  potential edit/revision and at least 12 CSS pixels of stroke. A named keyboard
  alternative explicitly applies the same brush at five nearby central points;
  it is enabled only after choosing Barrier (+) in clean 2D and never runs itself.
- Next/Back changes instructions, not physics or world history. Existing evidence
  may still satisfy a revisited step; Back is not a simulation rewind.
- Finish/Skip deliberately disposes the guide controller and its bindings/timers,
  resets the view, and creates the same **one-creature, free-terrain, paused 2D
  state at time zero**. Preparation uses the existing independent preset and
  removes B through the public world API. This is not an unapproved solver,
  Gaussian convention, seed or parameter change. Legacy/scattering replacement
  choices and unrelated world/mood commands are disabled during the guide.
- Only `psi-zoo-guide-v1=done` is optionally stored locally after completion/skip.
  Storage failure is caught; no accounts, analytics, backend or saved psi data.

## Notebook and contextual science

Ten authored, locally bundled Markdown chapters:

1. Probability, amplitude and density.
2. Free spreading and the independent Gaussian-width convention.
3. 1D marginals of the 2D state and average terrain.
4. Potentials, barriers, wells, Hamiltonians and the numerical scheme.
5. Scattering, reflection/transmission and the limits of tunnelling claims.
6. Mood qubits, Bloch vectors and pure/mixed states.
7. Mean-field feedback and its actual discrete update schedule.
8. Genuine joint mood states, reduced states, purity and entropy.
9. Projective mood and finite-resolution Gaussian position measurement.
10. Conditional/unconditional states, release and no-signalling safeguards.

Every chapter has **Observe → Understand → Explore the mathematics**. Observe
starts with something the visitor can try; Understand is open by default;
mathematics is an optional disclosure with native MathML, labeled notation,
assumptions, scope and related chapters. Chapter changes reset internal scroll and
focus the new heading. All text and equations are available offline without a
renderer/font service. Proof-source links are optional external reference links.

Context derives from published scene metadata: main 2D vs projected 1D vs legacy
experiments, actual signed terrain, known unedited scattering preset, creature
count, feedback settings, selected mood purity/ownership, and recorded measurement
or release. A painted arbitrary barrier is **not** automatically called tunnelling.
Changing a legacy experiment remains an explicitly fresh experiment.

Scientific distinctions are explicit:

- Amplitude is complex; density is its squared magnitude. A cloud is not a hidden
  particle trajectory. Selecting a cloud is not observing its position.
- `rhoX[i] = dy * sum_j |psi[i,j]|²`, with physical x spacing and no independent
  peak normalization. It is a marginal, not autonomous 1D Schrödinger evolution.
  **Average terrain along y** is an unweighted average, not a projected effective
  Hamiltonian; it excludes mood/social feedback.
- Painting changes subsequent Hamiltonian evolution, not amplitudes instantly
  and not a measurement. Independent densities do not acquire interference just
  by overlapping; coherent amplitudes in the same state are required.
- Mood mean-field feedback is not a spatial many-body state. Registered mood
  pairs own an actual tensor-product state; the spatial wavefunctions remain
  independent. Pure global states can have mixed reduced states.
- Conditional partner states can change on a recorded outcome; unconditioned
  local statistics do not provide a message. The existing registered-pair feedback
  suspension remains in force until release, even for measured product pairs.
- Gaussian localization is a finite-resolution measurement update/POVM, **not an
  exact orthogonal projection**. Sharp coordinate projection is a different model.
  Native faces, blinks, halos and dotted links are annotations, not quantum forces.

### Honest formal/numerical scope

Museum proof links are pinned to companion commit
`ac2ff0ffb4f05f2758b85909885b4ef337287eb4`. Actual linked source files were inspected
and checked against the local clean companion repository. `lake build` ran and
reported **Build completed successfully (5044 jobs)**. No Lean source was edited.

The chapters link specific exact weighted-norm, finite-Hamiltonian/Cayley,
coordinate-projection, finite-measurement, Gaussian-response and qubit results
where available. These do **not** verify the TypeScript, IEEE-754 arithmetic,
underflow handling, seeded sampler, the whole game, the implemented four-amplitude
propagator or its no-signalling guards. In particular the split 2D evolution is
not mislabeled literal unsplit Crank–Nicolson. Numerical tests, exact-model proofs
and visual observations remain separate forms of evidence.

## Architecture and edited files

New web modules:

- `packages/web/src/museumGuide.ts`: completion preference, deterministic scene
  preparation, real spreading/stroke gates and explicit keyboard brush action.
- `museumScience.ts`: typed context-to-topic explanations using published data.
- `museumNotebook.ts`: eager local Markdown catalog, metadata/section/link checks.
- `Museum.tsx`: invitation-adjacent guide card, modal help/notebook/confirmation,
  chapter navigation, progressive disclosures and focus behavior.
- `museum.test.tsx`: guide gates, exact deterministic preparation, preservation,
  storage failure, chapter/math validation, context coverage and confirmation.
- `content/notebook/museum/*.md`: the ten authored chapters.

Integration:

- `App.tsx`: global help, confirmation/replay, minimal scene reference, clean guide
  remount and legacy/scattering routing protection.
- `Gaussian2DDemo.tsx`: public guide preparation, actual Play/stroke observation,
  guide cleanup/focus, known-Gaussian/preset provenance and small published context.
  No React update per numerical step; context follows the existing ~100 ms cadence.
- `Notebook.tsx` / `.test.tsx`: CRLF-tolerant parsing, trusted MathML checks and a
  shared native-dialog Tab wrapper. The legacy notebook now wraps focus explicitly
  in both directions, as does the museum dialog.
- `content/notebook/observer.md`: corrected proof availability/scope for the actual
  exact finite Gaussian model; retained detector mechanics and six equations.
- `style.css`: guide/dialog/internal-scroll/target styles and a darker muted ink
  (`#505a70`) to fix sampled text contrast over the deep sky background.

Validation/tooling:

- `scripts/museum-browser-{check,cases}.mjs`, optional museum mode in
  `projection-browser-check.mjs`, and an additional legacy notebook focus check
  in `observer-browser-check.mjs`.
- `scripts/performance/runtime-2d.mjs`: four-creature scene, advanced/open-close
  popover variants, endpoint geometry/census, explicit roster/ownership assertions,
  bounded CDP/readiness waits and owned-server connection cleanup.
- `scripts/performance/museum-matrix.mjs`: sequential reproducible production
  matrix. Audit hooks are injected only into temporary builds, not the release.
- This report, evidence JSON, README and roadmap.

No DOM/React was added to sim-core. Numerical state is still Float64Array.
Grid: 128×128 interior points; x/y in [−10,10]; dx=dy=20/129; unstored zero
Dirichlet boundaries; hbar=m=1; dt=1/120. Solvers, normalization, potential math,
mood/joint math, outcome probabilities, RNG, ownership and committed-step/catch-up
policy are unchanged. The preservation manifest verifies 36 protected sources
against the phase snapshot; all render implementations are also unchanged.
Package metadata/dependencies/versions are unchanged. No commits/pushes.

## Checks actually run

- `npm run test`: **421 tests / 40 files**, including the numerical norm,
  static-H energy, independently specified Gaussian, terrain, coupled convergence,
  qubit/joint, measurement, ownership and deterministic RNG regressions.
- `npm run typecheck`, `npm run build`: pass.
- DOM-free `tsconfig.world2d.json` and performance-entry TypeScript compiles: pass.
- Production museum/projection **77**; creature/projection **51**; shell **36**;
  world **30**; Gaussian/terrain **21**; legacy creature **22**; Observer **15**.
  **252 browser-check executions; 229 after counting the 23 shared projection
  checks only once.** No browser runtime/console errors in successful release runs.
- Museum checks include offline all-chapter/native-MathML/internal-link access,
  exact cancellation preservation of a painted/measured joint scene and RNG,
  real keyboard Play, actual marginal morph, Back, native positive brush stroke,
  all skip stages including an active transition, reduced motion, keyboard brush,
  clean finish/skip, blocked storage, focus return and both directions of Tab.
- Five desktop sizes 1920×1080, 1440×900, 1366×768, 1280×720, 1024×600: primary
  controls and active-guide navigation reachable without document scrolling.
  Notebook/shell also checked at 512×300; notebook/settings scroll internally.
- Chrome accessibility tree: named primary buttons and a native creature selector
  alternative to canvas. Sampled theme text contrast ≥4.5:1 and focus ≥3:1.
  This sampling is not full WCAG conformance or a real screen-reader audit.
- Final production bundle: JS 416.78 kB / 130.89 kB gzip; CSS 11.71 / 3.36 kB gzip.
  No shipped `__psiRuntime`/`__projectionCheck` hooks.
- Script syntax and `git diff --check`: pass (existing LF/CRLF notices only).

Final screenshots/evidence from production automation:
`C:/Users/marys/AppData/Local/Temp/psi-projection-check-rzMvU3/`.
The guide and notebook screenshots were inspected; they do not replace human
interactive visual/accessibility approval.

### Investigation notes (not hidden failures)

An initial browser harness evaluation returned `window` from `Object.defineProperty`,
which CDP could not serialize; returning a boolean fixed the audit, not the app.
Native Tab/focus and post-remount Play focus were strengthened during development.
One early projection resize assertion was transient; subsequent complete release
runs passed without relaxing its assertions. A contrast audit caught the older
muted-sky pair at ~4.12:1; darkening muted ink fixed it. The initial guide width
threshold was strengthened to 20% to demand perceptible rather than tiny evolution.
An initial long benchmark attempt timed out before recording samples; its output
folder/log is retained. Bounded CDP waits/owned-server cleanup were added and the
sustained rerun completed. None of these changed numerical tolerances or physics.

## Production performance — keep both favorable and unfavorable results

Host: recorded Windows kernel release, Intel i7-1065G7 / 8 logical CPUs,
Chrome 156 headless, GPU disabled, requested 1280×1000 window, default 5 s warmup.
Actual viewport/backing sizes are recorded in later endpoint data. Runs were
sequential, not concurrent with tests or builds; each build completes before its
warmup/measurement. Mode `plain` includes normal rendering, inspector publication
and a light rAF audit, without per-kernel timers. Ratios use committed physical
time divided by measured wall seconds, not a visual animation clock.

| Run | Physical/wall throughput | Meaning |
|---|---:|---|
| Early source comparison, 3×10 s/arm | before **0.74919**, after **0.74162** | Retained adverse short comparison |
| Sustained source ABBA, 2×60 s/arm | before **0.70430**, after **0.71483** | No phase regression here; both below target |
| Final exact-source matched 60 s pair | before **0.69961**, after **0.70482** | Current source; both below ~0.965 |
| Final exact-source unpaired 60 s | **0.97918** | Favorable bounded minute, not source parity |
| Matrix 2D, two interacting, 10 s | **0.75406** | Adverse short 2D run retained |
| Matrix 1D marginal, same 2D physics | **1.00005** | Not independent 1D evolution |
| Matrix alternating views | **0.98532** | 14 real switches |
| Face off/on/on/off, 4×10 s | **0.98438 / 0.99963 / 1.00005 / 1.00026** | Same-source serial ABBA |
| Popover open/close | **0.98361** | 14 actual menu actions |
| Advanced inspector open | **0.97533** | Existing live diagnostic publication |
| Bell pair | **1.00120** | Matrix; final census-asserted rerun ~**0.999** |
| Four interacting creatures | **0.71126** | Matrix; final census-asserted rerun ~**0.728** |

The matrix and first sustained ABBA precede the guide-only 20% gate/compact-help
refinements; those guide/help paths are inactive in these benchmark scenes.
The final minute/pair and final four/Bell runs use the final app source. All
original datasets remain; none are replaced with favorable reruns.

The deep 5 s diagnostic is **not a throughput acceptance result** (wrappers affect
optimization). It found ~3.369 s in spatial steps and ~0.461 s in drawing across
~4.531 s of measured callbacks; snapshot calls ~0.025 s and publication callbacks
~0.0025 s. Publication callback timing excludes asynchronous React reconciliation,
layout and compositing; it is not total UI/inspector cost. Nested phase/potential/
mean timers must not be added as independent cost.
New context is small, read-only, published at the existing cadence, with no
per-frame full-state copies. This supports a bounded overhead investigation,
**not** a proof that variability is environmental or that all prior regressions
are solved. The cause of the slow/fast whole-app regimes is not established.

Final isolated synchronous Canvas probe at 600×600, 50 samples/arm after warmup:

- Two creatures: bare median/p95 **4.2/5.8 ms**, decorated **4.4/5.8 ms**.
- Four: bare **6.0/7.9 ms**, decorated **6.2/7.6 ms**.
- Incremental median ~**0.2 ms** for both; exact physics/reference RNG preserved.

That passes the bounded <2 ms decoration budget, not compositor/FPS/sustained
acceptance. The matched final source pair is ~0.7% faster, but both arms miss the
historical absolute target. **Do not erase that result with the 0.979 minute or
claim whole-app/sustained acceptance.** No grid, dt, solver, schedule, hidden pause,
normalization or effective-potential change was made to inflate throughput.

Raw datasets are under `D:/Temp/psi-5e4-*`; the evidence JSON contains directory,
environment, arm/run summaries, errors, callback percentiles and action counts.

## Exact trying and reproduction instructions

```sh
npm run dev
```

1. Open the displayed local URL. Choose **Start three-step guide…**, or use
   **What am I seeing? → Replay three-step guide…** if the invitation is absent.
2. Read the replacement warning. **Cancel — keep my scene** is non-destructive.
   To try the guide choose **Replace scene and start guide**.
3. In 2D press **Play** and watch the cloud widen until Next unlocks (20% computed
   width growth). Optionally Pause to inspect it. Press **Next**, then **1D view**.
   Compare the genuine marginal and separate average-terrain band; press **Next**.
4. Choose **2D view → Menu → Terrain → Barrier (+)** and drag a short stroke.
   Keyboard-only: choose those same controls, Escape to close Menu, then activate
   **Paint a short central barrier (keyboard alternative)** in the guide.
5. Press **Finish guide**, or try **Skip guide** at any step. Verify one Mochi,
   zero time, paused 2D, free terrain. Play remains focused/reachable.
6. Open **What am I seeing?**, then **Open full physics notebook**, or use
   **Menu → Physics notebook**. Choose any chapter; expand mathematics; follow
   internal chapter links. Escape/Close returns to a visible trigger. Try the
   keyboard-only path, reduced-motion OS preference and small desktop sizes.
7. Outside the guide, create a pair/paint/measure; open Replay and Cancel to verify
   nothing is replaced. Starting after confirmation intentionally discards it.

```sh
npm run test
npm run typecheck
npm run build
npx tsc --project packages/web/tsconfig.world2d.json
npx tsc --project scripts/performance/tsconfig.json
node scripts/museum-browser-check.mjs --screenshot
node scripts/creature-design-browser-check.mjs
node scripts/terrarium-shell-browser-check.mjs
node scripts/world-2d-browser-check.mjs
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs --no-screenshots
```

Existing non-production-audit browser scripts use the dev server. Chrome defaults
to `C:/Program Files/Google/Chrome/Application/chrome.exe`; `CHROME_PATH` overrides it.
Run performance separately, without concurrent tests/builds:

```sh
node scripts/performance/museum-matrix.mjs D:/Temp/my-museum-matrix
node scripts/performance/runtime-2d.mjs --out D:/Temp/my-museum-pair --compare-before C:/Users/marys/AppData/Local/Temp/psi-5e4-before --scene two-interacting --mode plain --batches 2 --seconds 60
node scripts/performance/summarize-runtime-2d.mjs D:/Temp/my-museum-pair
```

The before snapshot is local, not a committed project fixture; supply your own
phase-equivalent source root on another machine. Companion proof reproduction:
`cd ../psi-zoo-proofs && lake build` at the pinned commit.

## Remaining acceptance / limitations

- Independent human science/interaction/visual review; actual zoom, NVDA/JAWS/
  VoiceOver MathML reading, touch/pen, color-vision variations, overlap readability,
  older browsers, safe-area handling and long sessions on target hardware.
- The 512×300 checks are a CSS viewport approximation, not real browser zoom/AT
  certification; active guide geometry was checked at the five requested desktop
  sizes, not certified at every possible zoom/height.
- Reproducible sustained target-device performance acceptance, including the
  ~0.965 target and the unresolved fast/slow regimes. Four creatures are not
  claimed real time. Paired source comparisons and unfavorable datasets remain
  essential; do not accept only the isolated Canvas or favorable minute result.
- Replay is confirmed replacement, not scene persistence/restoration; completion
  storage is optional. Help reflects the snapshot at opening, not per-frame math.
- No expanded physics, new spatial entanglement, whole-game theorem, outcome
  changes or performance architecture was introduced.

**Stop at this review boundary. No next phase is authorized by this report.**
