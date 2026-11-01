# Psi Zoo: cloud creatures, direct actions and spatial measurement

* **Author:** Psi Zoo project owner; draft prepared with coding assistant
* **Status:** Approved in conversation — Opening sections, Technical Plan (including T1–T3 and acceptance budgets), Alternatives Considered, and Detailed Implementation Plan approved by the owner. Implementation-readiness round 1 identified six Major findings and two Nits; the owner approved all eight documentation corrections, now applied below. Independent re-audit and feature implementation have not been performed.
* **Date:** 2026-10-30
* **Source:** [Approved concepts brief](./concepts_brief.md), approved in conversation before starting this draft.
* **Authorization:** Design documentation only. Section approval does not authorize application implementation.

## Overview

Make the probability cloud itself read as a creature, make the shared playground as large as the screen permits, and make the main actions easier to find and apply. The audience includes casual visitors exploring by clicking and students using the science help to understand what they see.

Improve 2D cloud visibility and give clouds small, expressive faces without separate head circles, rings or arbitrary names. Preserve the current 1D plot presentation. Both main views occupy the same largest-fitting, undistorted square and show the same ongoing 2D experiment.

Organize the existing menu around drawing terrain and acting on creatures. A visitor chooses an action, then targets a cloud or uses accessible menu controls. Measurement applies once; entanglement takes two targets. Successful creature actions return to the ordinary pointer, while terrain painting remains continuous. Replace the bottom creature picker with **Clear terrain** and the bottom Help & settings entry with the existing **What am I seeing?** experience, without duplicating help.

Add genuine **position measurement** as the default Measure action. In 2D it samples a joint x/y result and updates the selected creature's spatial state. In the main 1D view it samples x only and updates that same full 2D state, corresponding to finite-width vertical-band localization. The pointer chooses the creature, not the detector outcome. Retain the existing 1D detector-width convention and keep **Measure mood — X/Z** separate for registered mood pairs.

This combines a presentation and interaction revision with a new numerical capability. Better-looking collapse is not evidence that measurement works. Scientific, interaction, visual, accessibility and performance acceptance must remain distinct.

## The Problem

### The cloud and the character compete

The existing presentation combines density clouds with separate face/head decorations and named identities. The requested direction is for the cloud to be the body, with a face that helps it read as a creature rather than another character sitting in front of it. Diffuse and split clouds must remain understandable, not just compact initial packets.

Making faint density visible creates a trade-off: stronger contrast can saturate compact peaks and overlapping clouds. Changes must make the density easier to read without inventing probability, changing amplitudes or making every cloud appear equally concentrated.

### Space and action priority do not match the intended experience

The owner wants the square playground to use the available screen, not merely sit inside a wider wrapper. Primary controls still need to remain reachable on short or narrow screens. Changing views must not restart the experiment or change the physical domain.

Terrain drawing, measurement and entanglement should be easy to discover. The bottom picker occupies a place intended for terrain clearing, and the bottom Help & settings label does not communicate the intended science explanation. This is a change in discoverability and organization; it is not a claim that the existing selection API is broken.

### The default measurement is missing from the main world

The main world supports mood-pair measurements, while standalone 1D experiments already support finite-resolution position measurement. These are different operations. Renaming the mood action cannot supply the spatial behavior the owner requested.

The main 1D plot is a probability marginal, not a separate complex wavefunction. A position measurement there must therefore update the original full state without fabricating lost phase information or sampling a y result. Likewise, a joint 2D measurement must respect correlations between x and y rather than independently drawing from the two original marginals.

### Direct actions increase the cost of targeting mistakes

An ordinary selection can be changed without altering the physical state. A measurement changes the experiment. Overlapping clouds, identical marginal hills, stale menu choices and competing terrain gestures can therefore cause more serious mistakes once direct tools are introduced.

Visitors need to know which action is armed, which creature it will affect, how to cancel it and whether it succeeded. Results must remain understandable with faces disabled, while playback continues, and without relying on color or pointer input alone.

## Goals

1. **Make density readable as the creature.** Improve 2D visibility across compact, diffuse, split, overlapping and boundary-adjacent states. Use small faces directly on meaningful density, without separate head rings or arbitrary names. Provide stable references that do not depend on color alone. Visual samples require owner review; a face must not imply a tracked particle.

2. **Maximize the shared square without changing the experiment.** Use the largest complete, undistorted square that fits alongside reachable primary controls. Keep the same playground footprint in both main views and retain the existing 1D plot content and conventions. View changes preserve amplitudes, moods, terrain, physical time, playback and physics random-number state.

3. **Prioritize actions and reuse existing help.** Make terrain drawing, position measurement, mood entanglement and other supported creature actions easy to reach. Retain secondary settings, notebook, diagnostics and explicitly fresh legacy experiments. Put Clear terrain at the bottom in place of the picker and offer one existing What am I seeing? help flow without duplicate entries.

4. **Provide deliberate, accessible one-shot creature actions.** Support clear cloud targeting and native menu alternatives through equivalent behavior. One successful measurement returns to inspection. Entanglement waits for a second valid target, then returns to inspection; the first target alone changes no physics. Terrain remains continuous. Misses, ambiguous hits, cancellation and invalidated targets must not silently act on a previous or replacement creature.

5. **Add real finite-resolution spatial measurement.** The 2D action samples a joint x/y detector outcome; the main 1D action samples x only and updates every y of the same complex 2D state. Both support independent and mood-paired creatures without silently measuring or releasing mood ownership. Reuse the existing detector-width control convention: Gaussian resolution in physical units, not a click-chosen location, hard radius or guaranteed posterior width. Existing control values are the starting requirement; their numerical limits need separate validation on the unchanged grid.

6. **Make action results and science explanations agree.** Clearly distinguish position x/y, position x-only and mood X/Z outcomes. Acknowledge the successful action independently of facial animation, and present any sampled location as a past detector result, not a current particle position. Keep contextual help, notebook and guide instructions consistent with the new actions, including measurements performed at time zero.

7. **Protect existing physical and interaction contracts.** Preserve evolution, boundary and normalization conventions, fixed-step scheduling, legacy measurement semantics, mood ownership and registered-pair feedback suspension. At a spatial measurement's commit, only the intended creature's spatial state changes; terrain, clock, other creatures and joint moods do not. Future normal evolution may respond to that changed state. Presentation, targeting and faces consume no physics randomness.

8. **Require evidence appropriate to each claim.** Before acceptance, independently check detector probabilities and complex state updates, world integration, pointer/native parity, keyboard accessibility, visual clarity and bounded action cost. Test correlated and boundary states as well as Gaussians. Retain adverse performance data and distinguish action latency, rendering cost and committed physical-time throughput. Existing test counts and proof links do not validate this proposed addition.

## Non-Goals

- Changing the solver, grid resolution, physical domain, boundary conditions, time step, existing mean-field/mood rules or committed-step policy to accommodate the redesign or improve reported performance.
- Turning the main marginal into an autonomous 1D simulation, reconstructing a phase-free wavefunction from its density, or restarting the world when changing main views.
- Replacing Born sampling with a pointer-chosen outcome, scripted cloud motion, a decorative shrink animation or an exact-coordinate projection. The requested Gaussian measurement has finite resolution.
- Making separate creatures interfere merely because their densities overlap, or adding spatial entanglement between creatures. Existing entanglement remains joint mood entanglement.
- Adding independent-mood measurement, changing existing pair measurement probabilities, or silently preparing/releasing a mood pair during spatial measurement.
- Making Clear terrain reset creatures, moods, time or playback, or undo physical evolution that occurred before clearing.
- Per-creature peak normalization, artificial probability tails, particle-like face tracking or physics randomness for decoration.
- New backend services, accounts, remote telemetry, saved-scene/replay infrastructure, dependencies or rendering frameworks under this design's current scope.
- Claiming continuum accuracy for every detector width merely because the discrete posterior is normalized and subsequent evolution stays finite. Sharp and repeated measurements need explicit numerical limits.
- Treating historical exact-model Lean proofs as verification of the browser, TypeScript sampler, floating-point arithmetic or whole game. No changes to the separate proof repository are included.
- Closing historical sustained-performance, real assistive-technology, actual-zoom or device acceptance gates without the relevant new checks.
- Production implementation, package/version changes, commits, pushes or deletion/reset of existing working-tree changes as part of this drafting workflow.

## Open Questions and Remaining Evidence

The Technical Plan below records the approved interaction design and acceptance criteria. These evidence gaps cannot be closed by approving documentation:

- **Visual acceptance:** exact palette and face samples still need comparison on compact, diffuse, split, overlap and boundary scenes. The plan preserves the current fixed density transfer function initially; visual sample approval is required before claiming the new appearance is accepted.
- **Sharp-width behavior:** the existing sigma range must be tested on the unchanged 2D grid, including repeated measurements. Discrete correctness does not imply continuum accuracy at every setting.
- **Target-device acceptance:** cold/warm latency, actual display pixel densities, sustained throughput, real assistive technology, browser zoom and touch/pen remain unmeasured for this feature. Historical slow/fast performance regimes remain unresolved.

## Technical Plan (Architecture)

### Protected boundaries and source checks

The existing ownership direction remains unchanged:

```text
Canvas or native menu target
          |
          v
One validated action path in the web/world layer
          |
          v
Pure detector calculation in sim-core
          |
          v
World validates and commits the target posterior
          |
          v
Committed receipt -> density/projection, diagnostics and science help
```

`QuantumWorld2D` owns copied creature amplitudes, saved reset initials and spatial-mean/diagnostic caches. Its `state(id)` query rejects paired moods, while `spatialState(id)` works for both ownership types. The new spatial command must operate on the world's owned spatial state without requiring an independent mood or treating a defensive copy as writable authority.

`SimulationPlayback2D.psi` is separate from its world members. It must not become the target of a main-world measurement. Its pause/play methods reset timing state; a synchronous measurement must not call them merely to surround a state update. Numerical commits occur between complete ordinary steps.

The legacy `measurement.ts` remains a separate validated 1D path. Its endpoint-inclusive storage differs from `PsiGrid2D`, where every stored cell is interior. The new detector must use the latter's row-major geometry and area weights, not flatten physical distances or omit the first/last stored cells.

The current seeded generator is a consuming closure without checkpoint/restore. T2 keeps the existing mood stream intact and adds a separate world-owned spatial stream. T3 retains consumed draws on failure, so no checkpoint/restore interface is required.

### Decision T1: computing and sampling a joint detector result

Both alternatives implement the same finite-grid measurement model in exact arithmetic. For each input site, normalize the Gaussian response over allowed detector sites separately along x and y. Combine those responses with the input's area-weighted probability masses. The response factors by axis; the input state need not. Both alternatives preserve correlations and apply the same sampled positive mask to the original complex state.

| Choice | Mechanism | Trade-offs | Failure conditions to address |
| --- | --- | --- | --- |
| **A — Full joint outcome grid** | Calculate every joint x/y outcome mass with successive axis calculations, then sample a fixed-order cumulative distribution with one random draw. Apply the sampled mask once. | The complete distribution is easy to inspect and compare with references. At 128×128, the outcome grid is 128 KiB and the two axis passes involve about 4.2 million contributions, excluding response preparation and posterior construction. It performs more work per action than the conditional method. | Reject nonfinite/zero totals and invalid draws; skip zero-mass bins; handle cumulative-sum roundoff. If complete action latency exceeds the agreed budget, the design needs revisiting rather than hidden pauses. |
| **B — Conditional-axis sampling — selected by owner** | Calculate and sample detector x, then calculate and sample detector y conditioned on that sampled detector x. Only then build/commit the joint posterior. Use two random draws, including deterministic branches. | Avoids constructing every joint outcome mass. Work can scale with grid area plus the two squared axis lengths, rather than the two cubic axis passes. The full joint distribution is not a routine output, and conditional normalization and failure handling need more care. | Never sample y from its original unconditional marginal. Reject unrepresentable conditional totals; define second-draw failure behavior; never commit or publish an intermediate x-only state. |

For either choice, the main marginal's x-only action samples once and applies its mask across all y. It does not call the joint operation and discard a y result. No dense cell-by-cell transition matrix is allowed. Work counts describe algorithms, not measured browser latency. The alternatives can produce different seeded outcome sequences even though they implement the same probability law.

**Decision T1: B, conditional-axis sampling, approved by the owner.** Do not construct the full joint outcome grid during routine measurement. A complete joint reference remains appropriate for independent tiny-grid tests. The action uses one x draw followed by one conditional-y draw, including deterministic branches. The x-only action uses exactly one draw. These are successful-action policies; T3 below specifies retained draws on unexpected failure.

#### Selected detector calculation

Let `N` be the area-weighted input norm squared and `q[i,j] = dx*dy*|psi[i,j]|²/N`. Normalize the finite Gaussian detector response separately at each input coordinate:

- `Rx[a|i] = exp(-(x[a]-x[i])²/(2*sigma²)) / sum_c exp(-(x[c]-x[i])²/(2*sigma²))`.
- `Ry[b|j]` is the corresponding y response, normalized over allowed detector y sites for each input j.

All stored sites are valid interior sites. Neither axis includes the unstored zero boundaries as outcomes. The plan uses one common detector width for both axes in 2D, and that same control for x only in the marginal, as proposed in the approved brief.

For a joint measurement:

1. Sum input masses over y and calculate `pX[a] = sum_i,j q[i,j]*Rx[a|i]`. Sample detector x index a using the first draw.
2. Calculate `c[j] = sum_i q[i,j]*Rx[a|i]`. This is an unnormalized y mass conditioned on the sampled **detector x**, not a single input-x slice.
3. Calculate `pY[b|a] = sum_j c[j]*Ry[b|j] / pX[a]`. Sample detector y index b using the second draw.
4. Build the posterior proportional to `sqrt(Rx[a|i])*sqrt(Ry[b|j])*psi[i,j]`, check it and normalize with dx*dy. Report the joint outcome mass `pX[a]*pY[b|a]`.

For x-only measurement, use step 1 and a posterior proportional to `sqrt(Rx[a|i])*psi[i,j]`, normalized over the full 2D grid. There is no second draw, y mask or y receipt field.

The formulas specify the exact finite model. Implementation must check representable norms, normalize computed sampling vectors against summation roundoff, use a strict cumulative comparison that skips zero-mass bins, and reject invalid conditional totals. Build square-root axis masks separately rather than multiplying two tiny responses before taking their square root. Independent reference tests must compare probabilities and complex posteriors, including correlated states and boundary cases. No per-action timing is claimed from these operation counts.

### Decision T2: ownership of spatial randomness

The current world option `measurementSeed` seeds a private mood-registry stream. That registry resets the stream and replays mood-only events; existing tests protect its deterministic-branch and invalid-command draw behavior. T1 fixes the successful spatial draw counts, but does not require spatial and mood actions to draw from the same generator.

| Choice | Mechanism | Trade-offs | Failure conditions to address |
| --- | --- | --- | --- |
| **1 — Separate spatial and mood streams — selected by owner** | Give the world a spatial stream with explicit seed/reset behavior. Leave the mood registry's current stream and sampling policy intact. | A spatial action does not advance the mood stream, and mood actions do not advance the spatial stream. Reproduction needs both stream seeds and the relevant action order. | Reset/preset paths must initialize the spatial stream consistently. Numerical state changes can still affect later evolution; separate streams do not make whole experiments independent. |
| **2 — One shared measurement stream** | Let one world-owned generator supply both spatial and mood samplers. Adapt the mood registry to use it while preserving existing mood draw rules. | One random sequence follows the complete measurement-action order. New spatial actions can change later mood outcomes and vice versa; existing mood-only sequences must still match when the new action is unused. | Reset ownership must avoid double-resetting the shared stream. Mood-only event replay is insufficient to reproduce a mixed spatial/mood sequence unless the spatial draws are also accounted for. |

Neither choice changes the Born probabilities, uses randomness during ordinary stepping, or authorizes a persistent replay platform. Both must keep the standalone 1D generator unchanged.

**Decision T2: 1, separate spatial and mood streams, approved by the owner.** One spatial stream serves all creatures and both main view modes within a world; do not create per-creature or per-view generators. The existing `measurementSeed` option continues to mean the mood seed. Introduce an independently specified unsigned-32-bit spatial seed; its default value and exact API will be pinned in the detailed plan. Reset restores the spatial stream to its configured initial seed, alongside the current reset behavior. A new world starts a fresh spatial stream. Merely switching main views does not reset either stream.

Leave `MoodRegistry2D` randomness, deterministic-branch draw rules and mood-only replay semantics unchanged. Position sampling does not advance the mood stream, and mood actions do not advance the spatial stream. This isolates random draws, not physical causality: measurements can still alter subsequent spatial evolution and the probabilities of later spatial outcomes. Successful spatial actions consume one draw for x-only and two for joint x/y, as specified by T1.

### Decision T3: unexpected failures after sampling

Both alternatives reject predictable errors before sampling: invalid/stale targets, disallowed guide actions, invalid geometry/width/state and ordinary misses. Both leave committed amplitudes, time, mood ownership and success receipts unchanged if posterior construction fails. Neither publishes a surprise face for a failed operation.

The remaining distinction concerns an unexpected numerical failure after the first or second spatial draw, such as an unrepresentable conditional total or posterior. The existing generator closure cannot rewind itself, so rollback would need an additive spatial-only generator interface; do not change legacy sampling behavior to achieve it.

| Choice | Mechanism | Trade-offs | Failure conditions to address |
| --- | --- | --- | --- |
| **A — Roll back state and spatial draws together** | Sample through a private staged copy of the spatial generator state. Validate the complete posterior and prepare its receipt, then commit amplitudes and generator advancement together. Discard the staged generator on a handled pre-commit failure. | Retrying from the same unchanged world starts from the same random position. Requires a small checkpointable/stageable spatial generator rather than just the existing advancing closure. | Repeating an identical numerically impossible outcome can repeat the failure instead of escaping it through a new draw. A failed UI publication after a successful numerical commit is not rollback and must not trigger another measurement. |
| **B — Roll back amplitudes, retain consumed draws — selected by owner** | Use an advancing spatial generator. If posterior construction fails, preserve committed amplitudes but retain however many draws the attempt already consumed. | Simpler generator integration. Subsequent attempts can sample different outcomes, but a retry is no longer the same experiment. | Failure location changes later seeded results; diagnosis must account for failed attempts and draw counts. Do not describe this as full RNG rollback or publish a success receipt. |

Pure sim-core calls receive an explicit RNG callback. They preserve input arrays but cannot undo side effects of an arbitrary caller's callback. Under selected policy B, neither the core nor the world promises RNG rollback.

These policies cover handled numerical failures before commit, not process termination or browser crashes. After a successful numerical commit, a rendering/help publication failure cannot undo the measurement or justify silently rerunning it.

**Decision T3: B, retain consumed draws on an unexpected sampled failure, approved by the owner.** The spatial stream advances as values are requested; there is no checkpoint, rewind, hidden resampling or intermediate spatial commit. Keep a cumulative spatial draw count, reset with its stream. A failed sampled attempt reports how many draws it consumed without replacing the last successful action receipt. A retry is a new explicit measurement attempt. No application-level replay feature is added; deterministic tests must include failed attempts in their command scripts.

### Pure numerical extension and API boundary

Add a small DOM-free `packages/sim-core/src/measurement2d.ts` module and export its public types/functions from the existing package entry point. Keep the legacy 1D measurement and evolution modules unchanged.

The proposed numerical entry point is `measurePosition2D(psi, resolution, axes, rng)`, where `axes` is `x` or `xy` and `rng` is a required callback. It returns a new normalized `PsiGrid2D`, sampled x index/coordinate, optional y index/coordinate only for `xy`, detector width, selected outcome mass and input/posterior norm checks. Use distinct result shapes for x-only and x/y so a fabricated y cannot be required by the type. Never expose live input buffers or mutate the input, even on failure.

Validate geometry against the existing factory convention, including finite bounds, positive representable spacings/area, safe interior dimensions, matching storage and finite amplitudes. Reject a zero, underflowed or nonfinite input norm before sampling. Normalize amplitudes before squaring when forming probability masses to avoid avoidable overflow. Do not treat malformed geometry as merely an invalid RNG outcome.

Use axis-distance response arrays, per-input normalization arrays, x/conditional-y work vectors and one candidate complex grid. The conditional algorithm needs no axis-pair table or full outcome grid: auxiliary axis storage is linear in nx+ny, and the posterior is proportional to grid area. Preparation and sampling work scales with nx*ny + nx² + ny². Allocate work only for an explicit action; no detector calculation runs on hover, ordinary draws or evolution steps. Do not add approximate tail cutoffs or periodic convolution.

Before each requested draw, verify that its sampling distribution has a finite positive total. Check every supplied draw is finite and in [0,1). A failed conditional-y preparation can consume the x draw; an invalid second draw can consume two callback invocations. The world records its actual generator calls, rather than assuming every failed joint attempt used two. These errors return no candidate result and do not alter the caller's amplitudes.

### World command, cache invalidation and receipts

Add one narrow `QuantumWorld2D.measureSpatial` command with an explicit target, axes and width. It obtains that member's owned spatial state directly, whether its mood is independent or paired, and invokes the core routine with the world's separate spatial generator. Do not use `state(id)` or mutate the copy returned by `spatialState(id)`.

Give the spatial stream an additive unsigned-32-bit `spatialMeasurementSeed` option. Pin its default value in the detailed implementation section; the existing `measurementSeed` remains mood-only. Reuse `createSeededRandom` unchanged. Track successful spatial actions separately from generator calls so failures can leave gaps in draw positions without inventing successful outcomes.

The command sequence is:

1. Validate current world/target eligibility and parameters before drawing. UI action validation also enforces guide and transition restrictions.
2. Calculate the entire candidate and prepare a compact immutable receipt. Any sampled failure leaves committed spatial buffers, saved reset initials, moods, time and receipts unchanged, but keeps consumed draws under T3.
3. Copy the validated posterior into the target's existing committed spatial buffer. Delete that target's entries from both spatial caches. Do not change its saved reset initial, candidate-stepper ownership, terrain, other creatures or mood registry.
4. Store the successful action receipt and return it. The next ordinary step continues to copy committed amplitudes into the existing evolution candidate, so no second stepping mechanism is needed.

Registered mood-pair members remain excluded from mood-dependent spatial drive and social feedback. Measuring their position must not factor or release the mood pair. Independent creatures' subsequent ordinary feedback may respond to the changed spatial means. Do not promise unchanged energy across measurement.

Extend the world snapshot with one bounded `lastAction` record covering spatial measurements and the existing mood preparation/measurement/release commands. Keep mood history and its replay format intact. This record is not a growing session log. For sequential pair measurement, one command result contains the two ordered mood results; release remains explicitly a coordinated mood transition.

A spatial receipt includes target ID, successful-action sequence within the current experiment, physical time, x-only versus x/y tag, detector width, sampled coordinate(s), selected outcome mass, norm checks and cumulative spatial draw count. X-only records have no y field. Reset clears last-action data and draw/action counters; a replacement world starts its own records. The UI associates records with that world's lifetime and does not transfer them to a new scene.

### Playback and failure handling

The mounted `Simulation2D` remains the presentation/controller owner. A shared local executor handles native and canvas actions, checks the current world and interaction state, then calls the world command exactly once. It distinguishes rejection, numerical failure and successful commit from subsequent publication.

- **Expected rejection:** no matching target, ambiguous hit, stale draft, invalid width, guide restriction or morph in progress. Explain the issue without drawing randomness or routing it through the existing generic pause-on-exception handler.
- **Handled measurement failure:** no posterior commit; consumed draws remain under T3. Disarm the creature tool and announce that no measurement was applied and whether draws were consumed. Do not silently retry or mark the still-valid committed world as a failed evolution.
- **Successful measurement:** disarm, refresh snapshot/density/marginal/help from the committed result and acknowledge it. Preserve playing/paused state, pending animation frame, timing reference and fractional accumulator. Do not pause/resume or publish through a path that resets scheduling.
- **Post-commit display failure:** preserve the successful receipt and allow a redraw of current state. Do not repeat the numerical command. A separate ordinary solver failure retains the existing stop/error policy.

These commands remain synchronous on the main thread between complete fixed steps. Keep the eight-step cap and existing excess-wall-time policy. A worker is not part of this design; failure to meet action-latency budgets reopens the design rather than silently adding concurrency or weakening physics.

### One interaction owner and target lifetime

Keep one small UI-owned interaction record beside the existing mounted controller, rather than independent measurement/painting booleans. Its modes are inspect, continuous terrain, armed spatial measurement, armed mood measurement and entanglement with zero or one pending target. Store spatial axes/width or mood basis explicitly when armed.

Use a small pure helper for mode transitions, gesture qualification and target checks. React state exposes instructions and controls; current refs supply the same state to native pointer handlers without remounting the numerical world. The existing terrain binding reads this owner: it receives a painting tool only in terrain mode, otherwise View. No new competing measurement pointer binding is added.

Preserve the existing primary-pointer requirement and maximum 6 CSS-pixel click movement. Pointer-down captures gesture identity and the current interaction epoch; pointer-up validates the same pointer, canvas, epoch and view. Pointer cancellation, leaving the target, blur and lost gesture ownership prevent execution. Morphs disable creature application as well as terrain painting.

Add a read-only roster revision to the world, advanced by successful add/remove. A pending target captures the current world reference, roster revision and tool epoch. Revalidate before every action. Cancel the draft on roster edits, reset, tool/view change, world replacement, guide replacement and ownership-changing commands. Reset also clears result reactions. This deliberately cancels drafts when an ID is removed and reused rather than trying to follow a replacement creature.

For spatial tools, targets may have either mood ownership type. Mood tools require an identified registered pair and basis. Entanglement requires two distinct currently independent moods; the first target only changes UI intent. Preserve first/second target order as the pair's A/B subsystem order. The menu must not silently substitute a new partner when a stored target disappears.

### Picking and native targeting

Ordinary inspection keeps its existing largest-local-density selection policy. Armed actions use a stricter classifier based on the same visible density buffers and physical/screen mapping:

- Start from the current faint-tail eligibility threshold: density at least max(1e-8, 1% of the largest visible peak).
- A visible creature is a candidate only if the hit lies in its qualifying cloud cell, or under its qualifying marginal curve for the main 1D view.
- Exactly one candidate permits direct application. More than one candidate requires explicit choice from a native target list; do not resolve an irreversible-action tie using previous selection or lexical ID.
- Zero candidates leaves the tool armed with an explanation and native-list alternative. Never fall back to the selected creature after a miss.

This conservative overlap rule can require a list choice even when one cloud is brighter. That is an intentional safety trade-off for the approved explicit-choice direction, not a changed Born rule. Hidden creatures remain available in the menu with a hidden-density note; they are not targeted through another visible cloud.

Native selectors choose targets without executing. A named Apply button calls the same executor. Entanglement has two explicit target controls and a completed-action button. Clear cloud hits can complete the corresponding canvas workflow without a second confirmation. Both routes emit one result and disarm after success.

### Menu, focus and contextual help

Reuse `SettingsPopover` and its mounted pages. Add action-first home entries for Draw terrain, Measure position and Entangle moods, followed by other supported actions and secondary settings. Keep Measure mood — X/Z separate from Measure position, with the registered-pair requirement attached only to mood measurement. Retain existing pair measurement, sequential measurement, Measure & Release and deletion guards.

Extend the existing navigation context with an explicit close-and-handoff operation for arming canvas tools. Remove its focus trap before moving focus to the armed-action instructions/Cancel area. The click used to choose a menu action cannot also become a canvas measurement. Native application can complete in the menu, then close with predictable focus return and result announcement. Escape first dismisses a modal/popover that owns it; outside those, it cancels the active creature draft without changing physics or RNG.

The position control uses one sigma in world units: min 0.2, max 2, default 0.4, step 0.1. In 2D it applies to both detector axes; in the marginal it applies only to x. Explain “smaller = finer” and that the creature, not the pointer, supplies the sampled outcome. Do not show a mouse-centered measurement-radius brush preview. Terrain brush width remains a distinct control with its own semantics.

Remove the bottom selected-creature dropdown but retain native selection/inspection in the menu. Replace that bottom location with Clear terrain, wired to the existing terrain-only command. Keep its menu counterpart available without introducing a second state-changing implementation.

Move the single existing What am I seeing? trigger to the bottom help location. Remove the duplicate header trigger and stop routing that control into settings. Reuse the same `MuseumDialog`, scene publication, chapter navigation and focus-return behavior, including a visible fallback trigger after scene replacement. Legacy demonstrations keep access to the same science dialog.

Show one compact latest-result line outside the closed menu, with a polite live announcement on a new result, not on every snapshot. It reports stable creature identity, measurement kind, coordinate(s) or mood outcome, detector width when relevant and time. Keep exact probability/norm/draw diagnostics available in Advanced rather than filling the playground with history. No persistent sampled-position marker is introduced in this scope.

### Layout, cloud appearance and reactions

Use one shared square wrapper for both canvases and the transition. Let its side be the minimum of available content width and height after measured header, playback, result and action-instruction rows. Put explanation text outside the square rather than reserving unequal space inside the two layers. Both canvas layers fill that same square; do not merely enlarge the projection's rectangular layer.

Keep the existing 450 ms presentation transition, live destination and reduced-motion shortcut. Physical-to-canvas and projected-x mappings use the actual square's logical dimensions. Resizing or changing display pixel density affects only presentation/backing stores. Allow primary bars and menus to wrap/scroll internally on small screens without clipping focus or making a normal action inaccessible.

Start the visual revision with background/cloud palette comparisons while retaining the common `1-exp(-rho/0.08)` transfer function. Remove head ellipses, selection rings around heads and arbitrary names. Retain density anchoring, clipping/stale-anchor suppression, mood diagnostics and static registered-pair identity links. Neutral Creature A/B-style references replace names consistently; pair subsystem A/B remains separately labeled. Use a small non-ring selection cue and native selected status rather than restoring the rejected head circle.

Keep the existing 1D plot content, shared linear density scaling, true boundary coordinates and separate unweighted average-terrain band. Do not change it to match a new 2D brightness curve or add plot content just to fill the square.

Prepare visual comparison fixtures for compact, diffuse, split, overlapping and wall-adjacent states with faces and terrain on/off. The owner must approve the palette/face samples; this design does not claim a particular sample already works. If palette-only contrast is insufficient, reopen the fixed-transfer-function choice rather than adding adaptive normalization or glow silently.

An optional surprised expression follows a committed measurement receipt once. Keep it UI-only, bounded to 600 ms of wall time, with one cleanup/redraw timeout so it also expires while paused. A new result replaces the prior reaction; reset, world/target invalidation and unmount clear it. Reduced motion, disabled face animation or hidden decorations use the ordinary static face and textual receipt. No new animation loop, React frame updates, physics draws or changed density values.

### Science provenance and guide compatibility

Feed contextual help from the new chronological last-action record instead of interpreting an old mood event as the latest session action. X-only help explains finite-width band localization and possible conditional change in the y marginal, without claiming a measured y. Explain that a displayed result is historical and that Gaussian localization is not exact orthogonal projection.

Invalidate untouched-Gaussian provenance on successful spatial measurement, even at time zero. Remove the generic world-action assumption that every t=0 command restores pristine provenance. Reset and known preset/guide initialization may explicitly restore that provenance; selection, clearing and mood actions must not fabricate it.

Update the measurement and marginal chapters, action instructions, decoration help, display toggles and guide's hard-coded terrain navigation together. Retain the guide's actual Play/width-growth gate, true marginal gate, real terrain edit, skip/finish cleanup and replay confirmation. New creature actions remain blocked by shared execution validation during guided stages, not just by disabled buttons. Cancelling replay preserves the current world, seeds, receipts and scene.

### Critical user journeys

| Given | When | Required result |
| --- | --- | --- |
| A paused or running 2D world, with independent or mood-paired targets | Arm Measure position and make a clear cloud hit, or apply a named native target | One joint x/y sample, one complete posterior, one receipt and return to inspection; no terrain/time/mood ownership change at commit. |
| The same world shown as the main 1D marginal | Apply Measure position, then return to 2D | One x draw and full-state band update; no sampled y; the same world/time/playback continues. |
| An overlap, empty hit, drag or stale target | Try to apply an armed creature tool | An explicit choice or rejection, never an arbitrary target or RNG draw. A handled numerical failure after sampling instead follows T3 and identifies consumed draws. |
| Two independent moods | Choose Entangle moods and target the first, then second creature | The first target is a cancellable UI draft; the second valid target prepares the existing Bell mood state in that order without altering spatial amplitudes. |
| Any scene with painted terrain and prior evolution | Activate Clear terrain or open What am I seeing? | Clear removes terrain only; help describes the published scene and latest actual action. Neither is a measurement or world reset. |
| An unchanged experiment with a sampled numerical failure | Explicitly retry the same action | No prior posterior was committed, but the retry starts after the draws already consumed by the failed attempt. Reset reproduces the initial seeded command sequence. |

### Validation and acceptance criteria

These criteria are approved as design requirements, not measured results. Full reproduction commands, every touched file and detailed test cases belong in the Detailed Implementation section.

**Numerical references.** On tiny non-square grids, independently enumerate every input/outcome pair to form the full joint distribution. Derive conditional reference probabilities from that joint table, not by copying the production conditional calculation. Compare sampled indices, masses and complex posteriors for correlated states, corners, unequal spacings, single-row/column grids and zero/near-one draws. Require per-input response completeness and phase preservation where masks remain representable.

Use an initial absolute probability/norm tolerance of 1e-12 for tiny references and an area-weighted complex-state error tolerance of 1e-11. For the 128² posterior, use norm error at most 1e-11 after normalization: this accommodates accumulation across 16,384 nonnegative site contributions rather than relying on an exact-real identity. Record observed errors. These limits are for well-scaled fixtures, not permission to ignore invalid/underflowed states; unexpected failures require diagnosis, not automatic tolerance widening. No energy-preservation assertion spans the measurement itself.

**Continuation and compatibility.** Run minimum/default/maximum widths, repeated measurements and boundary cases through the unchanged solver. Separate finite/norm-stable evolution from continuum claims; use refinement evidence only for the latter. Prewarm both world caches before measuring and compare immediate diagnostics and the next feedback step with a measured reference world. Protect reset initials, non-target spatial buffers, mood probabilities/ownership, terrain and clock. Test actual scheduler identity and a nonzero fractional accumulator, not just the playing flag.

**Randomness and lifecycle.** Count one/two calls on successful x/xy actions, including deterministic outcomes. Force pre-draw failure, failure after x and failure after y; verify retained draws, unchanged amplitudes/receipts and reset reproduction. Interleave spatial/mood actions to prove stream isolation. Cover native/canvas parity, ID reuse, world replacement, reset, morph, guide guards, focus, repeated activation, paused reaction expiry and unmount cleanup. No shipped global test hooks.

**Visual and accessibility.** Compare real screenshots and geometry at 1920×1080, 1440×900, 1366×768, 1280×720 and 1024×600, plus small-screen control/notebook access. Check actual zoom, DPR 1/2, keyboard-only target/result tasks, reduced motion and text/focus contrast. Human screen-reader, touch/pen and target-device checks remain separate from automated browser assertions.

**Action latency.** On named hardware with recorded browser/build and actual square/backing sizes, measure cold and warmed core work, complete synchronous handler duration and next-paint/result latency separately. The approved warm p95 budgets are 16.7 ms for numerical measurement and less than 50 ms for the complete synchronous action. Also report maximums and cold results; investigate any measurement-attributable long task rather than hiding it in p95. Exercise paused/running x/xy actions and one/two/four-creature scenes. These are budgets for future validation, not promises inferred from operation counts.

**Incremental throughput and memory.** Preserve an actual-source baseline, run serial matched production windows and keep all adverse samples. Compare equivalent viewport/backing sizes without actions for idle overhead, then the new build with/without a fixed seeded action script, and separately record the deliberate larger-square cost. Require no more than a 5% decline in median matched committed-time throughput for the equivalent-size no-action comparison, with repeated windows and all individual ratios disclosed. Five percent is the owner-approved design allowance, not a measured noise bound. If variability prevents a clear conclusion, leave acceptance open. Never apply that relative allowance to claim the historical absolute sustained gate has passed.

Check bounded repeated-action memory: no retained probability grids, growing reaction timers or measurement work in idle frames. Report physical-time throughput, latency, step-cap hits and discarded wall time separately. Larger-square results remain visible even if the equivalent-size incremental comparison passes. No hidden pause, changed grid/dt or reduced numerical work can obtain a pass.

### Staging and review boundary

First validate the additive pure detector against independent references. Then validate world commit/cache/RNG behavior, then wire shared targeting and publication, then apply layout/appearance/help revisions with regression checks. Do not activate a default Measure button while its numerical or contextual path is missing.

Keep rollback at coherent source-change boundaries against the preserved working-source baseline, not historical HEAD and not physical undo. No dependencies, package versions, Lean files, commits or pushes are needed. Formal design approval still does not authorize implementation. Alternatives Considered follows; the Detailed Implementation Plan remains a separate drafting and approval step.

## Alternatives Considered

This section carries forward the brief's Alternatives Weighed and the owner's later T1–T3 choices. An alternative described as rejected is not necessarily physically invalid: several are valid but not the chosen design. Deferred ideas require evidence and another approval before entering scope.

### 1. Separate circular characters and arbitrary names

- **Pros:** A head shape gives the face predictable contrast, and names make targets easy to refer to.
- **Cons:** A separate character competes with the probability cloud and can suggest a localized particle. It does not fix weak cloud visibility.
- **Disposition:** Rejected by the owner. The cloud is the body; retain small directly anchored faces and neutral stable creature references instead.

### 2. Widen only the wrapper, stretch/crop the field, or redesign the 1D content

- **Pros:** Widening a wrapper is a small CSS change; stretching or cropping can fill more pixels. New 1D content could occupy otherwise unused plot space.
- **Cons:** A wider wrapper need not enlarge the square. Stretching distorts physical proportions, cropping hides the domain, and extra 1D content changes a presentation the owner asked to retain.
- **Disposition:** Not chosen. Maximize one complete square using both available width and height, with the same footprint in both views. Height-limited screens may not gain pixels just from gaining width. Retain the existing 1D content and physical domain.

### 3. Keep mood-only measurement as the default

- **Pros:** Reuses an implemented operation and adds no spatial numerical capability.
- **Cons:** It cannot localize a spatial state, works only for registered mood pairs, and would make the default Measure action mean something different from the owner's request.
- **Disposition:** Superseded after the initial visual-only review. Add default position measurement for both independent and mood-paired targets; keep explicitly named mood X/Z measurement separately.

### 4. Let the click choose the outcome, or animate collapse without measurement

- **Pros:** Pointer-centered localization is easy to explain as a drawing tool, and a shrink animation offers immediate visible feedback.
- **Cons:** Neither implements the requested state-sampled detector. A visual-only collapse can disagree with the actual amplitudes; exact point projection is also a different instrument from the finite-width Gaussian response.
- **Disposition:** Rejected for this feature. The click selects the creature. Born sampling chooses the detector result, and a real posterior update precedes any decorative reaction.

### 5. Sample the original x and y marginals independently

- **Pros:** Two simple axis samplers avoid calculating a full joint outcome grid.
- **Cons:** A separable detector response does not imply an uncorrelated input. Independent unconditional samples can generate the wrong joint statistics for a state with x/y correlations.
- **Disposition:** Scientifically unsuitable for general supported states. Use the selected conditional method: sampled detector x first, then detector y conditioned on that result.

### 6. Flatten 2D storage into the old 1D sampler, or make a state from the marginal

- **Pros:** Appears to reuse the existing API and tests with little new code.
- **Cons:** Flattening changes physical distances and invents adjacency across rows. A square root of the marginal loses complex phase and the full state's correlations. Legacy endpoint loops also exclude valid interior-only 2D cells if copied literally.
- **Disposition:** Rejected. Reuse the detector convention, not incompatible storage assumptions. X-only measurement applies a mask to the original full complex state at every y.

### 7. Dense cell-to-cell detector table or a matrix-free all-cell-pairs loop

- **Pros:** Direct enumeration is a clear independent reference and supports arbitrary detector responses.
- **Cons:** At 128², a full table uses 2 GiB and a direct matrix-free loop still evaluates roughly 268 million input/outcome contributions per action. Avoiding allocation alone does not bound work adequately.
- **Disposition:** Excluded from routine execution. Use axis separability without factoring the input state. Retain direct enumeration only on tiny independent test grids.

### 8. Construct the full joint outcome grid with axis passes

- **Pros:** Implements the same finite measurement law, supports a single joint-CDF draw and makes every outcome mass directly inspectable. The 128 KiB outcome grid is not itself a memory problem.
- **Cons:** The two axis passes require about 4.2 million contributions at the default grid, before response preparation and posterior work. It calculates outcomes not needed for one sampled result.
- **Disposition:** Valid but not selected in T1. The owner chose conditional sampling to avoid routine full-grid construction, accepting conditional-normalization and two-draw failure complexity. Actual speed still requires measurement. A full joint table remains useful as the tiny-grid reference.

### 9. Refactor all detector paths into a universal measurement framework

- **Pros:** Could share Gaussian response, validation and sampling code across dimensions.
- **Cons:** Broadening legacy APIs and changing their summation order can change validated probabilities, seeded outcomes or failure behavior. Much of the apparent reuse depends on incompatible geometry conventions.
- **Disposition:** Not justified by this task. Add a small pure 2D module and retain the existing 1D path. Share helpers only where that does not change established behavior; do not introduce a dependency or framework.

### 10. Share one random stream between position and mood measurement

- **Pros:** One generator gives a chronological sequence of all measurement draws.
- **Cons:** Spatial actions change later mood draws and vice versa. Shared reset ownership and mixed-action reproduction would require adapting the mood registry and accounting for spatial actions in sequences previously replayed from mood events alone.
- **Disposition:** Valid but not selected in T2. The owner chose separate world-owned spatial and mood streams. Stream isolation does not prevent the physical effects of a spatial measurement from changing later spatial probabilities.

### 11. Roll back random draws together with a failed posterior

- **Pros:** An unchanged experiment can retry from the same random position. State and random advancement have one transactional boundary.
- **Cons:** Needs a stageable/checkpointable generator beyond the existing closure. An identical unrepresentable outcome can repeat the failure. Publication failures still cannot roll back a successful numerical commit.
- **Disposition:** Valid but not selected in T3. Keep committed amplitudes unchanged on failure but retain draws already consumed. Report the failed attempt's draw usage, never silently retry, and test reproduction with failed attempts included.

### 12. Leave creature tools armed after success

- **Pros:** Supports repeated measurements or pair preparations without reopening the menu.
- **Cons:** Makes accidental repeated state changes easier and blurs whether a later click inspects or measures.
- **Disposition:** Rejected by the owner. Successful creature actions return to inspection. The first entanglement target remains pending; continuous terrain painting is the explicit exception.

### 13. Confirm every target, or always use the inspection pick winner

- **Pros:** Universal confirmation makes the chosen target explicit. Reusing the largest-density/selection/ID winner avoids extra interactions and maximizes direct clicking.
- **Cons:** Confirmation adds friction to every clear hit; automatic tie resolution can apply an irreversible action to an unintended overlapping creature. Skipping an ineligible foreground cloud can also target something behind it.
- **Disposition:** Neither extreme is chosen. Apply directly only when exactly one visible density candidate qualifies. Otherwise request an explicit native target choice or reject the miss; never fall back to an old selection. Ordinary non-measuring inspection keeps its current policy.

### 14. Add independent tool listeners or a general command engine

- **Pros:** Separate handlers look locally simple; a general engine could centralize many future commands.
- **Cons:** Independent booleans/listeners can paint and measure on the same gesture or execute twice. A general command/event platform introduces machinery not needed for the current bounded modes.
- **Disposition:** Use one small interaction owner and one shared canvas/native executor beside the mounted controller. Retain existing world rules and terrain binding rather than adding competing input systems.

### 15. Add a second help/menu flow or use markers as the only result indication

- **Pros:** A dedicated action panel offers room for instructions, and a sampled-position marker gives immediate spatial feedback.
- **Cons:** Duplicate help drifts and adds navigation. A marker alone cannot reliably identify the action, target, width or time; an x-only result must not invent a y location, and a persistent marker may suggest a tracked particle.
- **Disposition:** Reuse the existing popover and science dialog. Show one compact latest-result receipt outside the menu and retain deeper diagnostics in Advanced. No new persistent marker or growing session recorder is included. Preserve the legacy demonstration's existing marker behavior.

### 16. Normalize each creature's peak, add glow/blur, or change the transfer function immediately

- **Pros:** Peak normalization keeps diffuse clouds prominent. Glow or a different fixed transfer function could improve contrast where palette changes are insufficient.
- **Cons:** Per-creature normalization hides relative concentration. Glow/blur adds compositing and may obscure boundaries or overlap. No comparative sample yet establishes that a transfer-function change is needed.
- **Disposition:** Reject per-creature normalization and invented tail brightness. Defer glow/blur and transfer-function changes. First compare palettes with the current shared fixed mapping; reopen the choice with visual evidence if that fails. Do not mistake this staging choice for accepted visual clarity.

### 17. Infer surprise from moods or animate a tracked particle

- **Pros:** Existing mood data can drive expressions without adding a measurement receipt, and following a moving point creates obvious character motion.
- **Cons:** Ordinary unitary evolution changes moods without measurement. A reaction inferred that way can miss real measurements or invent false ones; a moving face can imply a trajectory absent from the model. Random decoration can also disturb physics sequences if streams are mixed.
- **Disposition:** Reject these mechanisms. Trigger the optional bounded surprise only from a committed receipt. Keep density anchoring and all decoration outside numerical state, with reduced-motion and paused-expiry handling. The text result works with faces off.

### 18. Pause/resume around measurement or change physics to meet budgets

- **Pros:** Pausing can make outcomes easier to inspect; a smaller grid, altered dt or smoothing could reduce cost or soften sharp posteriors.
- **Cons:** Pause/resume clears existing timing state, and a true playing flag does not prove preserved scheduling. Physics changes would break the task's protected model and invalidate comparison evidence. Norm stability alone would still not prove continuum accuracy.
- **Disposition:** Not part of this design. Preserve scheduling and the solver/grid/dt. Measure complete action cost and document sharp-width limits. Budget failures reopen design rather than being hidden by pauses or reduced physics work.

### 19. Move measurement into a worker now

- **Pros:** Off-main-thread work could improve responsiveness if synchronous measurement is too slow.
- **Cons:** Requires state-version checks, transfer/copy policy and coordination with a world that may evolve while the result is computed. It does not automatically reduce total numerical work.
- **Disposition:** Deferred, not declared invalid. First test the bounded synchronous conditional algorithm against the approved latency budgets. If it fails, present the evidence and obtain a new architecture decision rather than silently introducing concurrency.

## Detailed Implementation Plan

**Approval boundary.** The owner approved Alternatives Considered, the Detailed Implementation Plan and the eight documentation corrections recorded in [the annotated resolution report](./goldfish_review_report.md). This is the approved execution contract, not permission to implement. Work through the numbered list in order, one focused slice at a time; do not expose an incomplete default measurement action.

**Activation boundary.** Steps 1–3 are separate reviewable baseline/numerical/world slices. Steps 4–8 are one UI integration slice with ordered internal tasks, not independently shippable action-activation slices. Create and test helpers and forms unmounted; keep existing mounted actions until a single final wiring change installs the executor, forms, corrected provenance, chronological science and current instructions together. Do not mount a usable position-action entry during steps 4–6. An isolated audit fixture may mount the new forms/executor to test integration, but is not shipped UI activation. Run build/type/unit checks at each internal task; complete integration and browser checks must pass before offering that slice for acceptance. No environment/global feature switch is introduced.

Before final mounted wiring, demonstrate core/world checks, no-randomness rejection, one/two-draw success, time-zero provenance invalidation, correct latest-action science, axes-correct x-only content and no-pause publication recovery in the audit integration build. Activation does not close later visual/device/performance gates or authorize deployment. Preserve the owner visual-sample stop during this slice.

### 1. Establish the actual-source baseline and protected scope

The assessment preceding this section ran `npm run test`, `npm run typecheck` and `npm run build`: all passed, including **421 tests in 40 files**. The Git working tree was clean at assessment. These checks establish the existing baseline only. No new measurement, browser acceptance or latency measurement ran. The roadmap still records Slice 5E.4 as implemented for review, with sustained performance and human acceptance open.

Before implementation, inspect Git status again and preserve the **then-current filesystem**, including tracked modifications and untracked project source. Copy root manifests/configuration, `packages`, `scripts`, `docs`, README, brief and draft into a fresh external baseline directory. Exclude dependency trees, build output, Git internals and secrets. Save a relative-path SHA-256 inventory and environment record alongside the copy. Do not use HEAD, a stash, checkout or reset as a substitute. Baseline copies, browser profiles, screenshots, JSON samples and audit builds belong outside the repository. Record their absolute locations in the eventual validation report; do not assume another machine has this session's paths.

Protected implementation files include the legacy `measurement.ts`, grid factories, steppers, Hamiltonian, projection mathematics, qubit operations, `random.ts`, `moodRegistry2d.ts`, standalone 1D controller, and terrain stamping/binding mathematics. They are read dependencies, not planned edits. Keep 128×128 interior sites, bounds [−10,10], dx=dy=20/129, hbar=m=1, dt=1/120, unstored zero boundaries and the eight-step scheduling policy. No dependencies, package versions, lockfiles, configuration changes, source deletions, Lean work, commits or pushes are planned. If an implementation requires an unlisted file or a protected behavior change, amend this plan and obtain approval first.

### 2. Add the pure detector, with independent references before implementation

| File | Operation and reason |
| --- | --- |
| `packages/sim-core/tests/helpers/measurement2dReference.ts` | Create a test-only brute-force detector reference. Enumerate each input/outcome pair directly using physical coordinates and per-input boundary normalization; derive conditional references from the complete joint table rather than the production algorithm. |
| `packages/sim-core/tests/measurement2d.test.ts` | Create the probability, posterior, validation, draw-count, phase, immutability and failure tests described below before adding the detector. |
| `packages/sim-core/tests/measurement2dContinuation.test.ts` | Create default-grid width/repetition/continuation tests through the unchanged Cayley solver, keeping discrete validity separate from continuum claims. |
| `packages/sim-core/src/measurement2d.ts` | Create the DOM-free conditional detector and its result/error types. It owns temporary calculation arrays only; it does not own world state or random streams. |
| [packages/sim-core/src/index.ts](./packages/sim-core/src/index.ts) | Export only the new detector function and named public result/error types. Preserve every existing export and legacy implementation. |

**Public call.** Retain the approved positional API `measurePosition2D(psi, resolution, axes, rng)`. `axes` is the string union `x | xy`; RNG is a required callback returning a number. Return `PositionMeasurement2DResult`, a discriminated union with `axes`, newly allocated `state`, `resolution`, `probability`, `inputNormSquared` and `posteriorNormSquared`. Both variants contain `xIndex` and `x`; only `xy` contains `yIndex` and `y`. Indices are zero-based interior indices. `probability` is the selected discrete outcome mass, never a density, and must be finite and strictly positive on success. Under the owner's IR-01 option A, an unrepresentable selected joint mass fails the attempt; no log-probability or underflow-flag fields are added. `posteriorNormSquared` is the measured norm after final normalization. Keep work vectors, response arrays and the complete outcome distribution out of the result.

**Failures.** Add `PositionMeasurement2DError`, extending `RangeError`, with a stable `stage` of `input`, `x-distribution`, `x-draw`, `y-distribution`, `y-draw` or `posterior`. Stages identify the failing operation, not the number of draws. Wrap an RNG callback exception with the relevant draw stage and retain its cause. Input validation checks axes, callback type, positive finite sigma, safe positive dimensions/storage length, finite increasing bounds, factory-consistent dx/dy, representable spacings/area and finite complex entries. Match the factory convention without allocating a throwaway full grid merely for metadata validation. Reject a nonpositive, underflowed or nonfinite input norm before any draw. No input or geometry error may be delayed until RNG invocation.

**Numerical sequence.** Use row-major input order and ascending detector index order throughout. Evaluate response offset zero as exactly one; compute nonzero offsets using distance/sigma before squaring, avoiding `sigma*sigma` underflow. Maintain separate x/y distance-response and per-input normalization vectors, not axis-pair matrices. X-only does not prepare a y detector or request a y draw. Form area-weighted probability masses from normalized amplitudes; use scale-aware accumulation so an avoidable intermediate square does not overflow when the true input norm is representable. Reject genuinely unrepresentable norms rather than silently accepting arbitrary rescaling.

Accumulate input-x masses, normalize the computed x sampling vector by its finite positive total, and sample with a strict CDF comparison and last-positive-bin roundoff fallback. For `xy`, after detector x is sampled, accumulate the unnormalized conditional input-y vector `c[j]` in row-major order and its sum `C` in ascending j order. Reject nonfinite or nonpositive `C` at `y-distribution`, retaining the one x draw. Normalize each `c[j]` by `C` **before** multiplying by y-response values or convolving with the y detector. Construct the y-outcome vector from that normalized conditional input distribution, verify its finite positive total, then normalize the sampling vector before requesting the y draw. Do not multiply a subnormal unnormalized conditional mass by a y response before dividing by `C`, or assume separately summed totals are bit-identical. Retain the normalized selected x and y masses as separate scalars. Preserve the approved exact formulas and compare the reported joint mass with the independent joint reference. Request one draw per selected axis even for deterministic distributions. Never skip a draw, silently resample or commit an intermediate x-only state.

**Selected-mass underflow policy — IR-01 option A.** After both `xy` draws, calculate the product of the selected normalized axis masses. Before constructing/returning a posterior, require this joint mass to be finite and strictly positive. If it rounds to zero, throw `PositionMeasurement2DError` at `posterior` with a message identifying an unrepresentable selected outcome mass. The attempt retains both draws, changes no committed amplitudes and does not replace the previous successful receipt, even if a scaled posterior could otherwise be normalized. X-only likewise requires its selected mass to be finite and positive after its one draw. There is no probability floor, hidden resampling, successful zero-mass receipt or expanded log-probability API. A retry is a new explicit attempt under T3.

Construct the full complex posterior with separately evaluated square-root x/y masks applied to normalized input amplitudes. Avoid taking the square root of an already-underflowed product of responses or dividing by an underflowed joint mass. Scale and normalize the candidate with dx*dy; check positive representable norm and finite entries before returning. A thrown error returns no result and leaves the input byte-identical, although callback side effects cannot be undone. Gaussian tails may underflow; do not invent a floor or truncate representable tails deliberately. Auxiliary axis storage is O(nx+ny); candidate storage is O(nx*ny); work is O(nx*ny+nx²+ny²). No full joint probability grid is built in production.

**Reference fixtures and tolerances.** Use non-square grids with unequal spacings, complex correlated two-lobe states, boundary/corner mass, interior edge rows/columns, separable Gaussians, and 1×1, 1×n and n×1 cases. Enumerate all selected outcomes using draws placed within reference CDF bins. Compare x-only masses/posteriors and joint masses/posteriors; verify the conditional joint law rather than only a sampling histogram. Include zero draws, the largest representable draw below one, zero-mass leading/trailing bins, deterministic branches, global phase and non-unit input scaling. Compare phases only where masks remain representable. Assert per-input response completeness independently, unchanged input arrays on success/failure, and absence of y properties on x-only results.

Cover malformed metadata/storage, inconsistent spacings, invalid axes/sigma/RNG, NaN/Infinity, zero/underflowed/overflowed norms and large but representable states. Assert zero callbacks for predictable failures; one callback for x-only success; two for joint success. A throwing/invalid first callback has one invocation; a throwing/invalid second callback has two and returns no posterior. Do not label callback-failure tests as evidence that every numerical underflow branch has been naturally reached.

Add real core fixtures, separate from mocked world failures, for a positive subnormal x bin selected by draw zero, conditional normalization before convolution, and separately positive selected axis masses whose product rounds to zero. The last case must produce the selected `posterior` failure after two draws with input unchanged. Cover an invalid conditional total before y sampling (one draw, `y-distribution`) and an invalid y callback (two invocations, `y-draw`). Include a positive-mask posterior whose direct unscaled norm underflows but scaled normalization is representable; distinguish representable selected-mass success from option A's earlier joint-mass refusal. Record exact geometry, entries and observed values in tests/report. The review's underflow example was analytical; this plan does not claim these fixtures have already been reproduced.

For well-scaled tiny references use absolute probability/norm error ≤1e-12 and area-weighted complex error ≤1e-11, after fixing global phase convention consistently. Compare directly here: positive masks should not introduce a new global phase. At 128² require posterior norm error ≤1e-11 and record observed maxima. Continue sigma 0.2/0.4/2 states, including ten repeated measurements of each axis mode and wall-adjacent cases, for 240 ordinary steps per fixture. Require finite amplitudes and norm change from the normalized posterior ≤1e-10 during that bounded run; this accumulation allowance is looser than one normalization and must be reported with observed drift. Do not assert energy conservation across measurement or continuum spreading at the sharp minimum. A continuum claim requires a separately documented refinement study, not widening these discrete tolerances.

**Slice gate:** detector tests and the full existing unit/type/build checks pass before adding world integration. Record actual errors and unresolved sharp-width limits; no UI action yet.

### 3. Add the authoritative world command, stream and bounded receipts

| File | Operation and reason |
| --- | --- |
| [packages/web/src/world/world2d.ts](./packages/web/src/world/world2d.ts) | Add spatial RNG ownership, the owned-state measurement command, roster revision, counters and chronological last-action data. Invalidate both target spatial caches at commit. Wrap existing mood commands only to publish their bounded command receipts without changing registry semantics. |
| `packages/web/src/world/spatialMeasurement2d.test.ts` | Create world integration tests for seeds, commit boundaries, paired targets, caches, invariants, receipts and reset. |
| `packages/web/src/world/spatialMeasurementFailure2d.test.ts` | Create isolated, partial-module-mock tests of precommit numerical failure and retained draws. Keep fault injection out of production. |
| [packages/web/src/world/entanglement2d.test.ts](./packages/web/src/world/entanglement2d.test.ts) | Extend compatibility checks for chronological mood receipts and spatial/mood stream isolation while retaining the existing mood probabilities/draw policies. |
| [packages/web/src/world/world2d.test.ts](./packages/web/src/world/world2d.test.ts) | Extend add/remove revision and reset regression checks. Existing no-action spatial evolution must remain unchanged. |
| [packages/web/src/simulation2d.test.ts](./packages/web/src/simulation2d.test.ts) | Add scheduler tests using the real world command between fake-scheduler callbacks, including a nonzero fractional accumulator. No production controller mutation API is needed. |

**Seed contract.** Add `WorldOptions2D.spatialMeasurementSeed`, checked as an unsigned 32-bit integer, with default **0x53504154**. Export `DEFAULT_SPATIAL_MEASUREMENT_SEED` from the world module so tests and diagnostics can name it. This is a fixed reproducibility constant, not cryptographic randomness. `measurementSeed` remains mood-only. Reuse `createSeededRandom` unchanged; one world-owned spatial closure serves all targets and both axes modes. Store the configured initial seed, cumulative draw count and successful spatial-action count. Increment the draw count at each actual request to the world RNG, not from axes or the number of successful actions. Reset recreates the closure and zeroes both counts; new worlds begin their own sequence. No per-view/per-creature stream, RNG rewind or generator injection option is added.

**World API.** Add `measureSpatial(targetId, axes, resolution)` returning `SpatialMeasurementCommandResult`, discriminated by `status`. Freeze each result and receipt. Rejection precedence is axes, resolution, then target existence; all run before detector invocation. UI guide/morph/stale-token validation remains outside the DOM-free world and runs before this method. Only a recognized `PositionMeasurement2DError` becomes a staged handled failure. Do not mislabel an unrelated programming exception as a numerical failure; the UI contains it as a non-solver command error without automatic retry or fabricated success. Existing mood method return values and exception behavior remain unchanged.

| `SpatialMeasurementCommandResult.status` | Required fields |
| --- | --- |
| `committed` | `receipt: SpatialMeasurementReceipt2D`, `drawsConsumed: 1 or 2`, `spatialDrawCount: number` |
| `rejected` | `reason: target-missing or invalid-axes or invalid-resolution`, `message: string`, `drawsConsumed: 0`, `spatialDrawCount: number` |
| `failed` | `stage: PositionMeasurement2DError.stage`, `message: string`, `drawsConsumed: number`, `spatialDrawCount: number` |

`SpatialMeasurementReceipt2D` is the spatial member of `WorldAction2D`. A core state/distribution/posterior error reports its actual draw delta, including zero; option A's joint-mass refusal is a `posterior` failure with two retained draws.

**Width-validation boundary.** Keep numerical validity distinct from the main UI's controls:

| Layer | Resolution validity |
| --- | --- |
| sim-core | Positive finite number; separate geometry/state representability checks remain required. No UI min/max or step restriction. |
| World | Same positive-finite resolution rule; reject invalid values before RNG. Headless tests may exercise widths outside the UI range. |
| Main UI executor | Finite value in inclusive [0.2, 2]. Slider step 0.1, default 0.4. No floating-point modulo test or rounding of an already in-range request; native and canvas requests share the same check. |

The UI range is not a continuum-accuracy claim. Test positive-finite core/world widths outside that range and UI out-of-range rejection without draws.

Obtain `member(targetId).psi`, not `state(id)`, a renderer buffer, `controller.psi` or the defensive `spatialState` copy. Calculate a complete candidate and allocate/freeze its receipt and committed result before writing amplitudes. Copy candidate values into the existing committed target buffer, delete its entries in `spatialMeans` and `spatialDiagnostics`, increment success counters, and install the already-prepared receipt/result references. No further fallible calculation belongs between the amplitude copy and receipt installation. Saved reset initials, evolution candidate/stepper ownership, time, terrain, other members and moods remain untouched. An ordinary next step still copies committed state into the existing solver candidate.

**Receipt types.** Export `WorldAction2D` and `SpatialMeasurementReceipt2D` from the world module. Every receipt has common `sequence: number`, increasing within the current experiment, and physical `time: number`. The following tables are field contracts, not production code. IDs are strings; axes, indices, coordinates, resolution, probability and norms use the core types; `basis` uses existing `MoodBasis`; counters are numbers.

| Receipt | Fields in addition to `sequence` and `time` |
| --- | --- |
| Spatial | `kind: spatial-measurement`, `targetId`, `axes`, `xIndex`, `x`, `resolution`, `probability`, `inputNormSquared`, `posteriorNormSquared`, `spatialSequence`, `spatialDrawCount`; `yIndex` and `y` only in the `xy` variant. Probability is finite and strictly positive on success; no log/underflow fields. |
| Mood preparation | `kind: mood-prepare`, `pairId`, `creatureAId`, `creatureBId`, `events`: one copied preparation event |
| Single mood measurement | `kind: mood-measure`, `pairId`, `creatureAId`, `creatureBId`, `targetId`, `basis`, `events`: one copied measurement event |
| Sequential mood measurement | `kind: mood-measure-pair`, `pairId`, `creatureAId`, `creatureBId`, `basis`, `events`: two copied measurement events in A-then-B order |
| Mood release | `kind: mood-release`, `pairId`, `creatureAId`, `creatureBId`, `basis`, `events`: the command's actual zero/one measurement event followed by its release event |

`events` uses the existing `MoodEvent2D` shapes without editing the registry or replay format. Freeze copied arrays/events; do not retain states or probability grids. Sequential pair measurement is one command receipt, not two. Do not invent a sampled release result when factorization required no draw. Add a read-only `world.lastAction` getter returning the already-frozen receipt or null so the executor can capture successful mood receipts without a diagnostic snapshot. Keep existing mood method return values unchanged. Constructor/reset receipt-clearing rules remain as below.

Extend snapshots with nullable `lastAction`, `spatialMeasurementCount`, `spatialDrawCount`, configured `spatialMeasurementSeed` and `rosterRevision`. A failed spatial attempt preserves the previous successful receipt and success sequence even if cumulative draws change. The UI's transient failure announcement is not a successful world action. Reset clears receipts and both action sequences while preserving current reset/terrain behavior. Initial Bell preparation supplied during construction is initialization, not a newly announced visitor action: clear last-action/sequence after constructor setup without deleting existing mood history. Existing mood history/replay is unchanged. Do not retrofit transactional rollback onto mood commands; keep their existing successful-call semantics and test them.

Add a monotonic read-only roster revision, incremented once per successful `add`/`remove` (including constructor adds), never for failed edits, selection or ordinary stepping. Reset does not reuse that counter to identify a new interaction lifetime: UI epoch invalidation handles reset even if the roster is unchanged. IDs reused after deletion have a different revision.

**Integration checks.** Warm diagnostics and means, then measure and compare immediate snapshot/effective potential and the next step to a reference world initialized from the independently measured state. Cover independent targets, both members of a registered pair and mixed rosters. Compare all non-target spatial values, terrain, clock and full paired mood data exactly at commit; check saved initials via reset, cache freshness and continued pair-feedback suspension. Test every mood receipt, failed-command receipt preservation, reset/replacement, unsigned-seed limits and reproducible mixed command scripts. Show that mood draws do not advance spatial draws and spatial draws do not advance mood RNG.

Use the existing fake scheduler at timestamps yielding a half-step remainder: establish a previous callback, accumulate dt/2, measure synchronously, then deliver another dt/2. Require the same pending callback identity/request count, no cancels, preserved controller/world identity, and exactly one next committed step. Repeat while paused and for failure/rejection; compare the resulting amplitudes to a measured reference stepped the same number of times. Avoid testing only `playing` or reading a private accumulator as the sole evidence.

For hard-to-reach failures, a dedicated test module partially mocks only the new sim-core detector export: request zero, one or two values from the supplied callback and throw a staged error. Assert actual retained generator advancement, unchanged target/caches/initials/receipts and reset reproduction. Core tests cover real callback failures and real representable fixtures separately. No shipped global hooks or new public fault-injection API are allowed.

**Slice gate:** world/cache/RNG/scheduler tests and full checks pass. Numerical integration is reviewable without activating a menu button.

### 4. Define one interaction owner, strict picking and shared execution

| File | Operation and reason |
| --- | --- |
| `packages/web/src/creatureActionState2d.ts` | Create the small pure interaction transition/eligibility helper, gesture-token checks and the request/result contracts below. No timers, DOM, React or random draws in this helper. |
| `packages/web/src/creatureActionState2d.test.ts` | Create transition, token, cancellation, eligibility, each request/result branch, stale-native-draft and clear/ambiguous/miss tests. |
| [packages/web/src/render/creatureDecoration.ts](./packages/web/src/render/creatureDecoration.ts) | Add a read-only action-candidate classifier beside existing inspection picking. Later appearance changes in step 6 use this same file; retain ordinary inspection's tie policy. |
| [packages/web/src/creatureDesign.test.ts](./packages/web/src/creatureDesign.test.ts) | Extend classifier tests now; update identity/decoration expectations in step 6. |
| [packages/web/src/Gaussian2DDemo.tsx](./packages/web/src/Gaussian2DDemo.tsx) | Prepare the interaction record/executor beside the existing controller for isolated audit testing; mount them only at the final steps-4–8 wiring boundary with provenance/science ready. Then replace selection-only dispatch on the same listeners. Keep the controller effect independent of main view changes. |
| `packages/web/src/CreatureActions2D.tsx` | Create a presentational action/target form and armed-instruction/result region. It receives intent and callbacks; it never owns a second controller, selection fallback or physical mutation path. |
| `packages/web/src/CreatureActions2D.test.tsx` | Create server-rendered form checks for labels, disabled states, explicit targets, axes/width text and result shapes. Native behavior is verified in the browser, not claimed from static markup. |
| [packages/web/src/EntanglementControls2D.tsx](./packages/web/src/EntanglementControls2D.tsx) | Route existing mood controls into typed shared requests, retain diagnostics/history and remove the disappearing-partner fallback. Pair preparation uses the explicit ordered targets owned by the new interaction record. |

**Integration staging and imports.** Keep the new helpers/forms unmounted in the normal application until the activation boundary above; the new step-8 audit fixture can exercise them earlier. Import the helper from `./creatureActionState2d` and component from `./CreatureActions2D`. Do not introduce extensionless TS/TSX module basenames that differ only by case: the earlier proposed helper/component names would collide on Windows. Only proposed paths change here; no existing source file is renamed.

**Interaction state.** Use a discriminated record with modes `inspect`, `terrain`, `spatial`, `mood`, and `entangle`; entangle has zero or one confirmed canvas target and separate explicit native A/B choices. Armed spatial state captures axes and sigma; mood captures basis and registered pair. Keep one mutable current ref and React publication of that same record, not competing booleans. Store an increasing tool epoch and a lifetime token containing the actual world reference and roster revision. Native drafts begin with empty target choices; a change in world/roster does not select a replacement automatically. A persisted width preference may remain 0.2–2/default 0.4/step 0.1, but a view change cancels arming before a different observable can be applied.

Only terrain mode supplies a non-View tool to `bindTerrainPainting2D`. Do not add another measurement pointer binding. Existing primary-pointer/button checks and ≤6 CSS-pixel displacement remain. Down captures pointer ID, canvas, view and epoch; up validates all plus current world/revision and gesture ownership. Cancel on pointercancel, pointerleave, blur, lost capture if applicable, reset, view/tool changes, world/guide replacement and roster edits. Ownership-changing commands cancel pending target drafts. Morph blocks creature execution as well as painting. An unrelated secondary pointer must not replace the active primary gesture.

**Strict candidates.** Add `actionCandidates(layers, index)` returning all eligible visible IDs in layer order. Compute the threshold from the largest peak of **all visible layers before** marginal under-curve filtering; then require local density ≥max(1e-8, 0.01*peak). In 1D additionally require the pointer between the plotted baseline and that creature's actual curve, within the plotting viewport. In 2D require a valid cell from existing physical mapping. Do not prefilter by mood eligibility to click through an ineligible foreground creature. Exactly one candidate allows eligibility validation; multiple candidates explain ambiguity and expose native choices; zero candidates explains a miss and leaves the tool armed. Neither miss nor ambiguity uses selected ID, largest local contribution or lexical order. Hidden layers can be named in native forms with a hidden-density note but cannot supply canvas candidates.

**Shared request envelope.** Define these closed local types in `creatureActionState2d.ts`; no command bus, persistent log or replay platform is added:

- `ActionToken2D`: `world: QuantumWorld2D`, `rosterRevision: number`, `epoch: number`, `view: 1d or 2d`. The world reference is used for identity comparison, never as a copied snapshot. No browser type is needed.
- `WorldUIRequest2D`: `token: ActionToken2D`, `source: canvas or native`, and `command` from the table below. Copy/freeze request data, including a copied interactions payload, so a later form edit cannot mutate a captured request. Shallow-freeze the token, not its referenced world.
- Native forms capture the token when a draft opens or a deliberate target/parameter change is made. Apply uses the stored token, not one regenerated opportunistically in the submit handler. Invalidated native drafts must be explicitly changed/reopened, not silently repaired.
- Canvas down captures its token; qualified up submits that token. The first entanglement target stores it for the second. Direct non-draft native controls such as selection capture their current token in the deliberate activation event.

| `command.kind` | Payload | Call after validation |
| --- | --- | --- |
| `spatial` | `targetId`, `axes`, `resolution` | `world.measureSpatial` |
| `entangle` | `creatureAId`, `creatureBId` | Generate unused `pair-N` after validation, then `world.prepareBellPair` in that order |
| `mood-single` | `pairId`, `targetId`, `basis` | `world.measureMood` |
| `mood-pair` | `pairId`, `basis` | `world.measurePair` |
| `mood-release` | `pairId`, `basis` | `world.measureAndRelease` |
| `select` | `targetId` | `world.select` |
| `add` | No additional payload | `world.addTemplate` |
| `remove` | Explicit `targetId`; no execution-time selection default | `world.remove(targetId)` |
| `interactions` | Copied `Partial<InteractionSettings2D>` | `world.setInteractions` |
| `preset` | `preset: WorldPreset2D` | `controller.loadWorldPreset`, an intentional world replacement |

Play/Pause/Reset/Clear keep the existing `control` path; Reset and replacement invalidate drafts/reactions through the same lifetime routine. First-target selection, arming, cancellation, ambiguity and misses are pure interaction transitions, not world command requests.

**Shared executor.** Prepare one local executor in `Simulation2D` and mount it at final wiring. Validate, in order: mounted world/controller, token world/revision/epoch/view, active solver health, guide restriction, transition, executing guard, then payload and target eligibility. Reject all shared requests during active guided stages; the guide retains its dedicated Play/view/terrain paths. A refusal changes no physics or RNG. Spatial targets may have either mood ownership type; mood requests require the named registered pair; entanglement requires two distinct independent moods and preserves A/B order. Generate an unused pair ID only after both targets validate. First-target entanglement changes no physics. Native selectors choose; Apply executes; clear canvas hits use the same executor. Do not accept arbitrary callback closures. Protect against reentry/repeated events with a synchronous executing guard and consume/disarm the successful creature-tool epoch before publication.

Define `WorldUIResult2D`, discriminated by `status`, with these fields:

| Status | Fields and meaning |
| --- | --- |
| `applied` | `receipt: WorldAction2D or null`, `addedTargetId: string or null`, `publication: published or display-failed`, `message: string or null`. Only add returns a nonnull addedTargetId. Only spatial, entangle, mood-single, mood-pair and mood-release return a nonnull receipt. A postcommit display failure remains applied and can redraw without rerunning. |
| `rejected` | `reason`, `message: string`, `drawsConsumed: 0`. Reasons: `no-world`, `stale-intent`, `guide-forbidden`, `morphing`, `solver-stopped`, `busy`, `invalid-parameters`, `target-missing`, `pair-mismatch`, `requires-independent`, `same-target`, `roster-limit`, `release-required`. |
| `failed` | `stage: PositionMeasurement2DError.stage`, `message: string`, `drawsConsumed: number`, `spatialDrawCount: number`; only a recognized handled spatial failure produces this branch. |
| `command-error` | `message: string`; an unexpected non-solver exception. Never claim RNG rollback or numerical success, pause/resume or retry automatically. Retain the original error locally for diagnosis, not as a successful action receipt. |

After receipt-producing creature success, advance/disarm the epoch before publication. Add/remove/preset/release/preparation also invalidate other ownership/roster-sensitive drafts. Capture `world.lastAction` immediately after a successful receipt-producing call; do not manufacture it from a potentially failing snapshot. Ordinary inspection creates no measurement receipt. Construct the second-target entanglement command only once both targets are explicit and valid.

Expected refusal leaves playback and RNG intact and explains why; ordinary misses remain armed. A handled numerical spatial failure disarms, announces no state update plus consumed draws, and preserves the prior success line. Success disarms and publishes once. Snapshot/render/help publication is a separate try boundary after commit: retain a local receipt and a display-error message, offer redraw, and never call the numerical command again from that recovery. Clear any pending throttled publication before publishing the new committed snapshot, preventing an old scene from overwriting it. Do not call play/pause or the generic pause-on-exception handler for these paths. Existing solver failures keep their current stop behavior.

### 5. Wire action-first navigation, help and reachable result controls

| File | Operation and reason |
| --- | --- |
| [packages/web/src/TerrariumShell.tsx](./packages/web/src/TerrariumShell.tsx) | Add action-first home slots/pages and explicit close/handoff navigation; remove the settings-owned bottom Help & settings trigger. Preserve mounted pages, Back navigation and modal focus behavior. |
| [packages/web/src/TerrariumShell.test.tsx](./packages/web/src/TerrariumShell.test.tsx) | Update static navigation/control assertions for the action-first home and single science trigger rather than the old help/picker structure. |
| [packages/web/src/App.tsx](./packages/web/src/App.tsx) | Move the existing science trigger from the header to a persistent bottom location owned by App, keeping its ref/fallback across scene replacement and access from legacy scenes. Pass current action-guard information needed by the mounted simulation without remounting on view change. |
| [packages/web/src/WorldControls2D.tsx](./packages/web/src/WorldControls2D.tsx) | Retain native inspection/roster/settings controls in menu pages, add last-action spatial diagnostics in Advanced, use neutral identities and send guarded typed roster/ownership requests instead of unchecked creature-action closures. |
| [packages/web/src/Museum.tsx](./packages/web/src/Museum.tsx) | Change the guide's terrain instruction to the actual Draw terrain route; retain science dialog reuse, guide gates, replay confirmation and focus containment. |

**Final-wiring requirement.** This step describes the finished menu, not an early live position button. Prepare it without mounting usable position actions until the steps-4–8 activation boundary.

The home menu order is Draw terrain, Measure position, Entangle moods, then Measure mood — X/Z and retained secondary sections. Draw terrain opens existing terrain controls; choosing a brush enters continuous terrain mode, with an explicit paint-on-canvas handoff. Position opens width and native target controls, plus Arm on canvas. Entanglement opens explicit A/B selectors and a named Apply button, plus its two-click canvas route. Existing pair/sequential/Measure & Release controls remain available under mood actions. Native inspection remains in Creatures; deleting paired members still requires release. Do not add position measurement to the standalone Gaussian or legacy paths as an accidental consequence of shared menu code.

Extend `useSettingsNavigation` with `closeAndHandoff(focusTarget)` and ordinary close with predictable trigger return. Perform handoff only after hidden panel state is committed and focus-trap listeners are removed; then focus the visible instructions/Cancel region. Do not let the menu's initiating pointer-up qualify as a canvas gesture. Native success closes the menu, moves focus to a stable result region/trigger and announces once. Escape belongs first to the top modal, then the popover, then an active creature draft; use handled/default-prevented checks so one key does not cascade through all three. Terrain cancellation is distinct from a physics reset.

Replace the **main-world** bottom picker with Clear terrain, using the same `control('clearTerrain')` path as its menu button. Retain standalone 1D selection because it is a separate experiment, not the removed main-world picker. App owns the only visible What am I seeing? trigger; it calls the existing `openScience`, never settings. Keep the visible trigger available after guide/preset/legacy replacement and use it if the original dialog opener is disconnected.

Show one latest-result line outside the closed menu. Spatial text identifies stable target, x-only or x/y, sampled coordinate(s), sigma and time; mood text identifies basis/outcomes or coordinated preparation/release. Do not use pair subsystem A/B as creature identity. Announce successful sequence changes with a polite live region; periodic snapshots, modal reopening and unchanged receipts must not reannounce. Rejections/failures use transient action feedback and never replace the stored success receipt. Exact probability/norm/seed/draw diagnostics stay in Advanced. No growing action log or persistent spatial marker is added.

### 6. Apply the shared-square layout and reviewed cloud appearance

| File | Operation and reason |
| --- | --- |
| [packages/web/src/style.css](./packages/web/src/style.css) | Give both main canvases one largest-fitting square, put explanation/action/result rows outside it, and adapt bar/menu overflow and focus clearance on short/narrow screens. Style the neutral selection cue and result/instruction regions. |
| [packages/web/src/creatureIdentity.ts](./packages/web/src/creatureIdentity.ts) | Remove the arbitrary-name table/name API; use deterministic `creatureLabel(id)` as `Creature ` plus uppercased ID, including unique extra IDs. Keep labels independent of roster order/RNG. |
| [packages/web/src/CreatureSummary2D.tsx](./packages/web/src/CreatureSummary2D.tsx) | Use the shared neutral label and existing mood/ownership summary without duplicating the old arbitrary name. |
| [packages/web/src/render/creatures2d.ts](./packages/web/src/render/creatures2d.ts) | Apply the owner-selected palette from comparison samples and match field background fill; preserve brightness formula, density values, blend order and grid-sized staging. |
| [packages/web/src/render/density2d.ts](./packages/web/src/render/density2d.ts) | Keep physical mapping/transfer function unchanged; expose a separate main-world background constant if required so a world palette change does not silently recolor legacy Gaussian fixtures. |
| [packages/web/src/render/creatures2d.test.ts](./packages/web/src/render/creatures2d.test.ts) | Update explicit main-world palette expectations only after sample selection; retain independent-density blending, array-size/alias and input-preservation assertions. |
| `scripts/cloud-action-visual-fixtures.mjs` | Create reproducible audit-only scene fixtures/contact sheets for palette, face, boundary and layout comparison without adding presets or scripted motion to the shipped app. |

Reuse the existing CSS size-query approach: a flex/min-size-zero available region contains a square wrapper whose side is min(available width, available height). Both canvas layers are absolute fills of that wrapper; explanation text is a sibling row, not unequal padding/inset inside it. Keep the 450 ms transforms on the two layers and reduced-motion shortcut. Do not modify the marginal renderer's content, scaling, coordinate mathematics or average-terrain band. Clear terrain, playback and science help must not overlap each other or a focus outline; use normal-flow wrapping and bounded internal scroll where needed rather than hiding required controls.

In `creatureDecoration.ts`, remove head ellipses, circular selection rings and arbitrary-name labels; keep small eyes/mouth on existing significant-density anchors, clipping/stale suppression, diagnostic mood annotations and static registered-pair links. Use a small corner/bracket cue, not another circle, for the selected cloud. Neutral references remain available in compact text/native controls, not color alone. Anchor caches must be invalidated after a spatial commit so a new high-density state does not reuse a still-qualifying old face position for another 100 ms. Prefer a receipt/revision-triggered cache clear, not an extra per-frame density scan.

Prepare compact, diffuse, split, overlap and wall-adjacent scenes with faces and terrain independently on/off. Compare the current palette and two palette-only candidates using the unchanged transfer function; keep samples static and labels explicit. **Stop for owner selection of palette/face samples before finalizing visual constants.** This is a remaining human evidence gate, not an implementation choice delegated to the assistant. If no sample is readable, reopen the visual design; do not add glow, autoscaling, probability floors or new transfer functions silently.

**Owner sample selection — 2026-10-31 execution checkpoint.** The owner selected **F1 + P1** from the generated comparison gallery: direct dark-ink faces and non-circular brackets, with the twilight background and bright pastel creature palette. Use the sampled constants without changing the density transfer function. Reference gallery: `D:/Temp/psi-spatial-ui-preactivation-2026-10-31/VISUAL_REVIEW.html`; decision and appearance evidence: `D:/Temp/psi-spatial-appearance-2026-10-31`. This resolves the sample-selection stop above, not overall visual/device/accessibility/performance acceptance. Diffuse-face contrast and crowded overlap labels remain explicit limitations. The remainder of steps 4–8 and its activation/browser prerequisites are still pending; this note supersedes historical “visual sample selection remains open” drafting statements only for this choice.

Implement the permitted surprise as a UI reaction record keyed by world lifetime, receipt sequence and target. Trigger only from a newly committed spatial or mood measurement, including actual measurement within release, not preparation, mere factorization or an ordinary snapshot. A sequential pair receipt may mark its two measured targets in the same bounded record. Expiry is 600 ms of wall time with at most one timeout; redraw on expiry while paused. New measurement replaces the record. Reset, world/roster invalidation, target removal, unmount and disabling animations clear/cancel it. Reduced motion and hidden decorations use ordinary static faces plus the text receipt. No new animation loop, physics RNG or React updates per frame. Extend `creatureDesign.test.ts` with identity/anchor/reaction expectations; browser checks verify real timeout cleanup.

### 7. Update science explanations and protect guide/provenance behavior

| File | Operation and reason |
| --- | --- |
| [packages/web/src/museumScience.ts](./packages/web/src/museumScience.ts) | Read chronological `lastAction` for latest-action science cards, distinguish spatial axes and mood basis, and avoid presenting an old mood event as the latest operation. |
| [packages/web/src/museum.test.tsx](./packages/web/src/museum.test.tsx) | Add action chronology, time-zero measurement provenance, x-only conditional-y wording, guide execution guards and unchanged replay-cancel tests. Preserve existing chapter/parser/proof-link checks. |
| [packages/web/src/content/notebook/museum/measurement.md](./packages/web/src/content/notebook/museum/measurement.md) | Explain main x/y versus marginal x-only finite-resolution updates, click-as-target semantics, sigma, retained-draw failure policy and historical results. Keep legacy coordinate-projection proof limits explicit. |
| [packages/web/src/content/notebook/museum/marginals.md](./packages/web/src/content/notebook/museum/marginals.md) | Explain a full-state x mask across all y, no measured y and possible conditional change of y density for correlated states. |
| [packages/web/src/content/notebook/museum/probability.md](./packages/web/src/content/notebook/museum/probability.md) | Replace named-character/head/halo instructions with neutral identities, cloud-body display and inspect-versus-armed-action behavior. |

**Activation prerequisite.** Complete and test these provenance/science changes in the isolated audit integration before final mounted wiring; they are not a follow-up after exposing Measure position.

In `Gaussian2DDemo.tsx`, remove the generic `world.time === 0` restoration of `pristineGaussian`. Only known initialization, preset setup and reset to known Gaussian initials may restore it. Successful spatial measurement sets it false before scene publication even at t=0. Selection, mood actions and terrain clearing cannot restore it. Keep existing evolution/terrain/feedback invalidation. The existing guide helper stays unchanged unless its protected physics setup is found incompatible; its controller reset/setup APIs remain sufficient.

Help describes a detector result at its recorded time, never a current particle/face position. An x-only result supplies no y coordinate and does not imply an unchanged y marginal. Show no successful measurement card for a failed attempt; retain the prior chronological success. Preserve ten chapter IDs, Observe/Understand/Explore structure, MathML rendering and existing pinned Lean references without new proof claims.

Use shared executor guards for guide stages even if disabled menu buttons are bypassed by stale events. Keep actual Play plus ≥20% computed-width growth, the real marginal view, real positive terrain edit, Back/Skip/Finish and confirmation before replay. Cancelling replay leaves amplitudes, terrain, clocks, both random streams, receipts and the active scene intact. Confirmed replacement cancels drafts/reactions before installing the new lifetime. Finish/Skip still yields the deterministic paused one-creature clean scene.

### 8. Update browser regressions and add end-to-end action evidence

| File | Operation and reason |
| --- | --- |
| `scripts/spatial-actions-browser-check.mjs` | Create a thin runner for the production-build CDP harness and new action cases. |
| `scripts/spatial-actions-browser-cases.mjs` | Create pointer/native/keyboard action cases, scheduler preservation, lifetime invalidation, publication-failure and reaction checks. |
| [scripts/projection-browser-check.mjs](./scripts/projection-browser-check.mjs) | Add the new case entry/visual-fixture registration and update wide-rectangle assertions to equal-square geometry. Preserve full-state, transition, mapping and committed-step checks. Keep audit injection outside shipped builds. |
| [scripts/creature-design-browser-cases.mjs](./scripts/creature-design-browser-cases.mjs) | Replace arbitrary-name/bottom-picker/head-ring assumptions with neutral identities, menu-native inspection and new decoration expectations. Keep ordinary inspect clicks non-measuring. |
| [scripts/terrarium-shell-browser-check.mjs](./scripts/terrarium-shell-browser-check.mjs) | Replace bottom settings-help and selected-dropdown assumptions with single science dialog access, bottom terrain clearing and menu-native inspection; retain compact viewport/focus/terrain checks. |
| [scripts/museum-browser-cases.mjs](./scripts/museum-browser-cases.mjs) | Follow the Draw terrain route, assert the one help trigger/fallback and menu-native selection in the accessibility tree, and add receipt/provenance/replay assertions. |
| [scripts/world-2d-browser-check.mjs](./scripts/world-2d-browser-check.mjs) | Modify the preparation case to open entanglement, explicitly choose Creature A then Creature B and Apply; assert refusal before both targets are chosen. Preserve pair identity/purity/entropy, measurement, release, deletion guards, spatial continuity and loop lifecycle. Do not restore automatic partner fallback. |

**Integration gate ordering.** Use the isolated audit fixture to verify the complete executor/forms/provenance/science path before final mounted wiring. Then run the normal mounted application's complete browser suite before offering the UI slice for acceptance. A passing isolated fixture is not a substitute for normal mounted-application regressions.

Use existing Vite/CDP/Chrome utilities and locked tooling without installing a browser package. Test-only transforms may register the controller, the shared executor and read-only receipt/publication checkpoints in an external audit build; the normal build must contain none of these globals. Fail loudly if a transform anchor is missing. Fixtures may replace test scenes or inject faults in that build only; a fixture is not evidence of evolved dynamics. Run browser scripts serially because existing drivers share fixed ports.

Required end-to-end cases: x/y in paused/running scenes; x-only then return to 2D; independent/paired targets; exactly one command/receipt and one/two draws; native versus clear canvas target equivalence from identical seeded scenes; clear, empty, overlapping, identical-hill and hidden-density hits; pointer drag, wrong button/pointer, leave/cancel/blur and stale down/up; first entangle target with no physical change, ordered second target and native A/B parity; reset, delete/re-add same ID, ownership edit, view switch, morph, world/preset/guide replacement; no silent target fallback or retry.

Check expected rejection does not pause, sampled failure preserves committed bytes and the prior receipt while reporting retained draws, and a postcommit publication fault cannot execute again during redraw recovery. Use audit-only faults for rare failures and name that limitation. Test menu handoff with real pointer/key events, Tab loops, Escape precedence, focus return after scene replacement, announcements once per result, faces off, reduced motion, expiry while paused and cleanup on unmount. Use fake scheduler unit evidence plus real pending-rAF/accumulator checkpoints in the audit build for scheduling claims.

Capture both views at 1920×1080, 1440×900, 1366×768, 1280×720 and 1024×600 with DPR 1/2; repeat small-screen menu/notebook access at 512×300. Assert equal untransformed square bounds, full-domain mapping, backing dimensions matching actual DPR within pixel rounding, no document overflow, and reachable primary controls/focus. Record actual browser zoom separately; CDP viewport emulation is not evidence of real zoom or a real high-DPR display. Human screen-reader, touch/pen and target-device tasks remain explicit acceptance items.

**Slice gate:** shared interaction, navigation, visual samples and science content pass unit/browser regression checks. Any new acceptance failure is recorded, not removed by weakening a physics or safety assertion.

### 9. Measure action latency, incremental cost and retained memory

| File | Operation and reason |
| --- | --- |
| `scripts/performance/spatial-measurement.mjs` | Create a production-bundled core/action latency and bounded-memory audit. Support `--out`, record environment/raw samples, and separate cold work, warm core, handler and next-paint measurements. |
| [scripts/performance/runtime-2d.mjs](./scripts/performance/runtime-2d.mjs) | Add explicit matched-square sizing, a no-action versus fixed seeded spatial-action script, one-creature scene support and recorded action acknowledgements. Preserve serial before/after windows, cap/discarded-time metrics and all raw samples. |
| [scripts/performance/summarize-runtime-2d.mjs](./scripts/performance/summarize-runtime-2d.mjs) | Report every matched ratio, median comparison, action/no-action conditions, backing-size differences and uncertainty rather than only favorable aggregates. |

The latency driver bundles the real new core function and uses production UI action handlers through an audit-only build, not a replacement detector. Treat each combination of axes (`x`, `xy`), creature count (1, 2, 4), playback state (paused, running) and sigma (0.2, 0.4, 2) as a separate latency population: **36 conditions**. For each condition and each measured latency category, collect five cold first-action samples in fresh page contexts and at least 200 warmed actions after 20 warmups. Calculate and apply the warm p95 budgets separately to every condition; do not pool conditions for pass/fail. Core timing does not depend directly on roster/playback, but record it alongside the actual handler condition. Keep all cold samples, raw warmed samples and maximums. Label fixture restoration outside timed regions and repeated live-state measurements distinctly; do not turn timing statistics into Vitest assertions.

The owner approved this per-condition audit workload: at least **180 fresh cold contexts and 7,200 warmed handler actions**, plus warmups, across 36 conditions. This is validation cost, not production overhead. Do not reduce or pool the sampling population silently.

Time numerical work, full synchronous execution/publication/draw, and result-to-next-render-opportunity separately. Measure next-paint with browser trace evidence where possible; label double-rAF measurements as paint-opportunity proxies, not exact visible-pixel latency. Attribute long tasks with traces instead of inferring causality from an unrelated slow frame. **Warm numerical-measurement p95 must be ≤16.7 ms, and warm complete synchronous-action p95 must be <50 ms**, applied separately to every condition above. Report cold samples and all maximums separately; there is no new all-samples latency threshold. Investigate any measurement-attributable long task even when p95 passes. A budget miss reopens the synchronous design; do not hide it with pauses, a worker, smaller grid or different dt.

Extend runtime driver options with `--square-side` for an equal CSS-square audit override applied identically to source pairs, and `--spatial-actions none|fixed`. No-action before/after runs use a side that fits both sources and identical DPR/viewport/scene. The fixed script is finite and documented: alternate x and xy on stable roster targets every two wall seconds at sigma 0.4, logging attempted/committed wall time, receipt sequence and draws; never fire overlapping catch-up actions after a stall. Script scheduling lives in the harness, not production. Compare current build with/without this script separately from no-action source comparisons. Also run the new default largest-square layout without the sizing override, retaining its actual cost.

Run five serial 60-second paired windows per scene with alternating before/after order, after the existing five-second warmup. Report all individual throughput ratios and the ratio of median committed-physical-time throughput after/before. Require ≥0.95 for equivalent-size **no-action** comparison; the allowance is not a measured noise estimate. Report elapsed physical time/wall time, per-frame latency, step-cap hits and discarded wall time independently. One/two/four scenes and both views are characterized; historical absolute sustained acceptance remains open regardless of this relative test. If variance prevents a conclusion, record inconclusive rather than choosing a favorable subset.

For retention, run five batches of 200 explicit actions after warmup, clear transient reactions between batches, collect heap/retainer evidence with consistently applied audit-only GC where available, and compare live objects after collection. Require no retained per-action candidate/distribution arrays, no growing receipt/reaction collection and at most one reaction timeout. Distinguish one-time engine caches from retained measurement work; report bytes and object paths rather than inventing a universal heap-byte threshold. A ten-second no-action trace must show zero detector calls. No hover/draw/ordinary-step measurement calculations are allowed.

### 10. Publish evidence and stop for review

| File | Operation and reason |
| --- | --- |
| `docs/SPATIAL_ACTIONS_VALIDATION.md` | Create the implementation/evidence report: APIs, full touched-file inventory, commands, measured errors, sigma limitations, seeds/failure policy, browser outcomes, owner visual selection, raw performance locations and open human gates. Do not prefill pass claims. |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Add a focused cloud/action/spatial-measurement review entry only after implementation checks, retaining historical 5E records and unresolved sustained gates. Do not relabel all 5E accepted. |
| [README.md](./README.md) | Update current control/scientific-scope instructions and link the validation report. Keep prior phase descriptions explicitly historical; do not imply older GIFs show the new measurement or neutral-identity design. No new media asset is required by this task. |
| [design_draft.md](./design_draft.md) | Record section approval and later handoff/evidence links without retroactively claiming that planning approval authorized implementation or closed acceptance. |

These tables are the complete planned file inventory; repeated mentions of a file across steps describe one planned modification. No additional source/config/assets are implicit. New fixture/validation files are shown as literal paths until created; existing-file links resolve from this root draft.

Run these existing commands at each relevant slice boundary and in the final implementation review:

```bash
npm run test
npm run typecheck
npm run build
npx tsc --project packages/web/tsconfig.world2d.json
npx tsc --project scripts/performance/tsconfig.json
```

Run the browser commands serially. The projection driver and its wrappers build isolated audit production UIs; existing standalone drivers may require a separately running dev server (`npm run dev -- --host 127.0.0.1`). Check each driver's expected URL before launching. Chrome uses the existing default executable or `CHROME_PATH`.

```bash
node scripts/spatial-actions-browser-check.mjs --screenshot
node scripts/projection-browser-check.mjs
node scripts/museum-browser-check.mjs --screenshot
node scripts/creature-design-browser-check.mjs
node scripts/terrarium-shell-browser-check.mjs
node scripts/world-2d-browser-check.mjs
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs --no-screenshots
```

The following commands are **planned new/extended drivers**, not commands verified in this drafting session. Replace the external example paths with recorded local paths; use a fresh output directory for every run. The fixture driver takes `--out` and writes its comparison sheets there. Performance drivers must reject missing baseline or unsupported flags rather than silently falling back.

```bash
node scripts/cloud-action-visual-fixtures.mjs --out D:/Temp/psi-cloud-samples
node scripts/performance/spatial-measurement.mjs --out D:/Temp/psi-spatial-latency
node scripts/performance/runtime-2d.mjs --out D:/Temp/psi-spatial-matched --compare-before D:/Temp/psi-source-before --scene two-interacting --mode plain --batches 5 --seconds 60 --square-side 480 --spatial-actions none
node scripts/performance/summarize-runtime-2d.mjs D:/Temp/psi-spatial-matched
node scripts/performance/runtime-2d.mjs --out D:/Temp/psi-spatial-actions --scene two-interacting --mode plain --batches 5 --seconds 60 --square-side 480 --spatial-actions fixed
node scripts/performance/runtime-2d.mjs --out D:/Temp/psi-spatial-no-actions --scene two-interacting --mode plain --batches 5 --seconds 60 --square-side 480 --spatial-actions none
node scripts/performance/runtime-2d.mjs --out D:/Temp/psi-spatial-largest --scene two-interacting --mode plain --batches 5 --seconds 60 --spatial-actions none
```

Repeat runtime conditions for the driver's independent one/two/four-creature scenes and main 1D/2D views as specified in step 9; extend source-pair view support deliberately rather than bypassing its existing 2D-only guard silently. Report baseline/new snapshot-shape differences explicitly: additive receipt/revision fields prevent a naive whole-snapshot deep equality across versions, so compare protected numerical/mood fields and buffers separately. Existing pixel-byte equivalence across palette changes is likewise not a meaningful visual gate; retain formula/input invariants and reviewed new pixel fixtures instead.

Inspect `git diff --check`, `git diff --stat`, the complete diff and untracked file list. Recheck protected files against the actual-source hashes. Require no unrequested changes, shipped audit globals, secrets, dependencies or generated audit output. Read the final report and edited documentation, verify links and commands, and list exact failed/incomplete checks. Approval requires separate numerical, interaction, visual, accessibility and performance evidence; partial acceptance must name its limits. Do not commit or push. Stop for owner/independent review; no automatic next slice or formal-proof work.

### Resolution record — implementation-readiness round 1

The owner selected IR-01 option A and batch-approved all eight proposed corrections in [goldfish_review_report.md](./goldfish_review_report.md). Applied changes pin conditional normalization and underflow failure, complete world/UI contracts and validation boundaries, define final UI activation, remove the proposed Windows module-name collision, include the world-browser regression repair, clarify both p95 limits, confirm the seed default and specify 36 separate latency populations. Six Major findings and two Nits are addressed by these documentation edits; none was contested, escalated or declined. The [round-1 audit](./implementation_readiness_report.md) remains the historical review record. No independent re-audit, numerical fixture execution, feature validation or implementation authorization is implied. Owner visual-sample selection and other human/device/performance gates remain open.

## Additional Resources

- [Approved concept and review synthesis](./concepts_brief.md).
- [Project specification](./docs/PROJECT_SPEC.md), whose historical vision must be read alongside its scientific-scope warning.
- [Current roadmap](./docs/ROADMAP.md), recording 5E.4 as implemented for review with acceptance still open.

*Drafted with EGM. All design sections and the eight round-1 documentation corrections are approved by the owner. Documentation corrections are applied; no feature implementation has been performed. Independent re-audit, visual sample selection and implementation authorization remain separate gates.*
