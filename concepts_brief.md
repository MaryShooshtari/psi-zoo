# Psi Zoo: visible cloud creatures, direct actions and spatial measurement

* **Author:** Psi Zoo project owner; brief prepared with coding assistant
* **Date:** 2026-10-30
* **Status:** Two rounds of six independent reviews completed. Consolidated concept awaiting owner alignment; not an implementation authorization or numerical-validation result.

## Overview

The probability cloud should be the creature, not a faint background behind a circular character. Make 2D clouds easier to see, give them small cuter faces without head rings or arbitrary names, and make the shared square playground as large as the screen permits. Keep the current 1D plot presentation within the same playground footprint.

Put terrain drawing and creature actions first in the menu. Choose an action, then click its creature target, or choose targets through accessible menu controls. Measurement applies once; entanglement uses two targets. After success, return to the ordinary pointer. Replace the bottom creature picker with **Clear terrain** and the misleading bottom Help & settings entry with the existing **What am I seeing?** experience, without duplicate help flows.

**Measure position** is the default measurement. In 2D it measures x and y; in the main 1D projection it measures x only, corresponding to a vertical band when viewed in 2D. Use the existing 1D width control and finite-resolution Gaussian convention. Keep **Measure mood — X/Z** separately for registered mood pairs. These are different physical operations, not different labels for one action.

The spatial measurement is a real capability addition, not a cosmetic collapse. Existing evolution, grid, boundaries, time step, legacy measurement behavior and mood-pair rules must remain unchanged. No implementation has started under this brainstorm.

## Analysis

### Owner-confirmed decisions

- **Appearance:** the cloud itself is the body; improve 2D visibility; remove head circles/rings and arbitrary names; use a cuter face. A brief surprise expression after measurement is permitted as decoration, not as a substitute for the state update.
- **Playground:** make the undistorted square as big as possible within available width and height, keeping primary controls accessible. Both main views use the same playground footprint. Keep the present 1D plot content/conventions; no new content just to occupy space.
- **Bottom controls:** replace the creature picker with Clear terrain. Clear drawn wells/barriers only; keep creatures, moods, time and playback. Clearing cannot undo evolution that already occurred.
- **Help:** the bottom What am I seeing? entry gives short explanations of what is happening. Reuse existing science help and avoid duplicating its header entry or creating another help system.
- **Menu priorities:** terrain drawing, measuring, entanglement and other supported creature actions should be easy to find. Preserve secondary settings, notebook, diagnostics and legacy experiments without giving all categories equal prominence.
- **Targeting:** choose a creature tool, then click its cloud. Menu-based target selection is also required. Entanglement uses two creature clicks or two menu selections.
- **One-shot actions:** after a successful measurement or completed entanglement, return to the ordinary pointer. The first entanglement click remains pending until the second valid target. Terrain painting remains continuous.
- **Default measurement:** add spatial measurement in 2D. A real sampled update changes the target's spatial state. Keep paired-mood measurement separately and clarify its meaning.
- **Main 1D measurement:** measure x only on the same full 2D state. Do not sample y or turn the marginal into an independent 1D wavefunction. The owner's perpendicular-line description becomes a finite-width vertical band under the existing measurement convention.
- **Precision:** use the existing 1D width/radius-style control. It represents Gaussian detector resolution in physical units, not a hard disk radius or a guaranteed posterior width.

### Existing system and scope boundaries

This is a local TypeScript/React/Canvas2D app with no backend, accounts or database. `packages/sim-core` is DOM-free TypeScript with Float64Array numerical state. World rules own the state; the UI must not mutate renderer buffers to imitate a measurement.

The main 1D view is an x-marginal of one authoritative 2D world. Switching main views must preserve controller/world identity, complex amplitudes, moods, terrain, time, playback and random-number state. Separate legacy demonstrations are explicitly fresh experiments, not alternate views of that world.

The physical world remains 128×128 interior sites on [−10,10] in both axes, dx=dy=20/129, unstored zero Dirichlet boundaries, hbar=m=1 and dt=1/120. A larger canvas does not authorize enlarging that domain or changing the solver. Each creature has an independent spatial state; registered pairs share a joint **mood** state, not spatial entanglement between creatures.

Existing code already provides density rendering/anchoring, density-based picking, native creature controls, terrain clearing, a settings popover, contextual science and a local notebook. The bottom picker currently calls selection APIs; its removal addresses discoverability, not a proven broken API. Reuse those capabilities rather than adding another menu, help system or framework.

The working tree contains extensive modified/untracked work. HEAD is not a valid snapshot of the current application. Before implementation, preserve the actual working-source baseline; do not reset unrelated files.

### Review outcome: major risks and proposed safeguards

The following safeguards are reviewer recommendations for the design, not claims that the new feature is implemented or tested. Owner decisions above take precedence over superseded remarks in the initial visual-only review.

#### 1. Cloud visibility must be tested independently of the face

Start with background/palette comparisons and, if needed, one fixed monotonic density-to-brightness mapping shared by all creatures. The current map is `1−exp(−rho/0.08)`; changing display contrast is not changing probability. Do not normalize each creature's peak, invent a brightness floor for every numerical tail, or alter density buffers.

Remove the separate head oval/ring/name drawing while reusing significant-density anchoring. Small eyes and a mouth should annotate the cloud, not replace it with a particle-like character. Faces may need to disappear safely near boundaries or ambiguous split modes rather than move into empty space.

**Counter-argument:** stronger contrast reveals diffuse clouds but can saturate compact peaks and overlaps. Compare compact, spread, split, overlapping and boundary states, with terrain and faces on/off, rather than approving only the initial Gaussian. Glow/blur is deferred unless simpler treatments fail.

Keep stable neutral references such as **Creature A** across target lists, status and outcomes; removing arbitrary names must not make color the only identity. Exact letter/selection styling remains a visual-design detail, not permission to restore the rejected head circle.

#### 2. Spatial measurement must preserve the full state's structure

The inspected standalone implementation, `packages/sim-core/src/measurement.ts`, uses a Gaussian detector response normalized separately for each input site, including near boundaries. It samples discrete Born outcome masses and applies the corresponding positive square-root response to the complex amplitudes. This is a finite-resolution measurement, not exact orthogonal coordinate projection or an instruction to put the creature where the mouse clicked.

Proposed numerical contract:

- A click chooses **which creature** to measure; its state determines the detector-outcome probabilities. The click does not choose the outcome.
- In 2D, sample the **joint** x/y outcome. A product Gaussian detector does not make the state's x and y independent. Never sample both original marginals independently when the state can contain x/y correlations.
- In the main 1D view, calculate x-outcome probabilities from the marginal, then apply the sampled x-dependent mask to every y of the original **complex 2D state**. There is no y outcome. Conditioning may change the y marginal if x and y are correlated; do not promise otherwise.
- Use dx*dy in spatial input probability masses. Detector-outcome values are already discrete masses and must not receive another area factor when summed.
- Preserve relative complex phases where the positive mask is nonzero, validate the posterior and normalize it. Do not reconstruct a phase-free wavefunction from the square root of the marginal.
- Adapt explicitly to the 2D **interior-only** storage. Copying the 1D endpoint loops would wrongly discard valid edge-adjacent samples. Flattening physical geometry would invent adjacency across row boundaries.

**Counter-argument:** independent axis sampling or adapting the old routine directly is simpler and can appear to work on separable Gaussians. That is why acceptance needs correlated, nonseparable states and non-square grids, not only Gaussian examples.

The detector mathematics belongs in pure sim-core. Reuse the established convention and small helpers where safe; do not refactor the validated legacy path merely to create a universal measurement framework.

#### 3. Cost must be bounded in both memory and work

At 128×128, a dense input-cell by outcome-cell response contains 268,435,456 doubles: **2 GiB**. Avoiding that allocation is insufficient if an implementation still evaluates every cell pair per click.

The Gaussian response on the rectangular outcome grid can factor by axis without assuming the state factors. Compare two bounded alternatives during design:

- Successive axis calculations of the full joint outcome grid: about 4.2 million contributions at the default grid, with a 128 KiB outcome grid.
- Sample detector x, then detector y conditioned on that sampled detector x, using an uncommitted candidate. This can reduce work, but its RNG/determinism contract requires care.

Neither means independently sampling unconditional marginals. Do not commit an intermediate x-only update during a joint action. Choose the approach using small-grid references and measured latency; no FFT, worker, dependency or new architecture is assumed necessary.

Larger canvas backing stores also cost roughly display area times DPR squared, even though density staging stays grid-sized. Avoid screen-resolution density arrays and detector calculations on hover, animation frames or every numerical step. Keep routine receipts small; do not retain a full probability grid for every past measurement.

**Counter-argument:** a full joint probability grid is small enough to be useful and simpler to inspect than a conditional sampler. Optimize only what measured cost requires; no algorithm choice needs to be sent back to the owner as a product question.

#### 4. One authoritative command must commit the result and invalidate caches

The world, not a renderer or detached `controller.psi`, owns creature amplitudes. Add a narrow world spatial-measurement operation that supports both independent and mood-paired creatures without requiring access to an independent pure mood.

Compute and validate the posterior before committing only the target spatial state. Invalidate its cached means and spatial diagnostics; publish density/projection/face refresh from that committed state. Saved reset initials, terrain, clock, other creatures' amplitudes, mood state and pair ownership remain unchanged at the command boundary.

Existing feedback may respond to the new spatial state on the next ordinary step. Registered-pair mood/social feedback suspension must remain intact until explicit release. Spatial measurement must never secretly measure or release mood ownership.

Canvas and menu execution use the same narrow command/validation path. Separate numerical commit from publication errors so retrying a failed draw does not repeat an already completed measurement.

**Counter-argument:** updating a copied state from UI code looks smaller. It risks changing only the picture, missing caches or excluding paired creatures. A broad mutation/event framework is unnecessary; one owned command is enough.

#### 5. Randomness and failure behavior need an explicit compatibility contract

Legacy spatial measurement draws once after preparing probabilities; mood measurement skips draws on deterministic branches. Do not assume they share a sampling policy. Existing mood randomness is private to its registry, and the current generator exposes no checkpoint/restore API.

Recommend a separately seeded, world-owned spatial stream so spatial actions do not disturb established mood sequences. Specify draw count/order and reset behavior for x-only and joint operations. Validate predictable failures before sampling. If an unexpected failure after sampling must preserve retry determinism, stage spatial generator advancement along with the posterior and success receipt; otherwise document consumed randomness rather than falsely claiming full rollback.

Misses, arming, cancellation, menu changes, view changes, help and face reactions consume no physics randomness. Existing mood-only and legacy 1D sequences must remain unchanged when this new capability is unused.

**Counter-argument:** one shared stream gives a simple chronological action sequence and is a valid alternative if deliberately specified. It broadens compatibility impact and is not an automatic consequence of adding another measurement type.

#### 6. The active tool must be visible, exclusive and safe to cancel

Use one small UI interaction owner: inspect/select, terrain brush, spatial measurement with explicit axes/width, mood measurement with basis, or entanglement with an optional first target. Do not add independent listeners/booleans that can paint and measure on the same gesture.

Arming a canvas action explicitly closes/releases the popover and shows a short instruction plus Cancel. Success returns to the normal pointer. The first entanglement target changes only UI intent, not physics. Menu dropdown changes select targets; a named activation button executes through the same command path.

Recommend clearing unfinished intent on Escape, view/tool changes, reset, world/guide replacement and relevant roster/ownership changes. A view switch changes a future spatial observable from x/y to x-only, so it must not silently carry an armed action across. IDs can be reused after deletion; do not silently retarget stale choices to the next available creature.

Keep direct application for unambiguous hits. For indistinguishable overlapping clouds or identical 1D hills, require explicit native-list choice rather than measuring an arbitrary tie winner. Empty hits never fall back to the previous selection. Expected refusals explain the issue without pausing the simulation or entering its numerical-error state.

**Counter-argument:** ambiguity handling and cancellation cost extra interactions. Limit that friction to cases where the intended target is genuinely unclear; retain the owner-confirmed direct click for clear hits.

#### 7. Menu, receipts and science help must describe the new default consistently

The active menu should lead with **Draw terrain**, **Measure position**, **Entangle moods** and other supported creature actions. Keep **Measure mood — X/Z** separate; only that mood operation has the registered-pair restriction. Position measurement must work on both independent and mood-paired creatures. Keep Measure & Release explicitly mood-related.

During arming, identify **position — x and y** in 2D or **position — x only** in the marginal. Ordinary pointer clicks inspect/select; armed clicks apply the named action. Replace unconditional old text saying cloud clicks never measure or that main-world spatial measurement does not exist.

Use the existing science dialog and notebook, not duplicate content. Update their last-action source beyond mood-only history. Invalidate untouched-initial-Gaussian provenance after spatial measurement, including at time zero; a generic action at t=0 must not mark a measured state pristine.

Recommend one compact latest-result receipt: stable target, operation/axes, detector width when relevant, sampled coordinate(s), outcome probability mass and measurement time/sequence. X-only results must contain no invented y. A detector result is a past observation, not the face position, posterior mean or a tracked particle. The exact marker style can be developed with the visual samples; a receipt must remain understandable with faces disabled.

Preserve whether playback was already running rather than pausing/resuming around measurement. Those calls reset scheduling/accumulator state. This is a compatibility recommendation, not a reason to hide synchronous latency. A future automatic pause would need an explicit product decision.

Surprise follows a successful measurement event, not ordinary changes in mood or a per-frame scan of history. Use a small UI-only expiry with paused redraw/cleanup and reduced-motion support. No new animation loop or RNG draw. A static face plus receipt is the fallback if a transient reaction adds disproportionate cost.

#### 8. Reusing the precision control does not transfer old accuracy evidence

Verified legacy values are **σ minimum 0.2, maximum 2, default 0.4**, slider step **0.1**. Use these as the review/design starting contract, not guessed replacements. A single common σ for both 2D axes is the proposed minimal interpretation; in the main marginal it applies only to x. Label it as detector width in world units, with a short “smaller = finer” explanation; do not use a terrain brush's mouse-centered radius preview.

The old minimum spans two cells at dx=0.1, but only about **1.29 cells** on the unchanged main grid. A finite-grid measurement can be valid even where its later continuum spreading is under-resolved. Repeated measurements can yield a posterior narrower than the detector width.

Separate acceptance for the discrete measurement model, norm/finite continuation and any continuum accuracy claim. Do not silently increase the minimum, refine the grid, smooth the state or change dt to make tests pass. Report unresolved sharp-width limitations honestly.

### Required evidence before claiming the feature works

- Independent tiny-grid input/outcome enumeration for x-only and joint modes, with correlated complex states, unequal spacings, corners and single-row/column cases. Compare outcome masses and complex posteriors, not just final norm.
- Response completeness at every input site; zero/near-one draws; invalid geometry/width/RNG; zero, underflowed, huge and nonfinite states; input immutability and defined post-sampling failure behavior.
- Prewarm world caches, measure paired and unpaired targets, then compare immediate diagnostics and the next normal feedback step against a measured reference. Verify reset initials and non-target/mood/terrain/time invariants.
- Legacy 1D and mood regressions; seeded reset and mixed spatial/mood sequences; no sampling on misses or presentation actions.
- One command/receipt/disarm per deliberate gesture or native activation. Cover overlap, hidden clouds, drags, extra pointers, stale targets, Escape, view changes, deletion/re-addition, guide stages and replay cancellation.
- Scheduler checks with a nonzero fractional accumulator, not merely an unchanged playing flag. Paused and running measurements preserve the existing fixed-step policy.
- Compact/spread/split/overlap/boundary visual comparisons, largest-square layouts, DPR 1/2, real zoom, keyboard and screen-reader tasks, reduced motion and paused face expiry.
- Named-hardware cold/warm measurement latency, complete handler/next-paint cost, memory retention and steady-state overhead. Use preserved actual-source before/after runs and retain adverse results. No detector work while idle.

Historical throughput remains variable: the earlier matched minute was about 0.700 before / 0.705 after, while an unpaired minute reached 0.979. Those results neither validate this addition nor establish headroom for it. A smooth frame rate or a fast isolated face probe does not establish committed physical-time throughput. Do not close that historical gate using only favorable reruns.

## Goals vs. Non-Goals

### In-scope goals

- Clearer cloud creatures with small direct faces, no head rings or arbitrary names.
- Largest fitting shared square, existing 1D presentation and reachable primary controls.
- One action-first menu, bottom Clear terrain, one contextual science-help flow and accessible targeting alternatives.
- One-shot default spatial measurement: joint x/y in 2D; x-only update of the same full state in the marginal; existing precision-style control.
- Existing pair-mood operations retained, clearly named and separate from spatial measurement.
- Pure numerical extension, authoritative world integration, safe targeting and receipts, and validation that distinguishes physics from presentation.

### Out-of-scope non-goals

- New solver, grid/domain/timestep, independent-mood measurement, spatial entanglement between creatures or altered existing mood/legacy measurement probabilities.
- Fake visual collapse, click-forced detector outcomes, per-creature peak normalization or a reconstructed standalone wavefunction for the marginal.
- New backend, accounts, remote telemetry, persistence/replay platform, rendering framework or dependency without separate approval.
- Undoing prior physical evolution with Clear terrain, secretly releasing a pair, or remounting the world when changing main view.
- Claiming the new numerical feature, visual/a11y acceptance or sustained performance has been validated by brainstorming.
- Application edits, commits or next-phase work under this brief alone.

## Alternatives Weighed

| Alternative | Disposition and reason |
| --- | --- |
| Circular character over a faint wave, arbitrary names | Rejected by owner; the cloud is the creature. Neutral stable references remain needed. |
| Merely widen the wrapper around an unchanged square | Superseded by the owner's direction to maximize the square itself. |
| Stretch/crop the field or change its physical domain | Not the chosen layout; preserve the complete undistorted square. |
| Change the 1D plot or fill it with new content | Not requested; retain current content/conventions in the shared footprint. |
| Keep mood-only measurement as default | Rejected after the first review; add default spatial measurement and keep mood separate. |
| Let the pointer choose the detector location | Excluded by the existing finite-resolution Born measurement convention; the click chooses the target. |
| Measure x and y independently from original marginals | Rejected for correlated states; use a true joint or properly conditional distribution. |
| Flatten spatial geometry or create a state from sqrt(marginal) | Rejected: wrong distances or lost phase/full-state structure. |
| Dense 2D transition table or matrix-free all-cell-pairs loop | Avoid both memory and work explosion; assess axis-separable methods. |
| Full joint outcome grid versus conditional-axis sampling | Both candidates; compare clarity, work, numerical references and explicit RNG policy during design. |
| Broad refactor of the legacy detector into a universal framework | Not justified; a small additive extension may be safer than changing validated summation/sampling behavior. |
| Separate spatial RNG versus shared mood/spatial RNG | Separate recommended for compatibility; a deliberately specified shared stream is an alternative, not an implicit default. |
| Persistent creature tools | Owner chose one-shot return to pointer after success. Terrain stays continuous. |
| Confirm every target | Too much routine friction; require extra choice for ambiguous hits, not every clear click. |
| Duplicate help/menu system or new command engine | Reuse existing components and one narrow execution path instead. |
| Infer surprise from mood changes or tracked particle motion | Reject; use a real measurement receipt and no RNG-driven decoration. |
| Pause/resume to conceal measurement cost | Not a technical prerequisite; preserve scheduling and measure latency honestly. |

## Key Decisions & Staging for Next Steps

### Product direction is established

Largest-square geometry, one-shot tools, spatial default, x-only marginal measurement, retained pair-mood measurement and the existing precision control are owner decisions. Algorithm choice, cache/RNG contracts and numerical tests are engineering design work; no further product interview is required just to choose those mechanisms.

The proposed common detector width, compatibility-preserving playback, neutral identifier styling and result presentation should be made explicit in the design draft. Face/contrast/menu samples still need visual review before implementation can be called visually accepted.

### Proposed staging after owner approval

1. Preserve an actual working-source baseline; capture representative state/appearance/performance fixtures without discarding unrelated work.
2. Define the pure detector model and RNG/failure contract. Add independent references and prove the numerical implementation against them before UI activation. Keep existing evolution and legacy sampling untouched.
3. Add the authoritative world/controller operation with cache invalidation, reset/seed behavior, paired-target support, compact receipts and preparation provenance. Validate scheduling and next-step feedback.
4. Compare low-cost cloud/face samples and largest-square layouts. Reorganize the existing menu, relocate help/clearing and wire one shared one-shot targeting workflow.
5. Update guide, contextual help and notebook for spatial versus mood operations; validate all pointer/native/keyboard paths and cleanup.
6. Run the full current numerical/browser/type/build checks plus action-latency and matched rendering/throughput measurements. Return for human visual/accessibility and performance review. No historical gate closes automatically.

### Review record and limitations

**Round 1:** six parallel, fresh-context reviews of the original visual-only scope. Their recommendation to keep mood-only measurement was superseded by the owner's later spatial-measurement request; their appearance, geometry, targeting and compatibility findings remain useful.

**Round 2:** six parallel, fresh-context reviews of the expanded scope. All completed. The parent read every report and checked native receipts/session tool records: each requested/resolved fresh context, read its persona and brief, and made zero write/edit calls. Reports list actual source reads and limitations. Source inspection is not numerical/runtime validation. No tests, builds or benchmarks were run.

| Round | Reviewer lenses | Status | Workflow ID |
| --- | --- | --- | --- |
| 1 | Cost, action debugging, simplicity, UX, compatibility, maintenance | 6 completed | `8f6a2e9e-3062-488e-b74b-39dd2f7c752b` |
| 2 | Cost, scientific traceability, simplicity, UX, compatibility, maintenance | 6 completed | `b4676385-7346-44b2-a009-218aab109b5e` |

Raw reports are local, retention-managed artifacts:

- Round 1: `C:/Users/marys/.pi/agent/sessions/--D--Projects-psi-zoo--/subagent-artifacts/outputs/8f6a2e9e-3062-488e-b74b-39dd2f7c752b/brainstorm/`.
- Round 2: `C:/Users/marys/.pi/agent/sessions/--D--Projects-psi-zoo--/subagent-artifacts/outputs/b4676385-7346-44b2-a009-218aab109b5e/spatial-brainstorm/`.
- Native workflow receipts are under `C:/Users/marys/AppData/Local/Temp/pi-subagents-user-marys/async-subagent-runs/<workflow-id>/workflow-receipt.json`.

The initial attempt to use a nested coordinator was blocked by its runtime capabilities; it performed no review and is not counted. Direct native parent fanout was then used. Some exploratory filenames were absent; reviewers subsequently read the actual files and reported no outstanding required reads. No reviewer saw another's raw report during its review.

Only `concepts_brief.md` has been edited in the project for this brainstorm. Coordination scripts/reports are external artifacts. No application code, numerical operation, package, version, Lean source, commit or push was changed.

**Next gate:** the owner reviews this consolidated brief and confirms alignment. Only then choose a formal design/RFC handoff, further refinement or keeping the brief for later. This document does not authorize implementation by itself.
