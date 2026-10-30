# Slice 5B — interactive 2D potential terrain

This is the historical 5B validation record. The single-Gaussian mode remains
available unchanged in purpose; [Slice 5C](WORLD_2D_VALIDATION.md) adds a separate
independent-creature world using the same terrain, solver and playback owner.
The no-creature scope and 335-test counts below describe 5B, not the current app.

## Launch and actions

Run `npm run dev`, open the Vite URL, select **2D Gaussian demo**. The default
remains 128×128 interior points on [-10,10]², dx=dy=20/129, dt=1/120,
hbar=m=1, with zero unstored Dirichlet boundaries. The initial free packet has
center (0,0), position-density widths (0.8,0.8), momentum (0,0).

- **View / inspect** is the initial tool and never paints.
- **Barrier (+)** adds positive potential energy; **Well (−)** adds negative
  potential energy. Neither directly changes probability density.
- **Eraser** smoothly attenuates either sign toward zero, without flipping sign.
- Brush radius is Gaussian **sigma**, initially 0.7; the cursor ring shows sigma,
  not the full support. Strength initially A=2; UI ranges are sigma=0.2–2 and
  A=0.2–10. Erasing is always full-strength, so its strength slider is disabled.
- Click or drag using mouse, pen, or touch. Tools are labeled, not color-only.
  Width/strength are disabled in View. Settings changes cancel an active stroke.
- **Show potential** and **Overlay opacity** affect rendering only. Hide the
  overlay to inspect the original density heatmap alone.
- **Reset evolution** pauses and restores the current experiment's initial
  complex state and t=0, **preserving edited terrain**.
- **Clear terrain** zeros only V; the current state, time and play/pause status
  are preserved.
- **Load preset** explicitly replaces V and the experiment's initial/live packet,
  pauses, and sets t=0. Subsequent Reset uses that preset's initial packet.
- Changing dimensions disposes the inactive view and starts a fresh view, as in
  5A. Background tabs pause and cancel painting. No inactive experiment is saved.

## Physics and energy interpretation

The existing Hamiltonian is `H=-1/2 Laplacian + V`. Positive values are barriers
relative to the zero reference; negative values are attractive wells. Neither
sign alone specifies a transmission coefficient or guarantees trapping.

Painting is an external Hamiltonian intervention, **not a position measurement**.
At an edit, the full complex state and its norm remain unchanged:
`psi(t+)=psi(t-)`. There is no collapse, per-edit normalization or time reset.
For a fixed state the instantaneous energy jump is

`deltaE=dx*dy*sum |psi_ij|²*(Vnew_ij-Vold_ij)`.

The UI displays the current `<psi|H_current|psi>` and terrain revision. It does
not disguise external energy changes by subtracting a reset reference, nor label
them conservation failures. Under an unchanged potential, symmetric splitting
still has numerical energy drift, distinct from changes caused by editing.
Probability norm remains conserved to roundoff for every real potential step.

**No solver was replaced or modified.** The exact same 5A symmetric Cayley
sequence is used: `P(dt/2) Cx(dt/2) Cy(dt) Cx(dt/2) P(dt/2)`. A complete
synchronous stamp runs between complete synchronous propagation steps on the
main thread. The stepper reads current V for both half-potential phases and
caches only kinetic factors. In-place potential changes require no new stepper,
no changed array identity, and no potential-cache invalidation in the integrator.
This is piecewise-constant, externally edited V, not a general time-dependent
Hamiltonian quadrature or energy-conserving closed-system model.

## Ownership and mutation

`potential2d.ts` contains pure numerical, explicitly in-place helpers operating
on caller-owned potential arrays, plus smooth barrier/well generators. Input
validation on creation/load checks the entire field. Stamping checks dimensions,
parameters and finite values in its local clipped rectangle **before** modifying
that rectangle. Values outside the support are not scanned per stamp; callers
must not externally corrupt an owned field after initial validation.

`SimulationPlayback2D` itself owns the terrain model; a second terrain manager
was unnecessary. It has a private persistent Float64Array of nx*ny real values,
independent of psi. Input arrays are copied. `potential` returns a fresh copy for
inspection; `copyPotential(out)` supports reusable renderer storage. Neither
exposes writable internal terrain. The controller validates initial values and
applies its configurable positive `potentialLimit`, default **20**. Out-of-range
custom initial terrain/presets are rejected; edits clamp to [-limit,limit]. This
is an editor constraint, not a restriction added to the sim-core propagator,
which still accepts finite real potentials under its existing arithmetic limits.

Every effective stamp increments `terrainRevision`. No-op stamps/clears do not.
Loading a preset increments the revision even for identical terrain, explicitly
invalidating the replaced experiment. Terrain statistics are lazy and refreshed
once after a batch of local stamps, not by rescanning the field for each stamp.
The UI batches a pointer event's interpolated stamps, redraws once per event,
and throttles React diagnostics to approximately 10 Hz with a trailing update.
Headless callers can inspect `snapshot()` after stamping; `stamp()` itself does
not publish a callback for every interpolated stamp.

## Brush and stroke discretization

A barrier/well stamp adds `+/- A exp(-r²/(2 sigma²))`, then clamps the result.
The Gaussian is **truncated at r<=3 sigma**. Only the clipped support rectangle
is traversed, with a radial cutoff inside it. Boundary stamps do not wrap.
Full-strength erasing multiplies by `1-exp(-r²/(2 sigma²))` over the same disk.
For valid bounded input this always reduces magnitude without reversing sign.
A discontinuous cutoff remains at the small exp(-4.5) tail; this is a brush
approximation, not a new boundary condition for the wavefunction.

`DistanceStroke2D` stamps once on pointer-down, then at fixed arc-length spacing
`h=min(sigma/2,dx,dy)`, carrying the unused distance between events and around
polyline corners. Pointer-up consumes its final segment but adds **no arbitrary
endpoint stamp**. A click is exactly one stamp. Holding still adds no stamps.
Repeated spatial passes accumulate, potentially reaching the bound even within
one default long stroke. Amplitude is per spatial stamp, not per second/event;
changing grid spacing or brush width can therefore change the accumulated ridge.

For the same geometric polyline, event subdivisions produce only floating-point
roundoff differences. A curved gesture reported as different polylines need not
be identical; unreported curvature cannot be reconstructed. Extremely long
segments (>100,000 stamps) are rejected to prevent unbounded synchronous work.
The UI's domain and brush limits are far below that threshold.

Pointer Events use capture, a single active primary pointer, only the primary
button, and cancellation on pointercancel/lostcapture/blur/unmount. Leaving the
physical domain cancels a stroke rather than drawing a shortcut through the
letterbox. No touch scrolling is applied to the canvas. Settings are frozen
within a stroke; tool/control changes cancel it.

## Shared physical mapping and rendering

`densityViewport2D` preserves the physical domain's aspect ratio. Pointer mapping
converts client coordinates through the element bounding rectangle to logical
CSS drawing units, accounting for CSS scaling independently of device pixel
ratio/backing-store size. It rejects letterboxing and reverses y: physical y
increases upward. Both layers and the cursor use the same physical transform.

To align painted sample centers exactly with the numerical coordinates, the
interior image is inset by **half a physical grid cell** from each boundary.
Its nx×ny texture cells then have physical widths dx,dy and centers exactly
`xmin+(i+1)dx`, `ymin+(j+1)dy`. This narrowly corrects 5A's display-only convention
of stretching stored interior samples across the entire domain; no physics grid,
state or 5A numerical test changes. The remaining half-cell margin is dark.

Density retains fixed navy-to-cyan brightness `1-exp(-rho/0.08)`. Potential is a
**separate optional layer**: positive warm RGB(255,105,65), negative blue
RGB(95,125,255), zero transparent. Alpha is `min(1,|V|/20)` multiplied by the
user's opacity (initially 0.6). The legend labels these as energy units, not
probability. Blending can obscure density, hence the explicit visibility switch.

`render/potential2d.ts` reuses ImageData, staging Canvas and a private Float64
inspection buffer. Its cache key includes terrain revision, dimensions, scale
and opacity. Unchanged terrain is not copied/recolored every frame. Hidden
potential does not rebuild; reenabling rebuilds if its key changed. Layers never
modify psi or V. Rendering uses Canvas2D only.

## Reproducible presets and scattering evidence

Preset definitions are headless in `terrainPresets.ts`, not in the integrator.
All retain the current grid; the UI uses the default grid/domain throughout.

| Preset | Potential | Initial Gaussian |
| --- | --- | --- |
| Free | zero | center (0,0), sigma=(0.8,0.8), p=(0,0) |
| Scattering | `3*[tanh((x+0.4)/0.22)-tanh((x-0.4)/0.22)]`, invariant in y | center (-4,0), sigma=(0.8,1), p=(3,0) |
| Well | `-5 exp(-(x²+y²)/(2*1.5²))` | center (-2,0), sigma=(0.8,0.8), p=(0.7,0) |

For scattering, click **Load scattering barrier**, Play, then Pause near **t=2.4**.
A positive full-height vertical barrier prevents bypass around its y ends. Hide
the overlay to inspect outgoing density. Reload to compare identical conditions;
choose Free only to restore the centered baseline (the headless benchmark uses
the *same incoming packet* with V=0 for a controlled comparison).

At 128×128, dt=1/120, t=2.4 (288 steps), area-weighted region masses are:

| Potential | x<-1 | -1<=x<=1 | x>1 | Mass where abs(x)>8 |
| --- | ---: | ---: | ---: | ---: |
| Barrier | 0.56517018 | 0.11367882 | 0.32115100 | 0.00014682 |
| Free, same incoming packet | 0.00804671 | 0.09501224 | 0.89694105 | 0.00026456 |

Initial mass at x>1 is **3.36406e-10**. Norm errors are respectively
2.22e-13 and 2.16e-13. Tests require sensible redistribution relative to free
propagation, not an arbitrary exact tunnelling fraction.

**These masses are not calibrated R/T coefficients or a demonstrated pure
sub-barrier tunnelling percentage.** Some probability remains near the barrier;
the initial momentum distribution has an above-barrier tail; finite spacing,
finite boundaries, and their small tails still matter. No separation-window,
continuum convergence or boundary-return budget is asserted for this preset.
For the project's quantitatively validated tunnelling experiment, return to the
existing **1D simulations → Load tunnelling demo** and follow
[its validation](SCATTERING_VALIDATION.md). Terrain editing invalidates an
unchanged-preset comparison. Do not infer tunnelling solely from cloud appearance.

For attraction, **Load attractive well**, Play through t≈1–3, and compare to a
reloaded baseline or clear terrain. This shows response to a negative potential;
it does not prepare a single bound state or assert that every packet is trapped.

## Executed tests and measurements

Baseline: 314 tests, typecheck/build passed. Slice 5B: **335 tests in 27 files**,
including every existing 5A/1D/creature/Observer test unchanged, typecheck/build
passed. New tests cover local stamps, sign/symmetry/cutoff/bounds/validation,
ownership/revisions, erasure, residual strokes, pointer lifecycle, coordinate
mapping, cache invalidation, presets and the following physics evidence:

- Sparse (1 segment) versus dense (117 segments) delivery of the same eight-unit
  horizontal path on a 71×53 grid: maximum cellwise potential difference
  **1.33227e-14** (test bound 1e-11), with no gaps and identical stamp counts.
- Static terrain, 42×35, dt=1/120, 1,000 steps: maximum norm drift
  **1.76081e-13** barrier, **2.61569e-13** well, **2.14495e-13** mixed sign.
- Repeated sign-changing edits every 17 steps over 500 steps, 35×28,
  dt=1/120: maximum norm drift **1.56763e-13**; each edit leaves the full complex
  amplitude array bit-identical before the next propagation step.
- Instantaneous-energy check, 48×39: independent density-weighted deltaV sum
  **0.7759003265388652**, measured energy jump **0.7759003265388656**, difference
  **4.44e-16** (test tolerance 2e-14). Psi and norm are unchanged immediately;
  the next step differs from evolution with the previous potential.
- Scattering-preset static-H energy drift through t=2.4, default grid:
  **5.89070e-4**, **1.47448e-4**, **3.68721e-5** for dt=1/60,1/120,1/240.
  Refinement is approximately fourfold, not exact energy conservation.
- All original 5A Gaussian, eigenmode, reversal, 10,000-step norm and full-state
  temporal-convergence tests remain unchanged and pass.

One initial parallel-suite run exceeded Vitest's default 5,000 ms timeout in the
new full-resolution three-dt energy benchmark; the benchmark now has an explicit
20-second timeout. No grid, timestep, physics assertion or tolerance was weakened.

### Browser and performance

Executed real Chrome 155 automation passes **21 2D checks**, including the seven
5A checks and fourteen terrain additions: zero initial V/View, native barrier
click/drag, well, erasing, overlay response/toggle continuity, live painting,
reset/clear/preset semantics, and resized CSS-scaled HiDPI painting. Browser
checks inspect numerical UI diagnostics and actual canvas output; no mutable
quantum state is exposed globally. Existing **22 creature** and **14 Observer**
Chrome regressions also pass with no runtime/console errors. Regression-generated
historical Observer screenshots were restored, not included as unrelated changes.

Warmed headless Chrome, GPU disabled, same desktop and comparable 5A conditions:

| Operation | Slice 5B mean | Historical 5A |
| --- | ---: | ---: |
| Free physics step, 128×128, 30 warmups/300 steps | 1.34 ms | 1.89 ms |
| Nonzero barrier physics step, same counts | 1.66 ms | — |
| Density-only 1000×520 draw, 10 warmups/100 draws | 1.58 ms | 2.16 ms |
| Density + cached potential draw | 1.10 ms | — |
| Density + invalidated potential draw | 1.23 ms | — |
| Local sigma=0.7 stamp, 1,000 varying centers | 0.0203 ms | — |

The cached overlay rebuilt **once** through warmup plus 100 unchanged draws.
Later combined-render runs benefited from additional JIT warmup; these timings
are not a claim that adding an overlay accelerates rendering. Measurements are
synchronous CPU-side calls, not compositor completion fences or universal device
budgets. Real free playback advanced **2.108 physical seconds in 2.1454 wall
seconds**; live native painting remained responsive and kept norm near one.
No substantial regression was observed on this machine. Nonzero potential adds
phase trigonometry; density generation/drawing and numerical stepping remain the
main recurring work. Rendering and stats are batched per pointer event, never
per changed cell/stamp. Slow devices or large brushes can still stall frames;
fixed dt is never increased to hide that cost.

Persistent numeric simulation buffers remain 652 KiB including the reset copy.
The potential overlay adds approximately **128 KiB** for Float64 inspection,
**64 KiB** ImageData and **64 KiB** staging pixels, excluding browser buffering
and object overhead. No new full potential/state allocation occurs per step;
explicit preset replacement may allocate temporary complete arrays.

Reproduce:

```sh
npm run test
npm run typecheck
npm run build
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs
```

The browser script uses an installed Chrome (`CHROME_PATH` override supported),
a temporary profile, CDP and a local Vite server, with no new dependencies.

## Remaining manual checks and scope

Human review is still needed for legibility, overlay/color interpretation, cursor
appearance, touch/pen ergonomics, keyboard/screen-reader usability, narrow devices,
and long-session responsiveness. Pointer drawing is not keyboard terrain editing;
keyboard users can operate labeled tools, playback, overlays and preset buttons.
Automated screenshots/diagnostics are not a substitute for this acceptance.

Only Slice 5B: no 2D creatures, moods, social coupling, entanglement, measurement,
scene persistence, new solver, Worker, GPU framework, backend or Lean changes.
The existing 5A numerical limitations still apply. Strong/sharp edited potentials
may need finer space/time resolution despite excellent norm preservation. No
claim of continuum accuracy or formal verification follows from green tests.
