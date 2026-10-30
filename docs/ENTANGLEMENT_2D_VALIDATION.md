# Slice 5D — entangled mood qubits

## Scope and acceptance status

Implemented and automatically validated, **not yet human/device/accessibility
accepted**. Only moods can be entangled. Two members represent
`psi_A(x,y) tensor psi_B(x,y) tensor joint_mood_AB`; independent spatial
amplitudes are never added, collapsed by mood measurement, or put into a joint
spatial Hilbert space. Two disjoint pairs are supported within the one-to-four
population bound. No three/four-qubit state, nonlocal Hamiltonian, CHSH demo,
noise, backend, circuit editor, dependency, Lean change or Slice 5E work.

The unchanged [5A spatial solver](TWO_DIMENSIONAL_VALIDATION.md) uses hbar=m=1,
128x128 interior samples on [-10,10]^2, dx=dy=20/129 and four unstored zero
Dirichlet boundaries. Static linear propagation retains validated second-order
splitting. Unpaired [5C feedback](WORLD_2D_VALIDATION.md) remains generally
first-order and is not an exact many-body dynamical theory.

## Ownership, lifecycle and API

`world/moodRegistry2d.ts` is browser-independent and is the sole live mood owner.
Its private ownership map holds either an owned existing `QubitState` or an
explicit `{pairId, subsystem: A|B}` reference. Each private pair holds exactly
one joint buffer. Creatures no longer retain a second live pure mood. Saved
initial independent moods are reset templates only, never active authorities.
Argument order in preparation defines A/B permanently, independent of creature
storage order. IDs are nonempty, unique while registered; pair IDs use letters,
numbers, underscores and hyphens. Overlap and missing/same-member requests fail.

World commands:

- `prepareBellPair(pairId, aId, bId)`: explicit **global state replacement** with
  Phi+, recorded as a preparation event. No spatial state, time or terrain edit.
  This establishes a saved Bell reset baseline for those members; re-preparing
  after release replaces any overlapping saved pair baseline.
- `measureMood(pairId, creatureId, basis)` returns a frozen structured event
  containing pair/member IDs, basis, outcome, and observed Born probability.
  The pair ID identifies the committed private post-measurement state. It never
  exposes writable joint storage. `measurePair` measures A then B sequentially.
- `measureAndRelease(pairId, basis)` is an explicitly coordinated global
  transition. It first attempts rank-one factorization. If still entangled, it
  measures A in the selected basis, records that outcome and then factors the
  product state. One local rank-one projection suffices for a pure two-qubit
  state. It does **not** unnecessarily measure B or remeasure an existing
  product state. Pair registration is removed and normalized pure qubits become
  authoritative; ordinary feedback is eligible starting with the next step.
- `spatialState(id)` returns a spatial copy for either ownership type.
  The old `state(id)` remains compatible for independent creatures and throws
  for pairs instead of inventing a local pure state. Local inspectors use
  immutable derived density/Bloch data via `getSnapshot()`.
- Removal of either registered member is rejected with a release explanation;
  the UI disables removal. No implicit partial trace-to-pure conversion or
  hidden random deletion. After release, removal also removes saved pair
  baselines touching that ID, so reset cannot resurrect a dangling pair.
- Reset retains the current roster and terrain as in 5C, restores saved spatial
  and mood conditions (including saved Bell registrations), t=0, the initial
  PRNG stream, and empty session event history. Release does not erase a saved
  Bell baseline. Deleted members are not resurrected. Preset loading constructs
  a new registry, so independent presets cannot retain stale pair references.

The friendship preset creates exactly two distinct normalized spatial packets
at x=-1.5/+1.5, sigma=0.7, with one named `friendship` Bell pair and no automatic
measurement. It preserves painted terrain, matching other world preset
semantics; Clear terrain gives a reproducible free-space starting scene.

## Exact two-qubit mathematics

`sim-core/src/joint-qubit.ts` extends, rather than replaces, the existing mood
engine. Independent moods still use unchanged `evolveQubit`, `QubitState`,
validation and basis constructors. Product release uses existing robust
`createQubitState` normalization. Complex arithmetic follows the existing
interleaved convention; no new dependency or incompatible single-qubit type.

The joint `Float64Array(8)` stores Re/Im pairs in order **00,01,10,11**.
Constructors reject malformed/nonfinite/zero inputs and normalize once using
scaled arithmetic. Copies own storage. State guards accept norm-squared error
up to 1e-10, the same as existing qubits; no ordinary unitary renormalization.
Phi+ has components `[1/sqrt(2),0,0,0,0,0,1/sqrt(2),0]`. This is prepared from
scratch, not inferred from prior moods or social forces. Its usual circuit
interpretation is H_A then CNOT(A->B) on |00>, not a general circuit feature.

Local evolution applies `cos(omega*dt/2) I - i sin(omega*dt/2) sigma_x` directly
to the chosen tensor index. Different frequencies, zero frequencies and negative
core dt are supported; the world retains its existing nonnegative-time contract.
No joint state is rebuilt from marginals. The world constructs every frozen
potential, solves every spatial candidate, constructs all independent/joint mood
candidates, then commits synchronously. Each registered pair evolves once.
There are no random draws in this loop and no grid-sized joint allocations.

Partial trace directly sums `a_(r,j) conj(a_(c,j))` (or transposed subsystem
indices). The immutable row-major interleaved 2x2 density includes both complex
off-diagonals. Bloch extraction is `(2 Re rho01, -2 Im rho01, rho00-rho11)`;
zero length is valid. Purity is `rho00^2+rho11^2+2|rho01|^2`. The two eigenvalues
are `(1 +/- |s|/trace)/2`; entropy is their binary Shannon entropy. Clamping the
diagnostic radius to one handles accepted roundoff; the zero eigenvalue branch
does not evaluate log(0). Amplitudes themselves are not clipped or normalized.

Release factorization selects the largest joint-matrix row, normalizes it into
B, contracts the joint state with conjugate B into A, and checks the full complex
reconstruction residual. The **1e-10 amplitude tolerance** matches the accepted
state-roundoff budget and conservatively exceeds measured drift. It is not a
license to factor appreciably entangled states; direct Bell factorization fails.

## Measurements, randomness, replay and no-signalling

For Z, the local projector selects the appropriate computational subspace. For
X it applies the real rank-one matrices `(I +/- sigma_x)/2`, retaining the
computational representation. Each branch computes its squared projected norm;
Born probabilities divide by the incoming norm (to account for accepted drift),
and the selected branch divides by **sqrt(projected norm)**. Zero branches have
no conditional state. A stochastic command consumes exactly one sample;
a deterministic branch consumes none. Basis/member validation occurs first.
The second pair measurement reads the first measurement's committed state.

The existing 32-bit LCG in `random.ts` is reused. Default world measurement seed
is `0x5d2026`, override via `measurementSeed`. No Math.random is used. Reset
recreates this stream. Frozen preparation/measurement/release events remain
inspectable for the session; UI shows the last eight, registry retains all.
`MoodRegistry2D.replay(event)` reissues commands and checks recorded measurement
outcome/probability. Reproduction requires the same initial roster, seed and
commands at the same physics-step boundaries, including terrain/interaction
inputs and dt. No full spatial-input recorder/editor or cross-JS-engine bitwise
transcendental guarantee is claimed. Replay divergence throws explicitly.

**No-signalling is algebraically tested**, not inferred from correlated samples:
for Bell, general complex entangled and complex product states, both directions
A->B/B->A and X/Z projectors are tested. Tests construct the non-selective 4x4
density `sum p_k |conditional_k><conditional_k|`, trace out the measured member,
and compare to the original remote density. They separately compare the Born-
weighted conditional reduced states. Every entry agrees within **3e-14**.
Conditional remote moods can change; ignoring the outcome leaves the remote
local state unchanged. Correlations do not provide controllable communication.

### Spatial-feedback safeguard

For **every registered member**, including a measured separable pair, disable
its drive and all social interactions involving it, as target **and** source.
Terrain and kinetic evolution remain normal. Unpaired creatures still interact
with other unpaired creatures. Actual reduced Bloch vectors are displayed, not
artificially zeroed. Consequently local measurement does not change either
spatial Hamiltonian. Only the deliberate global Measure & Release operation
restores feedback eligibility. This is a pedagogical quantum-classical interface,
not an exact coupled theory of entangled spatial and mood degrees of freedom.

## Automated evidence

Mandatory baseline before editing: **355 tests**, typecheck and production build
passed. Final checks: **375 tests in 32 files**, including all 355 existing tests
unchanged; typecheck, production build and separate ES2022/no-DOM world compile
pass. The 20 added tests cover invalid storage, basis/complex indexing, copies,
product references, Hermiticity/trace/positivity, Bell marginals, purity/entropy,
local rotations/indexing/reversal, projective branches/idempotence, X/Z/mixed
basis correlations, algebraic no-signalling, ownership/replay/reset/deletion,
feedback exclusion/restoration and spatial continuity.

| Measured invariant | Result |
|---|---:|
| 10,000 steps, Bell, omega A=.7/B=-1.1, dt=.013, max joint norm drift | 1.54754e-12 |
| Same run, max entropy error from one bit | 0 observed |
| Same run, max remote Bloch length | 0 observed |
| 400 paired world steps, 24x21, dt=.01, max individual spatial norm drift | 3.28626e-14 |
| Mood measurements/release, X and Z, spatial arrays/terrain/time | bit-identical |
| Measurement vs registered-pair effective potentials | exactly unchanged |
| Named pair with reversed initial creature storage | identical world snapshot/spatial arrays |

Invariant budgets (2e-11 after 10,000 local steps, 1e-10 spatial norm) are
conservative double-precision accumulation allowances, not continuum accuracy.
No normalization hides drift. Existing 5A/B/C convergence and norm tests pass.

Real installed **Headless Chrome 156**, Windows, --disable-gpu:

- **30 world checks**: all prior behavior plus selected-pair preparation,
  shared identity, both members' purity .5, one-bit entropy, Z/X correlated
  outcomes with correct labels, spatial image/time continuity, release,
  reset, pair-safe management, friendship/independent presets, paired terrain
  painting, mode disposal and no runtime/console errors. A browser-imported
  world also checks every spatial amplitude bit-for-bit around measurement.
- **21 Gaussian/terrain**, **22 1D creature**, **14 Observer** checks pass;
  no uncaught runtime/console errors in completed runs. Existing screenshots
  are not replaced and no new visual/manual acceptance is claimed.

During development typecheck found an untyped test `console` (the core has no
DOM globals) and a tuple-spread typing error. These were corrected in tests;
subsequent checks pass. No numerical or browser test failure occurred.

## Performance (measured, not a real-time guarantee)

Default 128x128, dt=1/120, nonzero terrain; 30 warmups and 200 timed whole steps,
10 warmups/100 Canvas2D draws, 1000x520. Latest completed Chrome run:

| Operation | Mean ms |
|---|---:|
| Two independent, interactions off | 11.522 |
| Two independent, drive/social on | 13.5815 |
| Four independent, drive/social on | 28.2785 |
| One registered pair | 11.250 |
| One pair + two independent | 24.241 |
| Two disjoint pairs | 22.0635 |
| Independent two-creature diagnostic snapshot | 2.997 |
| Bell-pair diagnostic/inspector data snapshot | 2.1215 |
| Independent two-density Canvas draw | 9.715 |
| Bell-pair two-density Canvas draw | 10.063 |
| Bell preparation alone | 0.0075 |
| Sequential two-member Z measurement | 0.0110 |
| Already-product release | 0.0115 |
| Preparation + X pair measurement + release combined | 0.0340 |

Small-command timings use repeated explicit trials with preparation before each
independent Bell trial; timing resolution makes individual sub-.1ms values noisy.
Inspector figures measure data generation, **not isolated React reconciliation**.
Full UI controls/updates are exercised by the acceptance script but React commit
timing is not separately profiled. No per-pixel density-matrix calculation.

These figures are **materially slower** than historical Chrome 155's 4.51ms
(two coupled) / 13.43ms (four coupled). They are not a controlled before/after
comparison and do not establish a cause; the current same-run pair and independent
cases are comparable. Both two and four can exceed the 8.33ms fixed-step budget.
Do not infer a speedup from pair cases: their spatial feedback is deliberately
suspended, not optimized physics. No grid/dt reduction, GPU, worker or altered
solver conceals lag. Human sustained/device performance review remains required.

## Reproduce and review manually

```sh
npm run test
npm run typecheck
npm run build
npx tsc --project packages/web/tsconfig.world2d.json
node scripts/world-2d-browser-check.mjs
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs --no-screenshots
```

1. `npm run dev`; choose **2D creature world**. Select A, choose B as Partner,
   **Entangle moods**. Confirm pair identity and .500000 purity; select B and
   confirm the same pair with subsystem B. Pair inspection follows selection;
   there is no separate canvas pair-selection mode or physical-force connector.
2. Measure A then B in Z while paused. Confirm valid matching outcomes,
   probability 50% then 100%, zero entropy, and no spatial/time change. The pair
   stays registered, feedback stays suspended, and deletion stays disabled.
3. Reset, choose X, and repeat: labels are +/minus, with matching Bell outcomes.
   Reset is explicit re-preparation for each independent trial. After ordinary
   local evolution, correlation probabilities may differ; entropy stays one.
4. **Measure & Release**: both moods become pure independent states. Resume to
   allow normal enabled feedback next step. Reset restores saved Bell membership.
   Release again then remove a member; reset must not resurrect a dangling pair.
5. Add C/D, select those two and entangle them too. Inspect either pair. Load
   friendship/independent/drive/attraction/repulsion presets; paint barriers,
   wells and erase. Confirm terrain persists through world presets and reset.
6. Review keyboard traversal, screen-reader announcements, zero-Bloch-state
   clarity, narrow/HiDPI/touch/pen behavior, and sustained two/four-creature lag.
   Switch through Gaussian and 1D/Observer modes. These human checks remain open.

No commits or pushes were made. Pre-existing unrelated/uncommitted work was
preserved, including the existing solver, renderer, App and style changes.
