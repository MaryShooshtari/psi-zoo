# Psi Zoo: cloud creatures, direct actions and spatial measurement

* **Author:** Psi Zoo project owner; draft prepared with coding assistant
* **Status:** Draft — Opening sections and Technical Plan approved in conversation, including decisions T1–T3 and the stated acceptance budgets. Alternatives Considered drafted and awaiting approval. Detailed Implementation Plan not yet drafted.
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

## Additional Resources

- [Approved concept and review synthesis](./concepts_brief.md).
- [Project specification](./docs/PROJECT_SPEC.md), whose historical vision must be read alongside its scientific-scope warning.
- [Current roadmap](./docs/ROADMAP.md), recording 5E.4 as implemented for review with acceptance still open.

*Drafted with EGM. Opening sections and Technical Plan are approved; Alternatives Considered awaits section approval. No implementation has been performed.*
