# Psi Zoo

A quantum-creature terrarium for learning, playing, and formally exploring
Schrödinger dynamics.

**Current: Slice 5E.4 — museum guide and complete physics notebook (implemented for review).**
Use **Start three-step guide…** on first visit, or **What am I seeing? → Replay
three-step guide…**. Replacement requires explicit confirmation. The guide asks
for real Play with perceptible computed spreading, a state-preserving 1D marginal,
and a visitor-painted 2D barrier (with an explicit keyboard alternative).
**Finish/Skip replaces the guide with one initial creature, clean terrain,
paused 2D and time zero.** Canceling replay leaves the personal scene untouched.

**What am I seeing?** gives compact context-specific science. **Menu → Physics
notebook** and the help dialog open all ten locally bundled chapters, each with
**Observe → Understand → Explore the mathematics**, native MathML and precise
proof/model limitations. No accounts, services, downloaded equation fonts or new
dependencies. Only an optional local guide-completion preference is stored.

**421 tests / 40 files; 229 browser checks** (252 executed, including 23 shared
projection checks) pass, along with typecheck/build and the DOM-free/performance
compiles. The linked Lean repo builds at the pinned commit. Physics and step
policy are unchanged. **Final Slice 5E acceptance remains open:** real AT/device
review and sustained performance require review. A final unpaired minute reached
0.979 physical/wall throughput, but the final matched source pair was
0.700 before / 0.705 after, below the historical ~0.965 target. Adverse results
are retained. [Files, exact usage, evidence and limitations](docs/MUSEUM_VALIDATION.md).
**Stop for independent review; do not automatically proceed beyond 5E.4.**

**Retained Slice 5E.3 — expressive creatures, discoverable controls.** Mochi, Pip,
Lumi and Nori keep deterministic names/colors, tiny density-anchored faces, mood
badges, selection halos and registered-pair indicators. Click a cloud/hill to
**select, never measure**, or use the creature list. Faces do not move probability,
modify amplitudes or consume quantum randomness; reduced motion disables blinking.

**Menu** now has Simulation, Terrain, Creatures, Moods & friendships, Experiments,
Display, Physics notebook and Advanced, with internal Back navigation. Try Create
a barrier, Build a well or the explicitly separate Watch scattering experiment.
Detailed diagnostics and all legacy demonstrations remain available under Advanced.

**408 tests and 174 browser checks pass**, including exact-state/RNG comparisons
and the bounded overlay draw-cost budget. Whole-app/sustained performance
acceptance remains open; adverse comparisons are retained, not hidden by the
successful bounded on/off run. [5E.3 evidence, usage, files and remaining review](docs/CREATURE_DESIGN_VALIDATION.md).
This is the historical 5E.3 review boundary. The separately authorized 5E.4 work
is described above; its performance gate is not retroactively cleared.

**Retained Slice 5E.2 — one terrarium, two views (historical phase record).** The default opens the existing
2D creature world. **1D view** shows each creature’s true x-marginal density;
**2D view** returns to its heatmap. The 450 ms mirror presentation preserves the
same amplitudes, moods, terrain, time and playback, with immediate reduced-motion
switching. The separate signed **Average terrain along y** is not a 1D Hamiltonian.

Open **Menu → Advanced / Legacy demonstrations → 1D simulations** for the original
standalone 1D/Observer experiments, or choose **2D Gaussian demo**. Entering/leaving
a legacy demonstration starts a fresh experiment; the main view switch does not.

**399 tests**, typecheck/build and **146 browser checks** pass. Sustained performance
acceptance remains open: final short paired 2D runs were near real time, but a
minute-long comparison was slower. See the [5E.2 implementation, numerical evidence,
performance caveat and review checklist](docs/PROJECTION_1D_VALIDATION.md).
This records the 5E.2 boundary; 5E.3 is described above. Historical milestones
below describe retained demonstrations, not the current acceptance counts.

**Retained Slice 5D — entangled mood qubits.** In **2D creature world**, select
an independent creature and a partner, then **Entangle moods**, or load
**World: entangled friendship**. Both creatures share one genuine Bell-state
mood, while their spatial wavefunctions remain independent. Inspect reduced
Bloch vectors, purity and entropy; measure in Z or X with seeded Born-rule
outcomes, or **Measure & Release** to restore independent moods. Registered
pairs have all mood-dependent spatial feedback suspended to avoid spurious
signalling through the approximate mean-field interface.
[Model, controls, tests, benchmarks and review checklist](docs/ENTANGLEMENT_2D_VALIDATION.md).

**Post-5D performance audit:** reproducible production/Node benchmarks, private
observable caching, terrain-only fast paths and presentation-cadence diagnostics.
All **378 tests** and browser regressions pass, with tested bit-identical evolution
and pixels. Independent/Bell playback improves, but the coupled two-creature
real-time target was **not met in that audit**.
[Controlled results, sustained playback, memory checks and limitations](docs/PERFORMANCE_AUDIT_2D.md).

**Production-loop follow-up:** indexed finite-value guards preserve every check
and all physics. The matched 60-second interacting UI comparison reaches
**0.786 → 0.965 physical/wall throughput**, meeting the bounded ≥0.9 target;
**380 tests** and browser regressions pass. Long callbacks and some discarded
wall time remain; no Worker was introduced. This historical record predates 5E.
[Real callback traces, controlled comparisons, limits and recommendation](docs/RUNTIME_PERFORMANCE_2D.md).

The retained 5C independent, drive, attraction and repulsion scenes support 1–4
separately normalized spatial states, shared editable terrain and independent
unitary moods. Spatial feedback remains a generally first-order mean-field game
model, **not spatial entanglement or an exact many-body simulation**. Standalone
1D and Gaussian 2D demonstrations remain available under Advanced / Legacy.
[5C numerical evidence and limitations](docs/WORLD_2D_VALIDATION.md).

**Retained Slice 5B — interactive 2D potential terrain.** Select **2D Gaussian demo**
to paint positive barriers, negative wells, or smoothly erase them while one
complex wavefunction evolves on the existing 128 × 128 interior grid. Signed
terrain colors are separate from the probability heatmap. Reproducible free,
scattering and attractive-well presets are included. These are legacy experiments,
not the main terrarium’s marginal view.
[Controls, physics, numerical evidence and performance](docs/TERRAIN_2D_VALIDATION.md).

**The legacy 1D demonstration starts with two interacting creatures.** Play the numerical mean-field
simulation, select A or B to inspect its qubit mood, paint shared terrain, and
observe only the selected creature. Compare attraction, independence, and
repulsion from identical initial conditions using **Apply coupling & Reset**.
[Slice 4D controls, validation, and limitations](docs/TWO_CREATURE_BROWSER_VALIDATION.md).

![Actual two-creature browser simulation: separate cyan and rose densities approach under mood-driven mean-field evolution, then A is observed and re-spreads](docs/media/creatures.gif)

**Slice 4 — The Creature:** genuine browser capture of the default g=1.5 scene.
Both densities evolve; observing A at t=3.46 localizes only A, which then
re-spreads through t=7.42. White marks the sampled x=−0.20, not a trajectory.
The 10.52-second recording includes paused holds, with no invented physics frames.
Opposite mood forces are real but modest and mirror-symmetric; a controlled
[counterfactual comparison](docs/TWO_CREATURE_BROWSER_VALIDATION.md#mood-dependent-behaviour-acceptance)
is the evidence for their causal effect, not the GIF alone.
[Capture provenance](docs/TWO_CREATURE_BROWSER_VALIDATION.md#authentic-slice-4-gif).

The recordings below document the retained single-packet presets.

![Actual browser evolution: the packet evolves, an observation localizes it at a sampled position, and the localized state re-spreads](docs/media/observer.gif)

**Slice 3 — The Observer:** authentic browser recording of initial free evolution,
a position measurement at t=1.96, and subsequent re-spreading through t=5.94.
The magenta marker records the sampled x=−3.30, not a moving particle. The roughly
9-second GIF includes brief paused holds; evolution pacing is otherwise sampled
from the running app. [Capture provenance](docs/OBSERVER_VALIDATION.md#authentic-observer-gif).

![Actual Crank–Nicolson evolution: an incident Gaussian packet reflects from and transmits through a potential barrier](docs/media/scattering.gif)

Actual **Crank–Nicolson evolution**, not scripted motion: a Gaussian wave packet
scatters from a barrier, producing quantum reflection and transmission. The app
also supports **user-editable potential barriers**. This browser recording shows
physical time 0–44 at approximately **2.5× playback speed**, in dimensionless units
(ℏ = m = 1). The unchanged tunnelling demo gives **R ≈ 0.800, T ≈ 0.200 at t=44**;
the absolute numerical uncertainty budget is about 0.0015, not exact continuum
accuracy. [Capture provenance and numerical evidence](docs/SCATTERING_VALIDATION.md).

**Historical 5D status:** implementation and automated checks pass, pending human
visual/device/accessibility review. **375 automated tests**, TypeScript checks,
production build and a separate DOM-free world compile pass, including all 355
unchanged pre-5D tests. Algebraic X/Z no-signalling, joint-state invariants,
seeded replay, feedback suspension and bit-identical spatial continuity pass.
**30 world**, **21 Gaussian/terrain**, **22 1D creature**, and **14 Observer**
Chrome checks pass without runtime/console errors. Latest benchmark timings
are slower than the historical 5C run; even two-creature playback can lag on
this configuration. See [5D evidence](docs/ENTANGLEMENT_2D_VALIDATION.md).
The following describes the retained 5C evidence: World validation checks complex-state reference equivalence,
order independence, norms, causal behavioral contrasts, lifecycle continuity
and first-order coupled convergence. **21 world and 21 Gaussian/terrain Chrome
checks** pass. Four-creature playback can lag on the tested headless machine;
no resolution/timestep reduction hides that limitation.
[World evidence and reproduction](docs/WORLD_2D_VALIDATION.md).
Terrain validation retains exact state continuity, the instantaneous energy
jump and static-H refinement checks. [Terrain evidence](docs/TERRAIN_2D_VALIDATION.md).
The [unchanged 5A benchmarks](docs/TWO_DIMENSIONAL_VALIDATION.md) still pass:
<0.86% Gaussian width error at t=2, <7e-13 norm drift over 10,000 steps, and
second-order full-complex-state temporal convergence.
The existing Slice 4 strict DOM-free controller/world compilation result is
recorded in its historical validation. Real Chrome checks passed for the two-creature scene (22 checks)
and retained Observer scene (14 checks), with no runtime/console errors. This is
not a claim of exhaustive manual device or accessibility acceptance. No automatic
commit or push. [Slice 4D validation](docs/TWO_CREATURE_BROWSER_VALIDATION.md).
[Historical Slice 3 validation and capture provenance](docs/OBSERVER_VALIDATION.md).
See [the roadmap](docs/ROADMAP.md), [scattering validation and capture sequence](docs/SCATTERING_VALIDATION.md),
[potential painting guide](docs/POTENTIAL_LANDSCAPES.md),
[directed packet validation](docs/DIRECTED_GAUSSIAN_VALIDATION.md), and
[Gaussian spreading validation](docs/FREE_GAUSSIAN_VALIDATION.md).

## Explore the project

- **Run the simulation:** [local development](#local-development) and [browser behavior](#browser-simulation).
- **Understand the physics:** [lab notebook](docs/notebook/README.md), starting with
  [The Observer — Why does the wavefunction collapse?](packages/web/src/content/notebook/observer.md)
  (also available in-app through **Why did it jump?**) and
  [why the wave packet keeps its probability](docs/notebook/crank-nicolson.md).
- **Inspect the evidence:** [scattering/tunnelling experiments](docs/SCATTERING_VALIDATION.md),
  [Gaussian spreading measurements](docs/FREE_GAUSSIAN_VALIDATION.md)
  and [conservation tests](packages/sim-core/tests/crankNicolson.test.ts).
- **Read the formal proofs:** [Lean companion repository](https://github.com/MaryShooshtari/psi-zoo-proofs)
  and [exact theorem-to-source map](docs/notebook/crank-nicolson.md#7-exact-statement-to-source-map).

The completed Lean proof chain establishes exact norm conservation, unique
solvability, explicit evolution, and matrix unitarity for the finite interior
Dirichlet model. **The TypeScript implementation is numerically tested, not
formally verified.** The notebook links the two kinds of evidence and states
what remains outside their scope. The Observer entry is bundled Markdown with
native MathML equations, rendered in a small browser notebook dialog without
new dependencies. The older CN entry remains documentation-only.

## Browser simulation

### 2D potential terrain (Slices 5A–5B)

Run `npm run dev` and select **2D Gaussian demo**. The grid has 128 × 128
**interior** points on x,y ∈ [−10,10], Δx=Δy=20/129, zero Dirichlet values on
all four unstored boundaries, ℏ=m=1 and fixed Δt=1/120. Defaults are center
(0,0), density standard deviations (0.8,0.8), momentum (0,0), V=0. The default
View / inspect tool never paints. Select **Barrier (+)**, **Well (−)**, or
**Eraser**, then click/drag with mouse, pen, or touch. Width sigma defaults to
0.7 and strength A to 2; both are adjustable. Gaussian stamps are truncated at
3 sigma, distance-interpolated independently of event frequency, and bounded to
[−20,20] energy units. Repeated passes add; erasing attenuates either sign.
The ring shows sigma, not the full cutoff.

The finite-difference method uses symmetric potential/Cayley splitting:
`P(dt/2) Cx(dt/2) Cy(dt) Cx(dt/2) P(dt/2)`. Row/column tridiagonal solves and
exact real-potential phase rotations are unitary in exact arithmetic, preserving
the **area-weighted** norm to roundoff. This is second-order, **not the full
unsplit 2D Crank–Nicolson update**. Norm preservation does not imply exact energy
preservation for a nontrivial static potential. V is frozen during each step.

**Play / Pause** remain independent of browser frame rate; painting also works
during playback, between complete steps. **Reset evolution** restores this
experiment's initial state/time and pauses, preserving terrain. **Clear terrain**
changes only V, not the packet or time. **Load preset** replaces both packet and
terrain at t=0. Switching dimensions disposes the inactive view and starts fresh.

Positive V is a barrier relative to zero; negative V is attractive. Painting is
an external Hamiltonian change, **not measurement**: it never collapses,
renormalizes or directly changes the wavefunction. Current expected energy can
jump by `dx*dy*sum rho*deltaV` when terrain changes; this is not a numerical
conservation failure. Static-H splitting drift is a separate source of error.

The density heatmap retains fixed navy-to-cyan brightness `1-exp(-ρ/0.08)`,
without autoscaling or phase coloring. A separately toggleable/cached terrain
overlay uses **warm positive / blue negative / transparent zero** energy colors
with adjustable opacity. Both layers preserve physical aspect ratio and exact
sample-center alignment. Hide the overlay to inspect density alone.

Load **scattering barrier**, Play, and inspect near t=2.4: an incoming packet
(center −4, px=3) encounters a full-height, smoothly edged V≈6 barrier. Outgoing
region masses are documented, **not a calibrated tunnelling percentage**; the
packet includes above-barrier momentum components. Load **attractive well** to
see evolution in a depth-5 Gaussian well, without assuming a single bound state.
For quantitative tunnelling, the existing validated 1D tunnelling preset remains
available. Finite walls, spatial dispersion and temporal errors remain. This
Gaussian mode has no creatures; the separate world mode is described below.
Neither mode includes spatial measurement, spatial entanglement or saving.
The creature world now supports mood-only measurements and entanglement (5D).
See [terrain validation, presets and limitations](docs/TERRAIN_2D_VALIDATION.md).

The [technical validation](docs/TWO_DIMENSIONAL_VALIDATION.md) documents the grid,
Gaussian convention, APIs, analytical comparisons, eigenmode phase, long-run
norm, static-V energy drift, convergence, memory and actual Chrome timings.

### 2D creature world (Slices 5C–5D)

Select **2D creature world**. Each creature has its own complex ψ; independent
creatures own pure mood qubits, while registered pairs share a two-qubit mood.
There is no joint spatial many-body wavefunction. The following drive/social
rules apply only between unpaired members; registered pairs are excluded. The same grid/terrain tools above are reused.
All means and moods are snapshotted before any creature advances; separate
potentials contain terrain plus `−F sz d·(x−center)` and other-creature
`−g₀ sz_a sz_b exp(−|x−μ_b|²/(2ℓ²))` terms, with no self-interaction. These
change spatial evolution through the unchanged Cayley solver, never scripted
movement. Mood evolution reuses `Hm=(ω/2)σx`. The complete feedback scheme is
generally **first-order**, despite the frozen linear solver's second-order accuracy.

- Start with two; **Add creature / Remove selected creature** supports one to four,
  preserving survivors and time. Selection changes only inspection.
- Toggle mood drives/social feedback and adjust social strength/range live.
- Each identity has a colored density, its own norm diagnostic and selected
  mean/width/Bloch/force inspection. **Show selected density only** resolves
  overlaps. Layers combine densities for display, **not coherent amplitudes**;
  each norm is one, while the integral of their sum equals creature count.
- **Reset evolution** restores the current roster's saved initial ψ/moods at t=0,
  preserving terrain and current interaction settings. **Clear terrain** preserves
  all live states, moods and time. **World presets** replace roster, initial
  conditions and settings at t=0, preserving terrain. Clear terrain first to
  reproduce the documented free-terrain examples.
- No conserved total many-body energy is claimed; world energy is not displayed.
  Signed terrain overlay colors remain separate from creature identity colors.

[Model, preset parameters, checks, measured timings and pending manual review](docs/WORLD_2D_VALIDATION.md).

### Two-creature 1D demonstration (Advanced / Legacy)

Starts paused with **Paint** selected, no terrain, and g=1.5. Two normalized
packets start at x=−1.5/+1.5 with density sigma=0.8 and momenta +0.5/−0.5 on
[-20,20], dx=0.1, dt=0.01. Opposite initial Bloch rz values and independent
qubit precession supply modest mood-dependent forces through the Hamiltonian.
No scripted positions or per-step normalization are used.

- **Play / Pause:** advance both creatures synchronously using fixed steps.
- **Creature A / B:** select the inspection and observation target. Inspect
  position expectation, spatial probability norm, mood norm and all three Bloch
  coordinates; the small diagram is an x–z projection, not a personality dial.
- **Social coupling:** choose g in [-3,3], then **Apply coupling & Reset**.
  Negative attracts, zero decouples, positive repels. The slider is pending until
  Reset; comparisons use identical initial packets and the same current terrain.
- **Reset:** pause, restore both initial states/time, apply pending coupling,
  clear both observation histories and rewind the seeded RNG; preserve terrain.
- **Load two-creature demo:** also clear terrain. **Clear Terrain** does not
  change either state, time, or play/pause status.
- **Paint / Observe:** paint barriers shared by both Hamiltonians, or use the
  existing Gaussian position observation on the selected creature only. The
  partner and both moods do not collapse. Per-creature result text and the white
  last-observation marker follow selection. The notebook is still available.

Cyan solid and rose short-dashed curves are **separate** probability densities on
the same fixed square-root-spaced scale. Faint fills identify the curves, not
complex phase or extra probability. Overlap is not coherent interference: no
cross-creature amplitudes are summed. The amber long-dashed curve shows shared
terrain only, not each creature's total mood/social potential.

Social potentials are g times the other density: a deterministic mean-field
model, **not entanglement or an exact two-particle wavefunction**. Frozen-density
feedback is first-order in time. Individual energies need not be conserved;
combined nonlinear energy is not exactly conserved by the numerical scheme.
Accordingly, the old static-energy drift and R/T readouts are not shown in this
mode. Finite grids, walls, strong coupling, sharp measurements, solver phase
error and safe-copying overhead remain limitations.
See [browser validation](docs/TWO_CREATURE_BROWSER_VALIDATION.md) and
[mathematical interaction validation](docs/SOCIAL_INTERACTION_VALIDATION.md).

### Retained single-packet presets

The following controls/readouts describe **Load free exploration** and **Load
tunnelling demo**, which remain available alongside the new default scene.

Free exploration starts paused with no terrain and **Paint** selected. Use **Play** and **Pause**
to evolve the packet. Paint and Observe are mutually exclusive. In **Paint**, press/drag inside the plot
with mouse, touch, or pen. Horizontal position sets the location; brush controls
set width sigma (0.3–2 spatial units) and height A (0.1–5 energy units). Defaults
are sigma=0.6 and A=1. Brush settings are held fixed until the stroke ends.
Sparse pointer events produce continuous strokes; repeated painting raises
terrain using max, not accumulation. Painting works paused or running and never
changes the wavefunction directly. Captured dragging outside clamps to the domain
edges; cancellation, focus loss, or disabling painting ends the stroke. Touch
scrolling is disabled over the canvas (scroll elsewhere on the page).

The **Initial momentum p₀** slider selects a value from −1.5 to +1.5; the default
remains +0.75. Negative launches left, zero spreads without drift, and positive
launches right in free space. **Selection only applies on Reset**: changing it
while playing does not kick or replace the live packet.

**Reset** pauses and regenerates the initial packet with the selected momentum at
t=0, **preserving terrain**. **Clear Terrain** removes barriers without changing
the packet, time, playback, or selected momentum. Reset uses the current mode's
initial center/width; it does not reload an edited or cleared barrier.

**Load tunnelling demo** pauses and replaces packet, terrain, time and momentum
selection with the validated large-domain setup: x in [-120,120], 2401 points,
dx=0.1, dt=0.02, center=-24, density sigma=3, p₀=1.5, Gaussian barrier centered at 0
with height 1.8 and width 0.6. Interaction returns to Paint. **Load
free exploration** explicitly returns to the original small free scene and
p₀=0.75. Mode loads replace terrain (and its array when changing grids); ordinary
painting, Reset and Clear Terrain preserve array identity.

Regional masses always come from actual ψ: left x<-4, interaction [-4,4], right
x>4. **Left mass includes the incoming packet and is not then reflection.** R/T
estimates appear only for the unchanged demo at t=40–44 after separation, with
negligible interaction/boundary mass. Expect R≈0.8002, T≈0.1998, with about
0.0015 absolute numerical uncertainty, not precision at all displayed digits.
Painting/clearing or resetting with another momentum invalidates quantitative
interpretation until a demo reload. Observation also immediately withholds R/T;
Reset clears the observation invalidation but does not repair edited terrain. Merely changing the pending selection does
not alter the current run. Outside the validated window, R/T is withheld.

The default incident mean kinetic energy (~1.137) is below the 1.8 peak, but that
alone would not establish tunnelling: its Gaussian high-energy tail is nonzero.
An incident over-barrier-tail bound <0.009755, convergence tests, and an independent
packet-weighted stationary benchmark support substantial sub-barrier transmission.
See [parameters, measured results, limitations and GIF capture steps](docs/SCATTERING_VALIDATION.md).

The plot displays cyan probability density on a **fixed square-root-spaced left
axis**, 0–10.5 at dx=0.1, and dashed amber V(x) on an independent **linear** right
axis, 0–5. Density tick labels are actual |ψ|² values, not square roots. A
normalized grid state has density at most 1/dx=10, so 5% headroom keeps even a
single-site peak visible. There is **no autoscaling** as the packet evolves.
The nonlinear display keeps broad packets legible, but geometric screen area is
not probability; compare the labeled densities and use the norm diagnostic.
Time, norm and energy come from the current state/terrain. Norm is conserved up
to roundoff. Energy is conserved during fixed-H evolution, **not across observation,
painting or clearing**; the displayed energy-drift reference resets at those
updates and Reset. The canvas updates immediately even while paused.

Free exploration defaults: x in [-20,20], 401 points, dx=0.1, dt=0.01, hbar=m=1,
V=0, center=-5, density standard deviation=1, momentum k0=0.75.
Dirichlet endpoints are zeroed before the single initial normalization. There is
no normalization during evolution. The momentum control keeps |p₀*dx| ≤ 0.15.
Continuum carrier velocity p₀ differs from finite-difference group velocity
sin(p₀*dx)/dx; finite packet width and CN temporal dispersion further affect its
centroid. See [velocity references and tolerances](docs/DIRECTED_GAUSSIAN_VALIDATION.md).
At long times the packet reflects from the Dirichlet walls; negative-momentum
packets start closer to their destination wall.

Playback uses elapsed wall time and fixed numerical steps, normally at one physical
time unit per wall second. Work is capped at eight steps per frame; excess wall
time after a stall is discarded rather than changing dt. Background tabs pause.
React diagnostics refresh at most ten times per second during playback/painting,
with a trailing update for the final paused edit; explicit buttons refresh
immediately. Canvas draws each frame and on terrain edits. Unmount cancels
playback, releases pointer capture, removes listeners, and clears pending UI timers.
Stale playback callbacks cannot restart a loop.

Vite, TypeScript, and Vitest resolve `@psi-zoo/sim-core` directly to its workspace
public source entry, avoiding stale installed workspace copies.

The Node-based Vitest setup tests playback with a fake frame scheduler, including
actual numerical acceptance results, diagnostics, refresh-rate independence,
terrain identity/solver propagation, reset versus clear, and disposal. Pointer
listeners are tested with an EventTarget/capture test double: CSS coordinate
mapping, plot edges, mouse/touch/pen strokes, cancellation, and cleanup, including
integration with the actual playback controller. It does not mount React, test
Canvas pixels, or emulate a real browser's capture implementation. See the
[manual browser checklist](docs/POTENTIAL_LANDSCAPES.md#manual-browser-checklist)
for device input, HiDPI, evolving density, and lifecycle regression checks. The
momentum-control review was accepted by the user with Phase 3A. The user reports
8/8 Phase 3B browser acceptance checks passed. The
[retained browser regression checklist and capture provenance](docs/SCATTERING_VALIDATION.md#browser-behavior-and-remaining-manual-checks)
distinguish that acceptance from the coding agent's actual Chrome demo capture;
the capture does not itself repeat all device/input acceptance checks.

## Observe and learn — Slice 3

![Authentic paused observation in the running app, with sampled-position marker and unclipped localized density](docs/media/observer.png)

In two-creature mode first select A or B; the same detector acts only on that
creature, with no partner measurement. The white marker follows its selected
history. The historical screenshots and magenta marker description below refer
to the retained single-packet mode.

Select **Observe** and click anywhere inside the plot, or focus **Observe particle**
and press Space/Enter. One action samples one outcome using the existing
finite-resolution Gaussian POVM. **The click triggers measurement; it does not
choose the position.** The magenta line/diamond and result text record the actual
sampled position and time, not a tracked particle. Observation works paused or
playing, preserves time and terrain, and replaces the wavefunction with the
normalized conditional state. Play then continues the same CN evolution.
Free packets re-spread; arbitrary painted potentials need not broaden monotonically.

**Measurement resolution σ** is the detector response width in spatial units,
not necessarily the resulting packet width. Smaller σ means sharper measurement.
The slider runs from 0.2 to 2.0 (default 0.4; dx=0.1, initial free density width=1).
The response is normalized separately for each input site over interior outcomes,
including near boundaries. This is not exact coordinate projection or a detailed
apparatus model, and arbitrary post-measurement states need not be Gaussian.

**Why did it jump?** opens the notebook next to the observation controls and
pauses playback for reading. Start with the intuitive explanation; expand the
detector mathematics, evolution/energy explanation and Lean evidence when ready.
The last observation supplies a clearly labeled numerical example, including its
discrete P(j), not a probability density. Close or Escape returns focus to the
trigger; use Play to resume. Equations use native MathML in modern browsers.

![Authentic notebook screenshot showing rendered detector equations](docs/media/observer-notebook.png)

The controller owns a seeded 32-bit LCG (default seed **831**, configurable through
its constructor). Only observation actions consume randomness; rendering, reading
diagnostics and changing sliders do not. Identical initial conditions, seed and
actions at the same numerical steps reproduce the results. Wall-clock clicking
on different frames is not a reproducible action schedule. **Reset and preset
loads rewind the RNG and clear the marker/count/result**; resolution is retained.
Reset pauses, restores initial time/packet with the selected momentum, and
preserves terrain, as before.

Measurement remains synchronous O(N²) and can underflow extremely small tails.
Repeated sharp observations can produce near-grid-scale states: normalization
and CN stability do not establish continuum accuracy there. TypeScript sampling,
IEEE-754 error and underflow are not formally verified. The companion now also
has exact finite weighted POVM and Gaussian-response models at the museum's
pinned commit; this is not verification of the running browser. The exact
coordinate-projection theorem concerns a different operator; see the
[notebook](packages/web/src/content/notebook/observer.md) and
[release validation](docs/OBSERVER_VALIDATION.md) for precise scope.

## Local development

Requires Node >=22.19 and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

## Validate changes

```bash
npm run test
npm run typecheck
npm run build
```

Reproduce the deterministic headless scattering report (existing dev dependencies):

```bash
node scripts/scattering-report.mjs
```

Run the real Chrome integration checks (uses an installed Chrome, no added packages):

```bash
npx tsc --project packages/web/tsconfig.world2d.json
node scripts/world-2d-browser-check.mjs
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs --no-screenshots
```

Set `CHROME_PATH` if Chrome is not installed at the script's Windows default.
The new checker can save a temporary genuine screenshot with `--screenshot`;
legacy `--no-screenshots` preserves existing historical media. Capture the new
Slice 4 GIF without overwriting historical recordings:

```bash
node scripts/capture-observer-gif.mjs --creatures
```

## Directory structure

- `packages/web/src/world/`: browser-independent 1D/2D worlds, presets and mood-pair registry
- `packages/sim-core/src/joint-qubit.ts`: mood-only two-qubit math
- `docs/ENTANGLEMENT_2D_VALIDATION.md`: Slice 5D model, evidence and manual review
- `docs/WORLD_2D_VALIDATION.md`: Slice 5C model, controls, evidence and performance limits
- `scripts/world-2d-browser-check.mjs`: real Chrome world integration checks/benchmarks
- `docs/TWO_CREATURE_BROWSER_VALIDATION.md`: controls, browser checks and limitations
- `scripts/creature-browser-check.mjs`: real Chrome two-creature integration checks
- `packages/sim-core`: dependency-free numerical state, observables, and tested Crank–Nicolson solver
- `packages/web`: React + Vite + Canvas renderer and a small Markdown/MathML notebook
- `packages/web/src/content/notebook/`: browser notebook entries with frontmatter
- `docs/OBSERVER_VALIDATION.md`: Slice 3 checks, limitations and authentic screenshot provenance
- `scripts/observer-browser-check.mjs`: dependency-free Chrome acceptance checks and screenshots
- `scripts/capture-observer-gif.mjs`: authentic browser GIF capture and native-decoder verification
- `docs/PROJECT_SPEC.md`: initial project handover
- `docs/ROADMAP.md`: vertical slices
- `docs/notebook/`: Markdown explanations, derivations, and links to checked Lean statements
- `docs/FREE_GAUSSIAN_VALIDATION.md`: measured numerical results and tolerance rationale
- `docs/SCATTERING_VALIDATION.md`: scattering/tunnelling results, convergence, tail bound, browser review and GIF capture
- `scripts/scattering-report.mjs`: reproducible development-only numerical report
- `AGENTS.md` and `.pi/prompts/`: coding agent guardrails and shortcuts

The separate [companion repository `psi-zoo-proofs`](https://github.com/MaryShooshtari/psi-zoo-proofs)
contains the completed Crank–Nicolson matrix proof chain in Lean 4 + Mathlib.
See its [proof index and build instructions](https://github.com/MaryShooshtari/psi-zoo-proofs#completed-cranknicolson-proof-chain)
and the [lab-notebook explanation](docs/notebook/crank-nicolson.md).
