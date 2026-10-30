# Slice 5E.2 — one world, two views

## Status and scope

Implemented for review. **Functional, numerical and browser checks pass. Sustained
performance acceptance remains open:** the final short paired comparison is near
real time, but the final minute-long comparison is materially slower. Those
results and the unfavorable earlier runs are retained, not averaged away into a
claim of universal improvement. Stop here; **5E.3 and 5E.4 are not implemented**.

The default terrarium owns the existing 2D creature world. **1D view** displays
its x-marginal; **2D view** displays its spatial heatmaps. Neither button starts a
new experiment. Standalone 1D/Observer and 2D Gaussian demonstrations remain under
**Menu → Advanced / Legacy demonstrations**. Their original solvers and commands
are retained. Entering/leaving a legacy demonstration starts a fresh experiment;
this is explicitly distinguished from the main presentation switch.

## Mathematics and physical conventions

For each creature, row-major interleaved complex storage is read at
`k = 2 * (j * nx + i)`. The projection is

```text
rhoX[i] = dy * sum(j = 0 .. ny-1) (values[k]^2 + values[k+1]^2)
dx * sum(i) rhoX[i] = dx * dy * sum(i,j) |psi[i,j]|^2
```

There is **no renormalization, peak normalization, phase reconstruction or
wavefunction mutation**. Thus normalized spatial states have unit discrete
marginal mass up to summation/rounding error; scaled input retains its actual
mass. This is a density, not a complex 1D wavefunction and not an autonomous 1D
Schrödinger experiment. Independently normalized creatures remain separate
identities, not coherently added amplitudes.

The grid remains 128 × 128 interior points, x,y in [−10,10],
`dx = dy = 20/129`, zero Dirichlet boundaries, `hbar = m = 1`, and `dt = 1/120`.
The utility also supports unequal spacing and non-square grids. Interior sample
x coordinates are `xmin + (i+1)*dx`, not `xmin + i/(nx-1)*(xmax-xmin)`.

Curves use piecewise-linear interpolation, not smoothing splines. The actual
unstored zero Dirichlet x-boundary densities are included at the domain ends.
This keeps interpolated values nonnegative, introduces no new peaks, and makes
the piecewise-linear curve's integral agree with the discrete `dx*sum(rhoX)` in
exact arithmetic. Floating-point plotting-area checks use a 1e-13-level tolerance
for these small independent fixtures; they are not continuum accuracy claims.

Editable terrain is projected separately as

```text
averageTerrainX[i] = sum(j) terrain[j*nx+i] / ny
```

The implementation divides each finite sample by `ny` before summing to avoid
unnecessary intermediate overflow. It is an **unweighted vertical average of
shared editable terrain only**. Mood-drive and social effective potentials are
not included. The label is **“Average terrain along y”** and explicitly says it
is **not an effective 1D Hamiltonian**. The separate energy band has a fixed ±20
scale, its own zero, and warm-positive/blue-negative strokes split at zero
crossings. It never shares the probability-density axis.

## Architecture and rendering

- `sim-core/src/projection2d.ts`: pure numerical queries with reusable nx-sized
  output, finite-input/result checks, and alias rejection. No DOM imports.
- `QuantumWorld2D.copyProjectedDensityX(id, out)`: read-only access to committed
  creature amplitudes without copying the full complex state or mutating world
  caches. This method and its import are the only world implementation additions.
- `render/projection1d.ts`: one reusable density buffer per current creature,
  cached terrain average keyed by terrain revision, reusable physical-x pixel
  coordinates, and no full-state copy during drawing. Removed IDs leave the cache.
- All creatures use **one linear density scale**: maximum of 0.5 and 1.15 times
  the largest peak across the roster, including hidden creatures. Headroom is
  omitted near the largest finite double to avoid overflow. This preserves
  relative peak heights; it does not independently scale each creature. The
  visible axis states its range and settings explain the adaptive common scale.
- Translucent pastel fills are drawn first, then all darker outlines. Selected
  density is outlined last/thicker. ID labels and different dash patterns provide
  identity beyond color; the existing selection and selected-only control work.
- `App.tsx` separates the main view mode from the legacy experiment selector.
  The main world component key stays `world2d`; the simulation setup effect does
  not depend on view mode. Controllers and numerical stepping are reused.

### Mirror presentation and state preservation

`TerrariumViewTransition` owns only the requested mode, one cancellable 450 ms
timer, and transition state. CSS tilts/flattens the square field toward its lower
edge while the wide marginal layer expands/crossfades. The reverse reverses that
presentation. It is a conceptual visual connection, not a physical rotation of
space or a claim about amplitude evolution.

The outgoing canvas retains its last pixels as a **decorative snapshot**; the
destination is live. A private UI draw-callback binding changes on view changes,
not every frame: idle 2D keeps its existing draw path with no projection branch,
no projection scan and no second heatmap pass. Completion redraws the destination
from **current committed world data**, including when paused. No amplitude
snapshot, second controller, physics loop, RNG sample, measurement, normalization,
terrain mutation or playback command is needed for the transition.

Rapid reversal cancels the previous completion timer. Unmount cancels it too.
Reduced motion skips the timer/morph; changing that preference during a morph
finishes immediately. Native keyboard buttons expose `aria-pressed`, visible
focus and a polite explanation of the current view. Inactive canvas layers are
hidden from accessibility APIs. Existing popup focus handling remains in place.

Brush gestures are cancelled when switching. Painting is disabled in projected
view and during the morph, because y information is absent and a tilted canvas
would have ambiguous pointer coordinates. The selected tool/radius remain set;
return to 2D to paint. Canvas clicks in 1D neither paint nor measure. Existing
explicit settings commands (terrain clearing, presets, moods, etc.) remain real
world commands, not view operations.

## Source preservation and automated checks

The before-source snapshot is outside the repository at
`C:/Users/marys/AppData/Local/Temp/psi-5e2-before`.

- **28 existing physics/controller/input source files are byte-identical** to
  that snapshot. SHA-256 values are in the evidence JSON.
- Removing only the added projection export from `sim-core/src/index.ts` recovers
  the original text after newline normalization.
- Removing only the projection import/query from `world/world2d.ts` likewise
  recovers its original text. No stepping, moods, ownership, randomness or
  interaction formulas changed. Standalone 1D controller/world source is intact.
- No packages, package versions, Lean files, commits or pushes were added.
  Pre-existing modified/untracked work was preserved.

Checks run successfully:

| Check | Result |
| --- | --- |
| `npm run test` | **399 tests / 38 files** |
| New projection/renderer/view tests | **15 tests**, included above |
| `npm run typecheck` | Both workspaces pass |
| `npm run build` | Pass |
| DOM-free world and performance-entry TypeScript projects | Pass |
| Production projection browser checks | **23** |
| Shell browser checks | **36** |
| Existing world browser checks | **30** |
| Existing Gaussian/terrain browser checks | **21** |
| Existing standalone creature browser checks | **22** |
| Existing Observer browser checks | **14** |

Numerical cases cover explicit complex indexing, unequal spacing/non-square grids,
isotropic and anisotropic discrete Gaussian conventions, normalized mass,
amplitude scaling, signed terrain averaging, alias rejection, finite/error cases,
reused output and single-row/column grids. The Gaussian reference is separately
specified as a normalized 1D discrete Gaussian; the 1e-13-level comparison budget
covers summation and elementary-function rounding, not a claim about continuum
truncation or solver convergence.

Renderer tests check physical coordinate mapping, common-scale peak ratios,
finite extreme scales, selected-last ordering, curve area, signed terrain
coloring and revision caching. View tests compare complete spatial/mood state,
terrain, time and subsequent stochastic outcomes against references; playing
references take exactly the committed step count, never wall-clock time.

The production browser audit is injected only into temporary builds, **not shipped
source**. It compares every spatial component, independent and global paired mood
amplitudes, ownership, snapshots, terrain and controller identity. It counts RNG
calls, checks both live destinations against fresh current-world rendering,
paints shared terrain, tests reversed/rapid transitions, verifies exact playing
reference evolution, keyboard/reduced-motion behavior and legacy entrypoints.
Both views fit 1920×1080, 1440×900, 1366×768, 1280×720 and 1024×600 without document
overflow. Runtime/console error lists are empty. The separate shell audit also
checks a small CSS viewport approximating 200% zoom; this is not an actual browser
zoom or assistive-technology certification.

During implementation a mock-context `this` typing error, a stale shell class
assertion, and a browser-audit joint-state field assumption were corrected. These
were harness/type issues, not relaxed numerical tolerances or physics changes.

## Performance evidence — qualified, not a real-time guarantee

[Compact results and source hashes](performance-audit-2d/projection-view-results.json)
retain **17 datasets**, including earlier candidates and unfavorable runs. Raw
sessions/builds remain under `D:/Temp/psi-5e2-*`. Datasets marked `finalSource` use
the final callback-binding implementation. All use the interacting two-creature
world, free terrain, unchanged grid/timestep, plain rAF audit, five-second warmup,
Chrome 156 headless with GPU disabled, Windows 10 / i7-1065G7, 1280×1000. Benchmark
runs were sequential, not concurrent with tests/build checks.

| Final-source measurement | Before 5E.2 | After 5E.2 |
| --- | ---: | ---: |
| Three alternating 10 s 2D windows, physical/wall | **1.00034** | **0.99931** |
| Same callback median / p95 | 12.9 / 24.7 ms | 12.4 / 15.5 ms |
| Paired 60 s 2D run, physical/wall | **0.85453** | **0.70253** |
| Same physical / wall time | 51.300 / 60.033 s | 42.200 / 60.069 s |
| Same completed steps / discarded wall time | 6156 / 8.649 s | 5064 / 17.864 s |
| Projected 1D, two 10 s windows | Not applicable | **1.00035** |
| Repeated morph every 700 ms, 15 s stress | Not applicable | **0.91239** |

Values slightly above 1 can arise from fixed-step/window endpoints; they are not
a faster simulation clock setting. The legacy 1D solver is not used as a
performance comparator for the marginal view.

Earlier candidate evidence includes five alternating short windows at
**0.88775 before / 0.89430 after**, an AB/BA pair of minute windows at
**0.71823 / 0.69948**, and an unfavorable minute at **0.99428 / 0.81804**.
Controls as well as candidates vary substantially. Host/JIT/order effects are
plausible, but these data **do not prove all differences are environmental**.
The final sustained comparison does not reproduce the historical ~0.965 target
or establish sustained parity. **That acceptance remains open.** No solver,
resolution, timestep, validation or capped-stall policy was weakened to improve
these measurements. Short-run success is not substituted for sustained evidence.

## Files and usage

New implementation/tests:

- `packages/sim-core/src/projection2d.ts`
- `packages/sim-core/tests/projection2d.test.ts`
- `packages/web/src/render/projection1d.ts` and `.test.ts`
- `packages/web/src/terrariumView.ts` and `.test.ts`
- `scripts/projection-browser-check.mjs`

Integration: `sim-core/src/index.ts`, `web/src/world/world2d.ts`, `App.tsx`,
`Gaussian2DDemo.tsx`, `style.css`, `TerrariumShell.test.tsx`, and
`scripts/performance/runtime-2d.mjs`. Documentation: this report, the compact JSON,
`README.md` and `docs/ROADMAP.md`. Other working-tree files predate this phase.

Run `npm run dev`; click **1D view** or **2D view** without pausing. Select creatures
in the persistent playback bar. Open **Menu** for the shared world controls and
projection explanation; paint in 2D. Choose **Advanced / Legacy demonstrations →
1D simulations** for the original 1D/Observer experiments.

```sh
npm run test
npm run typecheck
npm run build
npx tsc --project packages/web/tsconfig.world2d.json
npx tsc --project scripts/performance/tsconfig.json
node scripts/projection-browser-check.mjs --screenshot
node scripts/terrarium-shell-browser-check.mjs
node scripts/world-2d-browser-check.mjs
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs --no-screenshots
```

Browser scripts use the existing local dev server except the projection audit,
which builds/serves its own temporary production UI. Set `CHROME_PATH` if needed.
Performance commands (run separately, without tests/builds in parallel):

```sh
node scripts/performance/runtime-2d.mjs --out D:/Temp/my-5e2-ab --compare-before C:/Users/marys/AppData/Local/Temp/psi-5e2-before --scene two-interacting --mode plain --batches 3 --seconds 10
node scripts/performance/runtime-2d.mjs --out D:/Temp/my-5e2-long --compare-before C:/Users/marys/AppData/Local/Temp/psi-5e2-before --scene two-interacting --mode plain --batches 2 --seconds 60
node scripts/performance/runtime-2d.mjs --out D:/Temp/my-5e2-1d --scene two-interacting --view 1d --mode plain --batches 2 --seconds 10
node scripts/performance/runtime-2d.mjs --out D:/Temp/my-5e2-morph --scene two-interacting --view alternating --mode plain --batches 1 --seconds 15
node scripts/performance/summarize-runtime-2d.mjs D:/Temp/my-5e2-ab
```

## Review still required / limitations

- Resolve sustained performance acceptance on a controlled target device, retaining
  both source controls and adverse runs; do not infer it from the short windows.
- Human review of mirror feel, overlap readability, actual high browser zoom,
  touch/pen, color vision, safe areas, screen readers and long sessions remains.
- A projected density loses phase/y information and cannot determine future 1D
  dynamics. Average terrain is explanatory, not an effective Hamiltonian.
- The common scale can adapt as the global maximum changes; it is never
  per-creature peak normalization. The scale is visible/documented.
- Main switching preserves a world; leaving for a legacy demonstration does not.
- No new solver, spatial entanglement, decorative creature faces, eight-section
  settings redesign, onboarding or expanded notebook was attempted. Those later
  presentation phases require separate authorization/review.
