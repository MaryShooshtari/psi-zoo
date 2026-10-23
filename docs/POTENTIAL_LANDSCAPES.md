# Potential landscapes — Slice 2, Phases 1–2

Pure `@psi-zoo/sim-core` utilities, with no browser dependencies. Units are
**hbar = m = 1**; potential amplitude is an energy, while center and sigma use
the grid's spatial units.

## API

All functions accept `PotentialGrid = Pick<PsiGrid, 'count' | 'dx' | 'x0'>`.
A `PsiGrid` can be passed directly; its wavefunction storage is not used.
Samples are at `x_i = x0 + i*dx`, including both endpoints, matching the existing
Hamiltonian and Crank–Nicolson stepper.

```ts
const grid = createPsiGrid(401, 0.1, -20);
const terrain = createZeroPotential(grid); // new Float64Array(count)
const barrier = createGaussianBarrier(grid, {
  amplitude: 3, sigma: 0.5, center: 0,
});

// In-place edits, with an explicit caller-selected maximum height:
const maxHeight = 5;
stampGaussianPotential(grid, terrain, {
  amplitude: 3, sigma: 0.5, center: 0,
}, maxHeight);
paintGaussianPath(grid, terrain, { amplitude: 3, sigma: 0.5 },
  -2, 2, maxHeight);
```

`GaussianBrush` specifies `{ amplitude, sigma }`; `GaussianBarrier` adds
`center`. The sampled profile is exactly

`V(x) = amplitude * exp(-(x-center)^2 / (2*sigma^2))`.

This sigma describes the **potential profile**, not the Gaussian wavefunction
initialization convention. A grid-aligned center has peak amplitude; an
unaligned center can have a lower sampled peak. There is no normalization.

## Painting and boundaries

Painting uses `max(existing, profile)`, not addition. Repeated stamps cannot
pile up energy. For a path segment `[a,b]`, the maximum over every linearly
interpolated center is evaluated analytically:

`profile(x) = amplitude * exp(-distance(x,[a,b])^2 / (2*sigma^2))`.

Thus the swept region has a plateau at the brush amplitude with Gaussian tails.
This is the continuous envelope of Gaussian stamps, not a single Gaussian
barrier. It needs no chosen interpolation spacing and cannot leave gaps between
sparse input events. Reversing, repeating, or subdividing the same traversed
segment with fixed brush settings produces the same landscape. An unobserved
pointer reversal or a change of brush settings is a different path, and cannot
be reconstructed from endpoints alone.

Finite off-domain centers/endpoints are allowed. Profiles are sampled only on
the domain, without wrapping, center clamping, or edge renormalization. A stroke
wholly outside may contribute its Gaussian tail. A stroke across the domain
paints the crossed portion. Potential values at endpoints need not be zero:
Dirichlet walls constrain **psi**, not V, and the stepper evolves only the
interior state.

## Validation and numerical limits

- Geometry uses an integer count >= 3, finite positive dx, finite x0, and finite
  extent/endpoint. It follows the existing grid sampling convention.
- Amplitude must be finite and nonnegative; sigma must be finite and positive;
  positions must be finite. Zero amplitude is permitted.
- Constructors return independent arrays with values in `[0, amplitude]`.
- Painting requires finite positive `maxHeight`, amplitude <= maxHeight, correct
  array length, and existing values in `[0,maxHeight]`. Invalid inputs throw
  `RangeError` before mutation; they are not silently clamped or repaired.
- This API deliberately paints **positive barriers only**. Negative wells remain
  supported by the unchanged general Hamiltonian/stepper APIs, but cannot be
  passed to these terrain painting functions.
- Exponent evaluation divides distance by sigma before squaring, avoiding
  sigma-squared underflow/overflow. Overflowing coordinate subtraction is scaled
  first. Gaussian tails may underflow harmlessly to zero.
- Each operation is O(N); painting needs O(1) extra storage, regardless of stroke
  length. Mutation is deterministic and limited to the supplied potential array.
- Finite potential values do **not** guarantee resolved or accurate dynamics:
  sigma much smaller than dx is undersampled; large amplitude relative to dt
  produces temporal phase error. Extreme dx/amplitude/dt combinations can still
  trigger the stepper's existing checked arithmetic failures. Choose physically
  resolved settings, rather than treating a finite cap as a universal accuracy
  guarantee.

## Validation scope

`packages/sim-core/tests/potential.test.ts` covers profile shape, width, peaks,
boundaries, idempotence, exact path subdivision invariance, input validation,
extreme finite scales, and use with the existing Hamiltonian and `Stepper`.
It checks static painted-potential norm and energy drift with conservative
roundoff budgets, and bit-for-bit equivalence to the original zero-array free
evolution. The unchanged Slice 1 analytic Gaussian suite separately checks
continuum accuracy and convergence.

Neither phase validates a quantitative scattering/tunnelling scenario. When V
changes between steps, static-H energy conservation is not expected; each step
with a real fixed V still has the usual CN discrete-norm property. Scattering
presets and changes to the initial momentum are outside Phase 2. Subsequent
[Phase 3B validation](SCATTERING_VALIDATION.md) adds a specific resolved experiment;
it does not certify arbitrary painted terrain.

## Phase 2 browser integration

`SimulationPlayback` owns one terrain array, initially allocated with `createZeroPotential`.
Phase 3B's explicit mode loads replace state/terrain when selecting another grid;
ordinary edits, Reset and Clear Terrain preserve array identity.
Its `potential` getter is a renderer view, not an invitation to mutate: use
`stamp(center, brush)`, `paint(from, to, brush)`, and `clearTerrain()`. These call
the Phase 1 utilities, validate browser brush limits, and publish fresh diagnostics
and a draw notification. They do not change psi or time, nor start/stop playback.
The same array is passed to every fixed-dt solve; edits execute synchronously
between animation-frame callbacks and affect subsequent steps. No replay log or
fixed-step input-event queue is implemented; replay would require recording when
edits take effect, not just their endpoints.

**Reset** pauses and restores the initial wavefunction and time while preserving
terrain. As of [Phase 3A](DIRECTED_GAUSSIAN_VALIDATION.md), it uses the selected
initial momentum (default k0=0.75); changing the selection alone never kicks the
live packet. **Clear Terrain** fills the existing array with zeros, preserving
its identity, current wavefunction/time, playback, and selected momentum. To
restore the original free-particle start from either mode, use **Load free
exploration**; within the small mode, select p0=0.75, clear, and reset also works.
**Load tunnelling demo** replaces both terrain and packet with the resolved large
experiment. Both explicit loads pause at t=0 and turn Painting mode off. Painting,
clearing or applying a different reset momentum invalidates that preset's R/T
interpretation; loading the demo again restores its validated parameters.
Controller editing methods do nothing after disposal.

Painting mode starts **off**. The default brush has sigma=0.6 (six grid spacings)
and A=1. Controls/controller restrict sigma to [0.3,2] and A to [0.1,5]. This gives
at least three grid spacings per sigma. A*dt <= 0.05 in exploration (dt=0.01)
and <=0.1 in the large demo (dt=0.02); these are interactive limits, not a proof
of accuracy for every painted landscape.

`painting.ts` attaches native Pointer Event listeners once per canvas lifecycle.
One primary pointer begins a stroke inside the plot and is captured. Initial
contact stamps; movement and the final pointer-up position paint segments.
Brush settings are copied at stroke start. Extra pointers and nonprimary buttons
are ignored. Pointer-up releases capture; cancellation/lost capture ends without
painting a final segment. Turning painting off, reset/clear, window blur, hidden
tabs, and effect cleanup also end strokes. Capture/listeners are released on
cleanup; existing playback generation guards continue blocking stale RAF callbacks.

`plot.ts` shares plot bounds between hit testing and rendering. Client coordinates
are mapped through the bounding rect into logical CSS canvas coordinates, then
into the grid's physical domain. Axis/legend margins do not start strokes.
Captured movement outside clamps to the domain ends; vertical position does not
control amplitude. The canvas has no border/padding (an outline-like shadow
provides decoration), so its rect and drawing area agree. The backing store is
scaled separately for devicePixelRatio, including resize/zoom updates, and is
never used for input coordinates. CSS `touch-action: none` prevents page scrolling
on the canvas, even with Painting mode off; page content elsewhere can scroll.

The renderer reads the actual psi and potential arrays without allocating large
per-draw sample buffers. Cyan density retains the fixed left axis [0,0.5]; amber
dashed potential uses a labeled independent right axis [0,5]. Density above 0.5
is clipped, not normalized or rescaled. Painting redraws immediately while paused
or running. React diagnostics are throttled to 10Hz with a trailing update for
the final edit; explicit playback controls refresh immediately. Cleanup cancels
the UI timer, ResizeObserver, RAF, and all attached event listeners.

`packages/web/src/simulation.test.ts` tests actual numerical evolution, terrain
identity/solver propagation, paused/running edits, static energy/norm, reset/clear,
validation, and controller disposal. `painting.test.ts` tests coordinate mapping,
CSS scaling/edges, stroke lifecycle for mouse/touch/pen, capture/cancel/cleanup,
and actual pointer-to-playback integration using an EventTarget/capture double.
These Node tests do not mount React or test actual browser capture/Canvas pixels.

## Manual browser checklist

Phase 2 was accepted with user-reported **14/14 manual browser checks**. The
grouped checklist below is retained for regression review; those checks were
not rerun by the coding agent during Phase 3A. The user subsequently accepted
Phase 3A's momentum browser checks and reported 8/8 Phase 3B browser acceptance
checks passed. See the
[Phase 3B acceptance record](SCATTERING_VALIDATION.md#browser-behavior-and-remaining-manual-checks)
for the demo, region readout and retained regression checklist.

Run `npm run dev` and test the following when reviewing browser changes:

1. **Initial state/controls:** verify paused t=0, norm near 1, no terrain, Painting
   mode off. Play/Pause work; moving input without Painting mode does nothing.
   Tab to buttons, checkbox, and range sliders and operate them with the keyboard.
2. **Paused edits:** enable Painting mode; click/tap to stamp and drag rapidly for
   a continuous plateau with Gaussian tails. Amber terrain should redraw at once;
   time and cyan density stay unchanged. Stamp over the initial packet to verify
   the energy readout changes within 100ms, including after the final paused edit.
   Repeated stamps must not pile up height; width/height values match controls.
3. **Pointer lifecycle:** test mouse, touch, and pen where available. Drag beyond
   each canvas edge and release outside, then re-enter without pressing: no new
   paint. Test pointer cancellation, focus loss, multitouch, and disabling painting
   during a captured stroke. Margins/labels must not start strokes. Touch painting
   must not scroll the page; scrolling outside the canvas should still work.
4. **HiDPI/resize:** test DPR 1 and 2 (or actual HiDPI), browser zoom 125%/200%,
   narrow/mobile widths, and resizing while paused/running. Check crisp labels,
   distinct left/right units, and stamp alignment at both plot edges and x=0.
   Moving between displays/zooming while paused must retain alignment after resize.
5. **Actual dynamics:** with the unchanged default packet, paint a barrier ahead
   of it (for example near x=-2) while paused, then Play. Compare the evolving
   density to a cleared/reset run. Confirm that painting while playing works,
   probability norm stays near 1, and energy is steady after editing stops. Do not
   infer quantitative transmission coefficients from the visual comparison.
6. **Reset vs clear:** reset a painted running simulation: it pauses at t=0 with
   original density but intact terrain. Clear during playback: terrain vanishes
   without resetting time, density, or playing state. Use both for a free start.
7. **Lifecycle:** switch tabs (playback pauses); unmount/remount or use development
   StrictMode/HMR during a stroke and while playing. Check that capture is released,
   old strokes do not resume, no duplicate loops/listeners appear, and no console
   errors or post-unmount UI updates occur.

No browser/device checks or demo capture are claimed by the automated tests.
