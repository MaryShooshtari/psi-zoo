# Slice 5C — independent 2D creatures on shared terrain

> Historical 5C acceptance record. Slice 5D now extends mood ownership and the
> inspector with genuine **mood-only** pairs; the spatial solver is unchanged.
> [Current pair lifecycle, feedback safeguards and validation](ENTANGLEMENT_2D_VALIDATION.md)
> supersede the no-entanglement scope and 1–16 headless population note below.
> Both world API and UI now enforce one through four creatures.

## Status and scope

Implemented for review, with **355 tests in 30 files**, typecheck, production
build, a separate DOM-free world compile, and real Chrome checks passing:
**21 world**, **21 Gaussian/terrain**, **22 existing 1D creature**, and
**14 Observer** checks. All 335 pre-5C tests remain unchanged. Human visual,
accessibility, touch/pen, narrow-screen, and long-session acceptance remains open.

This slice adds **independent states with approximate centroid/mood feedback**,
not a joint tensor-product state, entanglement, coherent interference between
creatures, exchange statistics, exact many-body dynamics, or a derived physical
interparticle law. No 2D measurement, goals, reproduction, saving, procedural
world generation, or Slice 5D+ work. No dependencies or Lean changes. No commits.
The [5A](TWO_DIMENSIONAL_VALIDATION.md) and [5B](TERRAIN_2D_VALIDATION.md)
records remain historical evidence for the unchanged numerical foundation.

## Launch, controls and deterministic scenes

Run `npm run dev` and select **2D creature world**. The existing 1D scenes remain
the app default; **2D Gaussian demo** remains a separate retained mode. Changing
modes disposes the old animation/pointer bindings and starts the new view fresh.

The world starts paused with A/B, no terrain, and the **mood drive** scene.
Same grid and units: 128×128 **interior** samples on [-10,10]²,
Δx=Δy=20/129, ℏ=m=1, zero unstored Dirichlet boundaries, fixed Δt=1/120.
Each spatial state has its own area-weighted norm one. Moods are independent
normalized complex two-component vectors, with no ψ–mood entanglement.

- **Play / Pause:** existing fixed-step scheduler, at most eight complete world
  steps per animation frame. Stalls/background tabs never enlarge physics Δt.
- **Creature A/B/C/D:** select inspection, never reset or modify any state.
- **Show selected density only:** rendering-only overlap inspection.
- **Add creature:** select a deterministic missing-ID template; preserve all
  existing spatial states, moods and world time. Initial population two, UI max
  four, minimum one. **Remove selected creature** keeps the survivors untouched;
  selection falls back to the first stable ID if necessary.
- **Mood drives**, **Social interactions**, **Social strength**, **Social range**
  change effective Hamiltonians live, not state, mood, terrain or time. Spatial
  phases can consequently differ on the next step. The mood unitary keeps
  running even if its spatial drive is disabled.
- **Reset evolution:** pause, restore each *current roster member's* saved initial
  spatial state and mood at t=0. Preserve terrain, selection, parameters and
  current interaction settings. Added members retain their own template initial
  conditions; removed members are not resurrected.
- **Clear terrain:** change only shared terrain, preserving all live states,
  moods, time and playing status.
- **World: ...** presets: pause, replace roster, saved initial states/moods,
  parameters and interaction settings at t=0; **preserve painted terrain**.
  Gaussian experiment buttons are hidden in world mode because their separate
  semantics replace both terrain and the single Gaussian.
- Existing signed Barrier/Well/Eraser tools and cached terrain overlay are reused.
  Live strokes run between complete synchronous world steps. No measurement,
  normalization, direct ψ displacement, or terrain contribution from creatures.

For reproducible examples, **Clear terrain**, then choose a world preset.
Both packets start at (-1.5,0)/(1.5,0), density σx=σy=0.7, zero momentum,
F=0.3, directions A=(1,0), B=(0,1). A starts |0⟩. Social g₀=3, ℓ=2.

| Scene | B mood | ω for both | Drives | Social |
|---|---|---:|---|---|
| independent | \|0⟩ | 0.8 | off | off |
| mood drive | \|1⟩ | 0.8 | on | off |
| attraction | \|0⟩ | 0 | off | on |
| repulsion | \|1⟩ | 0 | off | on |

Missing A/B templates start at x=−1.5/+1.5; C/D at y=−2.5/+2.5, with σ=0.7,
zero momentum, mood |0⟩, F=0.25, direction (0,1), ω=0.7. Templates restore
missing IDs rather than duplicate them. The headless model has a configurable
maxPopulation (1–16); the browser deliberately limits it to four.

## Equations and ordering

For creature a, `evolveQubit` is reused without changes, with
`{ ax: omega/2, ay: 0, az: 0 }`:

```
Hm,a = (omega_a/2) sigma_x
q_a(t+dt) = exp(-i Hm,a dt) q_a(t)
sz,a = <q_a | sigma_z | q_a>
```

For initial |0⟩, α=cos(ωt/2), β=−i sin(ωt/2), and
Bloch (x,y,z)=(0,−sin(ωt),cos(ωt)). No per-step mood normalization.
The scalar spatial Hamiltonian is:

```
H_a = -1/2 Laplacian_h + V_terrain + V_drive,a + sum_(b != a) V_ab
V_drive,a(x,y) = -F_a sz,a d_a · ((x,y) - domain_center)
V_ab(x,y) = -g0 sz,a sz,b exp(-|(x,y)-mu_b|²/(2 ell²))
```

Directions are normalized once on ownership. The drive force is +F sz d.
Same-sign sz gives an attractive Gaussian well at the other mean; opposite
signs give a repulsive bump; near-zero sz weakens either rule. There is no
self-interaction. Means are **area-weighted expectation values** of each own ψ,
not scripted positions or random correlated variables. This centroid potential
is not a full density convolution/Hartree interaction.

A complete world step is synchronous:

1. **A:** snapshot *all* pre-step means, Bloch z values and parameters.
2. **B:** construct *all* separate effective-potential arrays using this snapshot
   and the canonical terrain. Sort/sum sources by stable lexical ID.
3. **C:** advance every spatial candidate with its frozen effective potential,
   using unchanged `P(dt/2) Cx(dt/2) Cy(dt) Cx(dt/2) P(dt/2)`.
4. **D:** advance every mood with its own exact qubit unitary.
5. **E:** swap all candidate buffers/moods and commit world time together.

No creature sees a neighbor's partially advanced state. Candidate buffers make
state/time commit transactional if a numerical phase throws. Scratch potentials
may change, but uncommitted candidates are not observable as live states.
Ordinary spatial propagation never normalizes. Initialization and reset are
separate actions.

The frozen **linear** propagator is second-order and norm-preserving up to
floating point. The complete endpoint-frozen **feedback scheme is generally
first-order**, even with exact mood evolution. It is not full unsplit 2D CN.
Individual energies can vary through mood, social feedback and terrain edits;
no conserved total many-body energy is claimed. World UI deliberately omits
an energy readout; “Social V at mean” is a potential value, not an expectation
or conserved total. Old Gaussian energy diagnostics remain unchanged.

Terrain is never overwritten or clamped by interactions. Only player terrain
uses ±20 bounds; effective potentials can exceed them. API validation uses
finite F∈[0,1], nonzero finite directions, finite ω, g₀∈[0,10], ℓ∈[0.2,10],
compatible physical geometry and initial spatial/mood norms within 1e−10 of one.
UI uses smaller social ranges (g₀=0–6, ℓ=0.5–4).

## Numerical evidence

Tests use independently specified scalar formulas, analytic mood amplitudes,
and full **complex-state** comparisons, not screenshots as evidence of physics.

| Check | Result |
|---|---|
| Disabled interactions vs existing one-wavefunction solver, nonzero well, 100 steps | **bit-identical amplitudes** |
| Single default Gaussian vs existing playback ψ stepped by existing core, 80 steps | **bit-identical amplitudes** |
| Three-creature input registry reversed, coupled 100 steps | full-state L² difference **0**, identical moods and effective potentials |
| Mood-only 10,000 steps | max norm/Bloch-radius drift **7.98694e−13** |
| Three coupled creatures, 32×27, dt=1/120, 1,000 steps, static well | max individual spatial norm drift **2.63123e−13**, mood norm/radius drift **7.68274e−14** |
| Gaussian separable optimization vs direct `exp(-(X²+Y²)/2)` scalar reference | all tested values within **2e−14** |

Norm tolerances of 1e−10 leave conservative floating-point accumulation margin,
not a statement about continuum spatial accuracy. Changing global propagation
phases is **not** factored out of the full-state comparison.

At default 128×128, zero terrain, dt=1/120, t=2 (240 actual steps):

| Scene | A mean (x,y) | B mean (x,y) |
|---|---|---|
| independent | (−1.49999999, 0) | (1.49999999, 0) |
| mood drive | (−1.01976915, 0) | (1.49999999, −0.48022412) |
| attraction | (−0.25736194, 0) | (0.25736194, 0) |
| repulsion | (−2.56639462, 0) | (2.56639462, 0) |

Individual norm errors in these scenes are below 2e−13. These controlled
counterfactuals demonstrate genuine potential-mediated behavior before
substantial wall returns, not exact infinite-domain centroid trajectories.
Tests also compare F=0 against nonzero F with identical evolving moods,
one creature vs an uncoupled pair, and an interacting pair vs its free baseline.

**Coupled convergence:** fixed 32×27 grid on [-10,10]²; mood-drive scene with
social feedback enabled (g₀=2, ℓ=2), depth-one Gaussian terrain well centered
(0.2,−0.1), sigma=2; endpoint t=1. Compare combined area-weighted complex-state
L² error over both creatures against dt=1/1600 on the **same grid**:

| dt | error | ratio on halving |
|---:|---:|---:|
| 0.04 | 0.01193896260 | 2.01988 |
| 0.02 | 0.00591072751 | 2.06038 |
| 0.01 | 0.00286875617 | — |

Max Bloch-vector discrepancy versus that fine reference is 8.74e−14.
Ratios lie in the tested [1.7,2.3] band around first-order behavior (including
finite reference-step effects). This tests time refinement of the implemented
mean-field model, not continuum convergence or an exact many-body solution.
The retained 5A frozen-linear tests still show approximately fourfold error
reduction on halving dt.

Lifecycle tests compare **every amplitude and mood component** around shared
terrain edits/clear, selection, add/remove, and resets; world time and the other
creatures remain continuous. They verify that the next step uses edited terrain
for all creatures; partner removal removes its social potential; current-roster
reset and each preset are reproducible; and invalid/overflow steps do not
partially commit. Renderer tests verify phase-insensitive overlapping density
layers, row orientation, summed density integral equal to creature count,
input nonmutation, and nonfinite-density rejection.

## Rendering and ownership

`QuantumWorld2D` and presets are browser-independent TypeScript, separately
compiled with **ES2022 only, no DOM types**. They borrow terrain for whole steps.
`SimulationPlayback2D` retains sole canonical terrain/revision ownership,
existing scheduling, reset/clear and generation-based disposal. An optional
world mode swaps only its evolution branch. No second terrain manager, solver,
animation loop, qubit implementation or generic engine rewrite.

Each creature owns live/candidate/initial complex buffers, live/initial mood,
its own effective potential, cached kinetic stepper and two 1D interaction
workspaces. `state()` and `effectivePotential()` are diagnostic **copies**;
frame rendering instead fills reusable density arrays. Metadata-only use of
playback's original `psi` does not make it a third world creature; that legacy
Gaussian state/stepper remains allocated to keep the old API branch unchanged.

Social construction is O(C² nx ny), with Gaussian separability reducing expensive
exponentials to O(C²(nx+ny)); no FFT or physical approximation is introduced by
this algebraic optimization. Buffers are reused; no full-grid allocations per
normal step. Small snapshot/mood objects remain allocated. Stable source ordering
is independent of insertion/storage order.

Four fixed identity colors (cyan/rose/gold/green) label separate density layers.
Each uses fixed `f(rho)=1-exp(-rho/0.08)` brightness. RGB contributions are added
and display-clamped; **amplitudes are never combined** and overlap colors are
not an interference pattern. There is no per-frame autoscaling or normalization
of a summed distribution. Each norm is one; ∫Σρ equals C. The selected-only
view avoids overlap saturation. Individual norm, means, widths, full Bloch vector,
mood norm, F, direction, ω, drive force and social V at mean are inspectable.
Both density and terrain reuse the same exact sample-center/aspect mapping.
Terrain colors still mean signed energy, independently toggleable/adjustable.

## Measured Chrome performance and memory

Windows, Node 24.20.0, Headless Chrome 155, `--disable-gpu`, default 128×128,
dt=1/120. After 30 warmups, average of 200 steps; all step cases include a
nonzero barrier. Enabled coupling means **both drives and social feedback**.
Render figures use 10 warmups/100 draws, 1000×520 Canvas2D, no terrain overlay.
Machine/JIT/load dependent, not acceptance thresholds:

| Operation | Latest mean ms |
|---|---:|
| One creature, interactions off, whole step | 2.080 |
| Two creatures, interactions off, whole step | 4.115 |
| Two creatures, interactions on, whole step | 4.509 |
| Four creatures, interactions on, whole step | 13.427 |
| Two-creature potential construction alone, precomputed means, reused buffers | 0.458 |
| Two-creature preparation including mean/Bloch snapshot | 1.109 |
| Two-creature complete diagnostic snapshot | 0.884 |
| Two colored density layers | 4.440 |
| Four colored density layers | 9.698 |

Prior to separable construction, an initial run measured two/four coupled steps
at 7.89/36.31 ms; these are separate runs, not a controlled speedup guarantee.
A second optimized run measured four at 10.33 ms, illustrating variability.
Latest real UI playback advanced 0.733 physical seconds during 0.7969 wall
seconds including polling/pause overhead. **Four creatures exceed the 8.33 ms
step budget on this configuration and can visibly lag wall time.** No grid,
dt or physics reduction hides this limitation; the fixed-step controller caps
catch-up work and never substitutes scripted movement. Two-creature default is
the responsive target; broader device performance requires human review.

At default resolution, each creature owns about **910 KiB** in persistent
numerical buffers (3×256 KiB complex states, 128 KiB effective V, 12 KiB solver,
2 KiB interaction lines; plus tiny moods/objects). Two/four add about 1.78/3.55 MiB.
Playback retains the existing approximately 652 KiB Gaussian/terrain allocation.
Colored rendering adds C×128 KiB density arrays plus about 128 KiB staging image
and surface; cached terrain adds about 256 KiB. Combined owned numerical and
offscreen buffers are roughly **3.04 MiB for two / 5.07 MiB for four**, excluding
visible HiDPI canvas backing, React/browser overhead, GC and transient snapshots.

## Reproduction and outstanding review

```bash
npm run test
npm run typecheck
npm run build
npx tsc --project packages/web/tsconfig.world2d.json
node scripts/world-2d-browser-check.mjs
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs --no-screenshots
```

Chrome scripts use installed Chrome; `CHROME_PATH` overrides the Windows default.
The world script checks the actual UI, native mouse painting paused/running,
individual norms, mood/density evolution, toggles, selection, add/remove/limits,
reset/presets/clear, mode switching/frame disposal, and runs the above warmed
benchmarks. No internal live states are exposed globally. Historical screenshots
were preserved after regression checks; no invented or newly claimed visual proof.

One intermediate world-browser attempt timed out at the initial-page readiness
wait (`Timed out waiting for browser condition`); rerunning passed. Error logging
was added for diagnosis; subsequent completed runs reported no runtime/console
errors. This is recorded as harness/startup uncertainty, not a numerical failure.

Still manual: visual separability of four colors and signed terrain, color-vision
and screen-reader usability, keyboard flow, narrow screens/HiDPI, touch/pen
capture/cancellation, sustained playback and thermal/low-power behavior. In
particular review four-creature responsiveness and overlapping/saturated layers.
No claim of full human acceptance or subsequent-slice completion is made.
