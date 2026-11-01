# Goldfish Annotated Review Report

**Status:** Resolved in documentation. The owner selected IR-01 option A, then approved all eight corrections through **Auto accept**, including IR-08's expanded sampling workload. All approved corrections are applied to `design_draft.md`; no independent re-audit or feature implementation has run.

**Target:** [design_draft.md](./design_draft.md), Detailed Implementation Plan, original lines 441–685.

**Findings source:** [implementation_readiness_report.md](./implementation_readiness_report.md), round 1.

**Resolution scope:** Documentation only. No implementation, dependencies, packages, commits, pushes or automatic re-audit.

All eight findings were classified **PROPOSE FIX** and are now **accepted and applied**, with their original severities unchanged. None is contested, escalated or declined. The owner selected IR-01 option A: fail the attempt if the sampled joint mass rounds to zero, retain both draws, and preserve committed amplitudes and the previous successful receipt. The batch approval also covers IR-08's 36 separate latency populations and stated audit cost. Other edits make the existing chosen design explicit or repair its file inventory.

The suggestions below are retained as the approved proposal/decision record, not pending edit requests. The current disposition and verification record at the end supersede their original future-tense approval language.

The finding IDs and original line references below remain tied to the reviewed version. After approved edits, locate sections by headings and recompute line ranges rather than reusing old offsets. The earlier audit report remains a historical record, not a report to overwrite with a passing verdict.

## Prioritized Findings & AI Suggestions

### IR-01 [Implementation readiness] — Severity: Major

- **Affected scope:** [design_draft.md](./design_draft.md), original lines 463 and 467–475; step 2, detector calculation and failures.
- **Discrepancy description:** Conditional normalization order and behavior when the final reported joint mass underflows are not pinned.
- **Rationale:** Different implementations could consume different draw counts and return success versus failure for the same input and callbacks.
- **AI Suggestion:** **PROPOSE FIX**.
- **Justification:** This is a public numerical-result/failure contract, not a cosmetic rounding choice. The analytical example is plausible but has not been executed; the plan should require an actual fixture and should not claim a reproduced bug.

#### Common proposed edit, independent of the policy choice

Replace the conditional-calculation prose with the following requirements:

> After detector x is sampled, accumulate `c[j]` in the stated row-major order and its sum `C` in ascending j order. Reject nonfinite or nonpositive `C` at `y-distribution`, retaining the one x draw. Normalize each `c[j]` by `C` **before** multiplying by y-response values or convolving with the y detector. Construct the y-outcome vector from this normalized conditional input distribution, verify its finite positive total, then normalize that sampling vector before requesting the y draw. Retain the normalized selected x and y outcome masses as separate scalars. Do not multiply a subnormal unnormalized conditional mass by a y response before dividing by `C`. Do not silently resample or publish an intermediate posterior.

Also require these real core fixtures, separate from mocked world failures:

- A positive subnormal x-outcome bin selected by draw zero; normalization of the conditional input-y vector before convolution must not erase an otherwise usable conditional distribution.
- A selected joint-mass product that rounds to zero, using separately positive selected axis masses; assert the owner-selected policy below.
- Invalid conditional total before y sampling: one draw and `y-distribution` failure. Invalid y callback: two invocations and `y-draw` failure.
- A positive-mask posterior whose direct unscaled norm would underflow but whose scaled normalization is representable; demonstrate whether the selected result-probability policy permits the command to reach that posterior.

Record exact fixture geometry/entries and observed numbers in the tests/report. No fixture or pass result is claimed by this proposal.

#### Owner decision recorded: option A — fail if the selected joint mass rounds to zero

| Option | Mechanism | Trade-offs | When it fails or requires refusal |
| --- | --- | --- | --- |
| **A — Fail the attempt** | After both draws, calculate the joint mass. Require it to be finite and strictly positive before returning a candidate. If it rounds to zero, throw `PositionMeasurement2DError` with stage `posterior` and message identifying an unrepresentable selected outcome mass. Retain two draws and leave amplitudes and the previous successful receipt unchanged. | Keeps the existing numeric probability/result shape and ensures successful receipts contain a positive mass. A measurement with a usable scaled posterior can nevertheless fail because its receipt probability is not representable. | Refuses such rare underflow outcomes even when posterior normalization could succeed. Retrying is a new attempt under T3. No hidden resampling. |
| **B — Commit with an explicit underflow diagnostic** | Preserve separate positive selected masses; compute their log sum for `logProbability`. Permit numeric `probability: 0` only with `probabilityUnderflow: true` and finite `logProbability`, and only if a scaled finite posterior is validated. Add these fields to core results and spatial receipts; diagnostics explain underflow rather than calling the outcome impossible. | Preserves usable posterior updates but expands the result/receipt contract and requires honest display of probabilities below number range. Does not require changing RNG ownership or building a log-domain detector. | Refuse at the existing stage if distributions, log mass or scaled posterior are unusable. A plain unqualified zero-probability success is forbidden. |

**Selected: A.** The owner chose option A in conversation. The option table is retained as the decision record; option B will not be applied. Require a finite strictly positive joint mass after both draws. A zero product is a `posterior`-stage failure with two retained draws, no amplitude commit and no replacement success receipt. No log-probability/underflow fields are added to the result API.

This does not change the exact finite-grid model, T1's conditional sampling or T3's retained draws. It does not permit a probability floor, hidden retries or changing the physical grid. Following batch edit approval, this policy is now inserted into step 2 and reflected in the error/result and test descriptions. No new source file is needed.

### IR-02 [Implementation readiness] — Severity: Major

- **Affected scope:** Original lines 494–500, 516 and 525–542; world and UI contracts.
- **Discrepancy description:** World result branches, shared request/result variants, captured-token fields and width-validation layers are incomplete.
- **Rationale:** Existing world mood return types and UI callback closures do not supply these new interfaces; the implementer would need to design them.
- **AI Suggestion:** **PROPOSE FIX**.
- **Justification:** Pin field names and discriminants within the approved small-command architecture. Retain existing mood return values instead of replacing them with a new command framework.

#### Proposed edit: world command/result fields

Insert field tables in step 3. The following describes types, not production code:

| Type/variant | Required fields |
| --- | --- |
| `SpatialMeasurementCommandResult`, committed | `status: committed`, `receipt: SpatialMeasurementReceipt2D`, `drawsConsumed: 1 or 2`, `spatialDrawCount: number` |
| Same, rejected | `status: rejected`, `reason: target-missing or invalid-axes or invalid-resolution`, `message: string`, `drawsConsumed: 0`, `spatialDrawCount: number` |
| Same, failed | `status: failed`, `stage: PositionMeasurement2DError.stage`, `message: string`, `drawsConsumed: number`, `spatialDrawCount: number` |

`SpatialMeasurementReceipt2D` is the spatial member of `WorldAction2D`. Freeze each result/receipt. Rejection precedence is axes, resolution, target existence; all run before detector invocation. Only a recognized `PositionMeasurement2DError` becomes the staged `failed` branch. Do not mislabel an unrelated programming exception as a numerical failure. Such exceptions are contained by the UI's non-solver command-error handling, with no automatic retry or fabricated success.

Pin receipt fields as follows:

| Receipt | Fields in addition to common `sequence: number` and `time: number` |
| --- | --- |
| Spatial | `kind: spatial-measurement`, `targetId`, `axes`, `xIndex`, `x`, `resolution`, `probability`, `inputNormSquared`, `posteriorNormSquared`, `spatialSequence`, `spatialDrawCount`; `yIndex` and `y` only in the `xy` variant. Successful receipts require a finite strictly positive probability under selected IR-01 option A; no log/underflow fields are added. |
| Mood preparation | `kind: mood-prepare`, `pairId`, `creatureAId`, `creatureBId`, `events`: one copied preparation event |
| Single mood measurement | `kind: mood-measure`, `pairId`, `creatureAId`, `creatureBId`, `targetId`, `basis`, `events`: one copied measurement event |
| Sequential mood measurement | `kind: mood-measure-pair`, `pairId`, `creatureAId`, `creatureBId`, `basis`, `events`: the two copied measurement events in A-then-B order |
| Mood release | `kind: mood-release`, `pairId`, `creatureAId`, `creatureBId`, `basis`, `events`: the actual command's zero/one measurement event followed by its release event |

`events` uses the existing `MoodEvent2D` shapes without editing the registry or replay format. Other numeric/string fields have the types already stated for the core and existing IDs/basis. Freeze nested arrays/events. Add a read-only `world.lastAction` getter returning the already-frozen receipt or null so the executor can capture a successful mood receipt without performing a diagnostic snapshot. Keep existing mood method return values unchanged. Build spatial receipt/result before the amplitude copy; publish the already-prepared frozen references after commit. Constructor/reset receipt-clearing rules remain unchanged.

#### Proposed edit: shared UI envelope and requests

Insert in step 4, in the newly renamed pure helper described by IR-04:

- `ActionToken2D`: `world: QuantumWorld2D`, `rosterRevision: number`, `epoch: number`, `view: 1d or 2d`. The world field is a reference used only for identity comparison; never a copied snapshot. No browser type is needed.
- `WorldUIRequest2D`: `token: ActionToken2D`, `source: canvas or native`, and `command` from the table below. Copy/freeze request data at creation so a later selector edit cannot mutate an already captured request.
- Every native form captures its token when a draft is opened or a deliberate target/parameter change is made. Apply uses that stored token, not a token regenerated opportunistically in the submit handler. A stale draft must be changed/reopened explicitly after invalidation.
- Canvas down captures its token; canvas up submits that same token after gesture qualification. The first entanglement target stores it for the second target. For direct non-draft native controls such as selection, capture the current token in the deliberate activation event.

| `command.kind` | Payload | World/controller call after validation |
| --- | --- | --- |
| `spatial` | `targetId`, `axes`, `resolution` | `world.measureSpatial` |
| `entangle` | `creatureAId`, `creatureBId` | Generate the unused `pair-N` ID after validation, then `world.prepareBellPair` in that order |
| `mood-single` | `pairId`, `targetId`, `basis` | `world.measureMood` |
| `mood-pair` | `pairId`, `basis` | `world.measurePair` |
| `mood-release` | `pairId`, `basis` | `world.measureAndRelease` |
| `select` | `targetId` | `world.select` |
| `add` | No additional payload | `world.addTemplate` |
| `remove` | Explicit `targetId`; never rely on the selection default at execution | `world.remove(targetId)` |
| `interactions` | Copied `Partial<InteractionSettings2D>` | `world.setInteractions` |
| `preset` | `preset: WorldPreset2D` | `controller.loadWorldPreset`; this is an intentional world replacement |

This is a closed local union, not a general command bus, log or replay platform. Play/Pause/Reset/Clear continue through the existing `control` path; Reset and world replacement invalidate drafts/reactions through the shared lifetime routine. First-target selection, arming, cancellation, ambiguity and misses are pure interaction transitions, not world command requests.

Shared executor output is `WorldUIResult2D`, discriminated by `status`:

| Status | Fields and meaning |
| --- | --- |
| `applied` | `receipt: WorldAction2D or null`, `addedTargetId: string or null`, `publication: published or display-failed`, `message: string or null`. Only add returns a nonnull addedTargetId. Only the five receipt-producing creature commands return a nonnull receipt. A postcommit display failure remains applied and can redraw without rerunning. |
| `rejected` | `reason`, `message`, `drawsConsumed: 0`. Reasons: `no-world`, `stale-intent`, `guide-forbidden`, `morphing`, `solver-stopped`, `busy`, `invalid-parameters`, `target-missing`, `pair-mismatch`, `requires-independent`, `same-target`, `roster-limit`, `release-required`. |
| `failed` | `stage: PositionMeasurement2DError.stage`, `message`, `drawsConsumed`, `spatialDrawCount`; produced only by a recognized handled spatial failure. |
| `command-error` | `message`; unexpected non-solver exception. Never claim RNG rollback or numerical success from this branch, never pause/resume or retry automatically. The original error is retained locally for diagnosis, not stored as a success receipt. |

Validate in this order: mounted world/controller, token identity/revision/epoch/view, active solver health, guide restriction, transition, executing guard, payload and target eligibility. At the guide guard, reject all shared requests during active guided stages; the guide continues through its existing dedicated Play/view/terrain paths. A non-guide refusal changes no physics or RNG. Validate payload fields from the closed union rather than accepting arbitrary callback closures.

After a successful receipt-producing creature command, advance/disarm the epoch before publication. Add/remove/preset/release/preparation also invalidate other ownership/roster-sensitive drafts. At mutation boundaries the executor captures `world.lastAction` immediately; it does not manufacture a receipt from a potentially failing snapshot. Ordinary inspect selection does not pretend to be a measurement receipt. A second-target entanglement command is constructed only once both targets are explicit and valid.

#### Proposed edit: width predicates

| Layer | Resolution validity |
| --- | --- |
| sim-core | Positive finite number; independent geometry/state representability checks remain required. No UI min/max or step restriction. |
| World | Same positive-finite resolution rule; invalid values are rejected before RNG. Headless tests may exercise other widths without changing UI policy. |
| Main UI executor | Finite value in inclusive [0.2, 2]. Slider uses 0.1 increments and default 0.4; no additional floating-point modulo test or rounding of an already in-range request. Both native and canvas requests use this same check. Numerical limits remain evidence gates. |

The UI range is a control constraint, not a claim that every setting has continuum accuracy. Add focused tests for positive-finite core/world widths outside the UI range, out-of-range UI refusal without draws, stale native drafts and each request/result branch.

### IR-03 [Implementation readiness] — Severity: Major

- **Affected scope:** Original lines 443, 521–551 and 576–608; integration staging.
- **Discrepancy description:** Action exposure precedes the planned provenance/science changes without an explicit activation checkpoint.
- **Rationale:** A partially wired button can apply a valid posterior while publishing false untouched-Gaussian context at time zero.
- **AI Suggestion:** **PROPOSE FIX**.
- **Justification:** Staging should use source integration boundaries, not add a feature-flag system or leave the implementer to invent one.
- **Proposed Edit:** Replace the generic ordered-slice instruction with the following explicit boundary and add a short reminder in steps 4, 5, 7 and 8:

> Steps 1–3 are separate reviewable numerical/world slices. Steps 4–8 are one UI integration slice with ordered internal tasks, not independently shippable action-activation slices. During that slice, create and test helpers and forms unmounted; keep existing mounted actions until a single final wiring change installs the executor, forms, corrected provenance, chronological science and current instructions together. Do not mount a usable position-action entry during steps 4–6. An isolated audit fixture may mount the new forms/executor to test integration, but must not be mistaken for shipped UI activation. Build/type/unit checks run at each internal task; the complete integration and browser checks must pass before the slice is offered for acceptance. No environment/global feature switch is introduced.

> Before the final mounted wiring, demonstrate core/world checks, no-randomness rejection, one/two-draw success, time-zero provenance invalidation, correct latest-action science, axes-correct x-only content and no-pause publication recovery in the audit integration build. Activation does not close later visual/device/performance gates or authorize deployment. Preserve the explicit owner visual-sample stop during this slice.

Update step 4's instruction from immediate mounting to preparation and final-wiring ownership; step 5 describes the finished menu, not an early live button. Tests in steps 7–8 precede final mounted integration. This retains small internal tasks without making an incomplete path usable.

### IR-04 [Codebase details] — Severity: Major

- **Affected scope:** Original lines 516–522; proposed helper/component/test inventory.
- **Discrepancy description:** `creatureActions2d.ts` and `CreatureActions2D.tsx` collide under case-insensitive extensionless module resolution.
- **Rationale:** Vite and TypeScript try `.ts` before `.tsx`; the component import can reach the helper on Windows.
- **AI Suggestion:** **PROPOSE FIX**.
- **Justification:** A distinct basename fixes this without a configuration or architecture change.
- **Proposed Edit:** Rename the **proposed**, not-yet-created helper to `packages/web/src/creatureActionState2d.ts` and its test to `packages/web/src/creatureActionState2d.test.ts` throughout the plan. Keep `CreatureActions2D.tsx` and `CreatureActions2D.test.tsx`. Pin component imports to `./CreatureActions2D` and helper imports to `./creatureActionState2d`. Add an explicit prohibition on basenames differing only by case across TS/TSX modules.

No actual source files are renamed or created during resolution.

### IR-05 [Codebase details] — Severity: Major

- **Affected scope:** Original lines 590–598 and complete-inventory/final regression instructions.
- **Discrepancy description:** `scripts/world-2d-browser-check.mjs` is required but not listed for modification, despite relying on automatic partner fallback.
- **Rationale:** The current case clicks Entangle moods without choosing targets; it cannot validate the approved explicit-target workflow unchanged.
- **AI Suggestion:** **PROPOSE FIX**.
- **Justification:** The expected behavior changes intentionally; update the regression instead of restoring unsafe fallback.
- **Proposed Edit:** Add this step-8 table row, linked to the existing file:

> `scripts/world-2d-browser-check.mjs` — **Modify:** Open the entanglement action, explicitly select Creature A then Creature B in the native ordered-target controls, and activate Apply. Preserve subsequent pair identity/purity/entropy, measurement, release, deletion guard, spatial-continuity and loop-lifecycle checks. Add a refusal assertion before both targets are chosen; do not restore automatic target selection.

The implementation inventory expands by this one existing browser driver. No source/configuration file is added by this correction.

### IR-06 [Style] — Severity: Major

- **Affected scope:** Original line 620; latency acceptance statistic.
- **Discrepancy description:** The detailed wording can imply an all-samples <50 ms full-action budget even though the approved section applies warm p95 to both limits.
- **Rationale:** Acceptance could differ for identical measurements.
- **AI Suggestion:** **PROPOSE FIX**.
- **Justification:** Repeating the already-approved statistic repairs ambiguity without changing the budget.
- **Proposed Edit:** Replace:

> Warm p95 core must be ≤16.7 ms and full synchronous action <50 ms.

with:

> Warm numerical-measurement p95 must be ≤16.7 ms, and warm complete synchronous-action p95 must be <50 ms. Apply both limits to the sampling populations specified below. Report cold samples and all maximums separately; there is no new all-samples latency threshold. Investigate any measurement-attributable long task even when p95 passes.

Keep the existing limits and long-task investigation requirement in the earlier approved acceptance section unchanged.

### IR-07 [Style] — Severity: Nit

- **Affected scope:** Original line 492; seed default wording.
- **Discrepancy description:** The approved section still calls the specified seed a proposed default.
- **Rationale:** It appears to leave another seed-selection gate open.
- **AI Suggestion:** **PROPOSE FIX**.
- **Justification:** This is a small wording repair worth applying alongside the other edits; it does not select a new constant.
- **Proposed Edit:** Replace `with proposed default **0x53504154**` with `with default **0x53504154**`. Keep the seed value, reset policy and separate mood/spatial ownership unchanged.

### IR-08 [Style] — Severity: Nit

- **Affected scope:** Original lines 618–620; latency sample populations.
- **Discrepancy description:** Sample counts and p95 may be interpreted as pooled across playback states and widths or calculated separately.
- **Rationale:** Unequal pooling can conceal a slow condition and makes audit reproduction ambiguous.
- **AI Suggestion:** **PROPOSE FIX**.
- **Justification:** A per-condition proposal is easy to reproduce and does not let a fast width/playback condition compensate for a slow one. It costs more audit time and is subject to owner approval, not treated as an existing approved requirement.
- **Proposed Edit:** Replace the ambiguous sample-count sentence with:

> Treat each combination of axes (`x`, `xy`), creature count (1, 2, 4), playback state (paused, running) and sigma (0.2, 0.4, 2) as a separate latency population: 36 conditions. For each condition and each measured latency category, collect five cold first-action samples in fresh page contexts and at least 200 warmed actions after 20 warmups. Calculate and apply the warm p95 budgets separately to every condition; do not pool conditions for pass/fail. Core timing does not depend directly on roster/playback, but record it alongside the actual handler condition. Keep all cold samples, raw warmed samples and maximums. Label fixture restoration outside timed regions and repeated live-state measurements distinctly.

This requires at least 180 fresh cold contexts and 7,200 warmed handler actions, plus warmups, across the 36 conditions. It is a one-time validation workload, not production overhead. If the owner wants a pooled or reduced audit instead, that sampling policy must be stated before the edit is applied; the proposal does not alter the 16.7/50 ms limits.

## Application and verification record

The owner selected IR-01 option A and then approved the entire correction batch through **Auto accept**. All eight approved corrections are applied. The original reviewed range remains 441–685; the revised Detailed Implementation Plan, including its resolution record, is lines 441–762. Locate contracts by headings rather than reusing historical finding offsets.

| Finding | Severity | Disposition | Applied location in `design_draft.md` |
| --- | --- | --- | --- |
| IR-01 | Major | Accepted and applied | Step 2: conditional normalization, selected-mass failure policy and real fixtures; step 3: failed result/receipt preservation |
| IR-02 | Major | Accepted and applied | Steps 3–4: world receipts/results, width predicates, request/token/result tables and executor order |
| IR-03 | Major | Accepted and applied | Activation boundary and steps 4, 5, 7, 8 integration reminders |
| IR-04 | Major | Accepted and applied | Step 4: distinct `creatureActionState2d` helper/test and explicit imports |
| IR-05 | Major | Accepted and applied | Step 8: world-browser driver modification with ordered native A/B and Apply |
| IR-06 | Major | Accepted and applied | Step 9: explicit warm p95 for both latency budgets |
| IR-07 | Nit | Accepted and applied | Step 3: confirmed seed default `0x53504154` |
| IR-08 | Nit | Accepted and applied | Step 9: 36 populations, per-condition samples/thresholds and approved workload |

**Counts:** 8 accepted/applied (6 Major, 2 Nit); 0 contested, 0 escalated, 0 declined, 0 unapplied findings. This records completion of approved documentation repairs, not an independent passing readiness verdict.

Verification performed during resolution:

- Re-read revised plan and reports; checked world/UI field agreement, underflow stage/draw semantics, width boundaries, staging, proposed filenames, browser inventory and planned command contracts.
- Checked relative local links, balanced code fences, consistent table columns and Git whitespace/diff scope. New planned files remain literal paths, not broken links or executed-command claims.
- Check-script recovery: the Python attempt reported `Python was not found`; a Node retry hit `SyntaxError: Invalid regular expression` from shell escaping. A simplified Node check replaced those attempts; link extraction was corrected after its first version matched zero links. These were documentation-check tooling failures, not application check failures.
- `npm run test`: **421 tests in 40 files passed**.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Only the draft and these two reports are changed/untracked. No application source, dependencies, configuration or package versions were edited; no commit or push occurred.

Existing checks are baseline/regression evidence only. No new detector fixtures, browser actions, visual samples, latency populations or retained-memory audit were executed. The round-1 audit is preserved with a dated resolution addendum; its original verdict is not rewritten.

## Decision checkpoint

Documentation correction is complete. Independent re-audit and implementation authorization remain separate decisions. Owner visual-sample selection, numerical/feature validation and human/device/performance gates remain open. Ask before another audit round or implementation; neither runs automatically.
