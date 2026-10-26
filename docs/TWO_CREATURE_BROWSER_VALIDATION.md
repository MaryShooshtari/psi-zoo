# Slice 4 — final acceptance and two creatures in the browser

## What is integrated

The default browser scene now uses the real `TwoCreatureWorld` from Slice 4C.
The existing `SimulationPlayback` gained a `creatures` mode rather than replacing
the validated single-packet exploration/scattering paths. **Load free exploration**
and **Load tunnelling demo** retain their original numerical setups, momentum
controls, observation, energy diagnostics, regional masses and gated R/T results.
The Born-rule notebook remains unchanged and available in every scene.

No new dependencies, Lean work, measurement physics, additional creatures,
entanglement, or scripted trajectories are introduced.

## Controls and repeatable comparisons

The page starts paused, in Paint mode, with Creature A selected, g=1.5 and no
terrain. The two-creature preset is:

| Quantity | Setting |
| --- | --- |
| Units | hbar=m=1 |
| Domain/grid | [-20,20], 401 points, dx=0.1, fixed zero Dirichlet endpoints |
| Fixed physics dt | 0.01 |
| Initial density standard deviation | 0.8 for both Gaussians |
| Initial centers | A: -1.5; B: +1.5 |
| Initial momenta | A: +0.5; B: -0.5 |
| Initial mood | A: computational basis 0 (rz=+1); B: basis 1 (rz=-1) |
| Mood Hamiltonian, both | 0.6 sigma_x + 0.15 sigma_z |
| Drive magnitude, both | F0=0.12 |

The wave packets are initially separated but overlap appreciably through actual
numerical evolution. Norm is imposed only during initial packet construction
and the existing measurement update, never during unitary stepping.

- **Play / Pause** advance or stop both states together. Physical time is shown
  below the observation/painting controls.
- **Creature A / B** selects inspection and observation targets, not a different
  simulation or a different evolution rule. Position expectation, spatial norm
  (squared probability norm), mood norm and rx/ry/rz come from the selected state.
  No descriptive personality label is substituted for an observable.
- The compact Bloch diagram projects x horizontally and z vertically; y is
  explicitly reported numerically. It is state-derived, not an animated dial or
  a full perspective sphere. The projection can lie inside the circle even for
  a pure state because y is omitted.
- **Social coupling** selects a pending g in [-3,3], in increments of 0.5.
  Negative attracts, zero is independent, positive repels. The active g is
  displayed separately. Moving the slider never changes the live world.
- **Apply coupling & Reset**, or ordinary **Reset**, pauses and reconstructs
  identical initial packets and moods with the pending g, sets t=0, clears BOTH
  observation histories and rewinds the seeded RNG. Terrain and selected
  creature/resolution are retained. Compare -3, 0 and +3 against the same terrain.
- **Load two-creature demo** also removes terrain. Preset loading returns the
  interaction mode to Paint. Loading another scene retains access to the old
  momentum controls and never leaves a stale world behind.
- **Paint** uses the existing mouse/touch/pen bindings and brushes to edit shared
  terrain, whether paused or playing. Both Hamiltonians receive it. Reset keeps
  terrain; **Clear Terrain** removes only terrain, not states/time/play status.
- **Observe** and its labelled button target only the selected creature, using
  the existing finite-resolution Gaussian POVM. A click chooses WHEN to observe,
  never WHERE the outcome occurs. Its partner and both moods are unchanged.
  The following social step responds to the new density, not a partner collapse.
- Observation counts, last-result text, selected marker and notebook example
  follow the selected creature. **Why did it jump?** still pauses for reading;
  Close/Escape restore the existing dialog lifecycle.

## Visual semantics

Both curves use the actual separate wavefunctions:

```text
rho_A(x_j) = re_A,j^2 + im_A,j^2
rho_B(x_j) = re_B,j^2 + im_B,j^2
```

They share physical x coordinates and a fixed square-root-spaced density axis,
0 to 10.5 at dx=0.1. Tick labels are densities, not square roots. Geometric area
under this nonlinear display is NOT probability; the dx-weighted norm is the
probability diagnostic. The fixed scale includes the normalized grid maximum
1/dx=10 with headroom for sharp measurement peaks; there is no autoscaling.

- **A:** cyan solid outline, faint cyan fill.
- **B:** rose short-dashed outline, fainter rose fill.
- **Shared terrain:** amber long-dashed curve, independent linear right scale
  0–5. It is explicitly NOT either creature's complete mood/social potential.
- **Selected creature's last observation:** white line/diamond in pair mode;
  magenta in the retained single-packet scenes. It is a record, not a particle
  tracking marker. Changing selection changes which record is shown.
- Gray dotted reference cuts remain at -4/+4; they are not hard walls. The old
  R/T diagnostics are hidden in pair mode rather than misapplied to two states.

Different line patterns supplement colour; faint fills identify curves and
make overlap legible. Transparency is NOT phase, probability accumulation, or
an interference signal. Complex amplitudes are never summed across creatures.
Even coincident curves represent two independently normalized distributions,
not one normalized sum and not quantum interference between the creatures.

## Physics and conservation limits

The equations remain those validated in Slices 4B/4C:

```text
V_i(x,t) = V_terrain(x) - F0_i*rz_i(t)*(x-x_ref) + g*rho_other(x,t)
x_ref = fixed domain center
```

Each step samples both social densities at the OLD synchronized endpoint, freezes
them for the interval, samples each independent mood at its own midpoint, and
uses the existing real-potential CN solver. The nonlinear frozen-density coupling
is first-order in time; midpoint mood sampling does not upgrade it to second
order. This deterministic mean-field approximation is not entanglement, exchange
symmetry, a joint two-particle wavefunction, or coherent cross-creature dynamics.

Each spatial norm is preserved to roundoff by real-potential CN solves, and mood
norm is preserved to roundoff by its exponential. Individual spatial energies
need not be conserved. The combined mean-field energy counts the contact term
once and is NOT exactly conserved by frozen-density stepping even with static
base potentials; precessing drives, observations and terrain edits can also do
work/change energy. See [the energy functional and measured refinement](SOCIAL_INTERACTION_VALIDATION.md).
The legacy single-state `energy`, `energyReference` and `energyDrift` fields are
unavailable (`NaN`) in pair-mode controller snapshots and are not displayed.
This avoids presenting a misleading static-H energy-drift diagnostic. Single
presets retain those fields and their original interpretation.

Finite-grid dispersion, solver phase error, reflection from walls, coarse dt,
strong attraction/repulsion and near-grid-scale localization limit accuracy even
when norms remain good. No new universal stability or continuum-accuracy claim
is made. Measurements still cost O(N^2). Safe forks, social potentials, and
snapshots retain O(N) copying/allocation overhead; no premature caching of
state-dependent Hamiltonians is introduced.

## Ownership, observation transaction and React lifecycle

`SimulationPlayback` keeps the existing fixed-step accumulator, eight-step frame
cap, pause/resume behavior, stale-callback generation guard and disposal. Long
stalls discard excess wall time rather than enlarging dt; background tabs pause.
Every pair-mode physics tick calls `world.step(terrain)` once for both members.
The browser owns no independent trajectory and never mutates private Creatures.

The App creates its controller in an empty-dependency effect and holds it in a
ref; ordinary selection, slider and diagnostic rerenders do not reconstruct
physics. Cleanup still cancels scheduling, native input bindings, pointer capture,
ResizeObserver, listeners and trailing UI timers. React diagnostics remain
throttled to 10Hz with explicit-control refreshes. Canvas redraws each frame and
on paused edits. Development StrictMode effect cleanup/remount is distinct from
an ordinary React render and recreates a cleaned-up paused scene as before.

New controller APIs:

- `loadCreatureDemo()`
- `setSocialCoupling(g)` (pending until Reset)
- `selectCreature('a' | 'b')`
- `creatureStates` (borrowed cached render snapshot; do not edit its buffers)
- optional pair-mode `selectedCreature`, `coupling`, `inspection` scalar fields
  in `SimulationSnapshot`

A render snapshot is copied from the owned world only when physical state changes,
then reused across draws/inspection/selection. It never aliases world buffers.
The renderer traverses interleaved buffers directly without allocating densities
or adding amplitudes. Existing world-step copying remains intentional.

The smallest world observation extension is
`TwoCreatureWorld.observePosition(target, resolution, rng)`. It validates the
label, forks the selected member, delegates to
`Creature.observePosition(resolution,rng)`, then replaces only that member after
success. The Creature method delegates to existing `measurePosition`, retains
its own copy of the resulting spatial state and returns an independently owned
measurement result. Mood, partner, terrain and both clocks remain unchanged.
Failed measurements leave owned state unchanged. An injected RNG's consumption
cannot itself be rolled back; normal controller sampling uses the existing
seeded generator and consumes it only on observation actions. One ordered RNG
stream is shared by both targets: reproducibility requires the same selected
action sequence at the same numerical steps.

## Automated checks

Tests for new controller/renderer/observation behavior were written and run before
implementation. The initial nine failures were missing APIs/second curve, while
the three existing renderer tests passed. Added coverage includes:

- deterministic initialization/Reset and cached render snapshots;
- real world stepping, synchronized times, 30/144Hz equivalence, Pause/disposal;
- pending versus applied coupling and different physical outcomes;
- selected observables, per-creature measurement history and partner preservation;
- deterministic seeded observation, normalized conditional states and re-spreading;
- both solver paths receiving painted terrain, Reset versus Clear semantics;
- old preset retention, failed-world-step recovery and invalid target/g rejection;
- world observation atomicity, preserved clocks/moods, and returned-buffer ownership;
- independent renderer paths for real/imaginary amplitudes, same physical scale,
  no cancellation/summing/stacking and no source-buffer mutation;
- pure component output for selected observables and labelled Bloch projection.

Final repository checks:

- `npm run test`: **296 tests passed across 23 files**, including all 284 pre-4D tests.
  Final acceptance adds a default-preset mood counterfactual test and strengthens
  identical-initial-condition assertions for both members of coupling comparisons.
- `npm run typecheck`: passed for both workspaces.
- `npm run build`: passed, including its repeated typecheck.
- Strict ES2022-only compilation of `simulation.ts`, `creature.ts`,
  `twoCreatureWorld.ts` and their core imports: **zero diagnostics**, using
  `lib=[lib.es2022.d.ts]`, `types=[]`, strict/noUncheckedIndexedAccess, Bundler
  resolution and the repository source alias. DOM remains confined to UI/input/
  rendering modules.

The unit tests are DOM-free except server-rendered component markup. Mounted
React behavior is checked in the real browser below, not falsely inferred from
static markup alone.

### Numerical comparison of the browser preset

Using the real playback controller and a deterministic frame scheduler, with
zero terrain and identical initial states, at physical t=2:

| g | Mean x_A | Mean x_B | Spatial squared norms A/B |
| --- | --- | --- | --- |
| -3 | +0.0126245841 | -0.0126245841 | 1 within 7e-16 |
| 0 | -0.3569977582 | +0.3569977582 | 1 within 2.1e-15 |
| +3 | -0.8128275704 | +0.8128275704 | 1 within 3.7e-15 |

Attraction accelerates these initially approaching packets through one another;
repulsion reduces their approach relative to independence. Overlap need not
increase monotonically with attraction at every time: packets can cross and
reshape. These are measured finite-grid outputs, not analytic continuum values
or trajectory scripts. Tests use norm budgets up to 2e-12 for post-observation
evolution and 3e-15 for its immediate conditional state, and require re-spreading
variance to exceed twice its measured initial value in the zero-social case.
The full 4A–4C invariant/refinement budgets still run unchanged.

### Mood-dependent behaviour acceptance

The actual default configuration is basis moods |0>/|1>, the SAME Hamiltonian
`H_mood=0.6 sigma_x+0.15 sigma_z`, and F0=0.12 for both. Thus initially
`F_A=+0.12`, `F_B=-0.12`; the linear potential slopes are opposite. Independent
precession gives

```text
rz_A(t) = (0.15^2 + 0.6^2*cos(2*sqrt(0.6^2+0.15^2)*t)) / (0.6^2+0.15^2)
rz_B(t) = -rz_A(t)
```

At t=2, rz_A≈−0.6802162 (its force has reversed), while rz_B is opposite.
A controlled counterfactual retains EXACTLY the default spatial states,
terrain=0, dt=0.01, and g=1.5, changing only drive or initial moods:

| At t=2 | Mean x_A | Mean x_B |
| --- | --- | --- |
| Actual default | −0.5759734747 | +0.5759734747 |
| F0=0, same moods | −0.7135785450 | +0.7135785450 |
| Initial moods swapped, F0=0.12 | −0.8499112217 | +0.8499112217 |

The actual A centroid moves 0.1376051 further right than with disabled drive,
and 0.2739377 further right than with swapped moods. The test checks opposite
initial potential slopes, both default configurations, the independent analytic
rz formula, and broad centroid contrasts (>0.08 versus disabled, >0.16 versus
swapped, signed per member). These are finite-grid physical contrasts, not
continuum-accuracy tolerances. Norm errors at t=2 are below 4e-15.
At t=5, x_A is −0.0550892 versus −0.1571326 disabled and −0.2387782 swapped.

**Acceptance judgment:** mood changes the actual density evolution, not just the
inspector. Its visible contribution is modest: at a 900px capture width the t=2
centroid contrast is roughly 2.5px versus disabled or 5px versus swapped moods.
The two unobserved creatures are mirror-symmetric, not distinct asymmetric
personalities; both initially approach with opposite momenta as well. A movie
of that approach alone cannot isolate the mood force. No force exaggeration,
scripted separation, or preset retuning was needed or added. The stronger
attraction/repulsion contrast is separately validated at fixed t=2 above.

## Real-browser validation performed

Dependency-free Chrome DevTools checks ran on **Chrome/155.0.8059.86**:

```bash
node scripts/creature-browser-check.mjs --screenshot
node scripts/observer-browser-check.mjs --no-screenshots
```

The final checker passed **22 checks**, with zero runtime/console errors.
The original integration assertions remain:

1. Both actual draw paths reconstruct normalized densities at the expected centers.
2. Play changes both curves; Pause fixes time and curves.
3. B selection changes the inspector without changing either path/time.
4. A real React slider rerender changes only pending g, preserving physical state.
5. Apply resets identical curves/time and changes active g.
6. Native pointer painting edits shared terrain without moving the paused states.
7. Reset retains that terrain.
8. B observation preserves A exactly, normalizes B and preserves time.
9. Reset repeats the seeded selected observation exactly.
10. Real evolution re-spreads measured B.
11. Observation history/button target follow selection.
12. Existing notebook opens and pauses.
13. Single-packet exploration controls remain accessible.
14. The validated tunnelling preset remains accessible.
15. Returning to pair mode restores both initial curves with no stale state.
16. Narrow 390px/2x-DPR rendering keeps both full 401-point paths/backing resolution.
17. No console/runtime errors.

Final acceptance also checks actual tunnelling-preset evolution, finite diagnostics
and Reset; three native-UI g=−3/0/+3 runs from identical initial density paths;
selected observation DURING pair playback with synchronous partner preservation;
native painting while playing; and Reset during playback restoring both paths
and initial selected rz while preserving terrain. Browser g runs pause around
t=2 (wall-clock polling overshoots differently); their broad centroid ordering
is only a smoke check. The deterministic controller tests and fixed-t=2 table,
not differing wall-clock stops, establish the controlled quantitative comparison.

The old Observer checker passed **14 checks**, including real plot clicks,
measurement while playing, keyboard Space, Escape/focus return, MathML, norm/
energy diagnostics and continued playback in the single-packet preset. It now
explicitly selects that preset because the app's default changed. Its new
`--no-screenshots` option preserves the historical screenshots. The recorder's default mode explicitly selects the old scene; the new
`--creatures` mode records the pair into a separate file. No historical GIF or
screenshot was overwritten.

The first new browser-probe attempts caught a stale DOM read immediately after
Pause and an incorrectly escaped regexp in the PROBE. Waiting for paused React
controls and replacing that regexp with a status-element lookup fixed them;
subsequent checks passed. No physical state or controller hook is installed by
the probe. It only observes draw calls, operates UI controls and sends normal
browser input. A genuine full-page screenshot was saved to a temporary directory
and visually inspected; it is not added to the repository as a new release asset.

This is automated real-browser smoke/regression testing plus screenshot review,
NOT exhaustive manual browser acceptance. Remaining manual review: prolonged
interactive play, actual touch/pen hardware and pointer-capture edge cases,
colour-vision/screen-reader usability, browser diversity, and performance on
slower devices. The 2x-DPR mobile emulation is not a physical mobile-device test.

## Authentic Slice 4 GIF

Artifact: [`docs/media/creatures.gif`](media/creatures.gif), featured first in the
README. Reproduce with existing infrastructure and installed Chrome:

```bash
node scripts/capture-observer-gif.mjs --creatures
```

Capture: Chrome/155.0.8059.86, 900×717 pixels, 63 frames, 1,298,152 bytes,
10.52 seconds including initial/measurement/final paused holds. Default g=1.5,
terrain=0, initial conditions exactly as above. A is observed at t=3.46 with
resolution 0.4, sampled x=−0.20; only A localizes, then both evolve through
t=7.42. The white marker stays at that outcome. This depicts the driven
mean-field model, not entanglement or cross-creature interference.

Frames are genuine Chrome screenshots at roughly 8Hz; presentation-only CSS
hides lengthy controls/prose and keeps the plot, selected physical observables,
observation and time together. No controller hooks, changed physics values,
manually drawn pixels, interpolation, or synthetic evolution frames. Recorded
wall-time spacing is preserved except explicit paused holds. Browser frame caps
can slightly slow physical time; no dt is enlarged for capture. Palette
quantization and GIF LZW reuse the Observer recorder. Chrome's native ImageDecoder
successfully decoded all 63 frames and confirmed the full duration; decoded
initial, evolving and final samples were visually inspected, as was the genuine
localized measurement frame. Zero runtime/console errors occurred.

The first capture attempt failed before writing media with
`SyntaxError: Identifier 'style' has already been declared`: two DevTools
expressions shared a global lexical declaration. Wrapping the second CSS block
in an IIFE fixed this recorder-only issue; the full capture then passed.
Raw PNGs, manifest and decoded review samples remain only in the temporary
`psi-creatures-gif-gkETCO` directory, not the repository. Reruns naturally have
different wall-clock action times/outcomes; the capture is not a fixed-step replay.
Historical `observer.gif`, `scattering.gif` and screenshots remain unchanged.

## Final diff and release-readiness audit

Reviewed the complete tracked diff plus all new Slice 4 modules, tests and
validation documents. The initial spec now explicitly labels its aspirational
entanglement/interference/projection language as outside the current model.
No direct density manipulation, scripted position changes, added dependencies,
package/version/lockfile changes, or generated build output is included. The
only new release binary is the requested GIF. Temporary browser profiles,
recording frames and the audit diff stay outside the repository. Git whitespace
checks pass; Windows LF-to-CRLF notices are informational, not test failures.

The pre-existing untracked `packages/sim-core/tests/measurement.test.ts` remains
untouched: it is not a new Slice 4 acceptance change and should not be silently
discarded or automatically staged. Prior-slice files also remain uncommitted.
This review found no blocking simulation regression requiring production-logic
changes; acceptance edits are tests, capture/check infrastructure, documentation,
one corrected stale source comment, and the requested media.

## Review boundary

No commit/push, package installation/version change, Lean modification or further
slice work was performed. Existing worktree changes and historical media remain
preserved. Slice 4D stops here for review.
