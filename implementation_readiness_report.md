# Implementation readiness review — Psi Zoo spatial actions

- **Date:** 2026-10-31
- **Target:** [design_draft.md](./design_draft.md), Detailed Implementation Plan, lines 441–685.
- **Reviewed content SHA-256:** `dfff082d1ae766d5cf69a1e84664a7c7e191a65afe4c1028a422f584f9ec93cf` (working-file bytes before this report was written).
- **Selected review:** EGM Stage 9, implementation plan only; round 1.
- **Reading boundary:** The target and its referenced material; no additional owner-supplied reading list. Earlier design sections were used to interpret the approved contracts, not subjected to a full feature-spec review.
- **Disposition:** **Not ready for implementation handoff under the implementation-readiness standard.** Six Major findings and two Nits remain open. No finding was assigned Blocker severity; the reviewers' overall blocking verdict means the readiness gate did not pass, not that each finding is a Blocker.
- **Changes made:** This report only. The reviewed design and application source were not changed by the review. The design's pre-existing working-tree modification remains intact.

## Scope and evidence

Three independent reviewers ran with fresh conversation context. The parent read each complete report, checked the native workflow receipt, and inspected the child session tool-call records. Each requested and resolved `fresh` context, read its designated persona and supplied standard, and completed. The style reviewer had no separate standard. Child calls were limited to file reads, directory listings and source searches; no write/edit, shell execution, compilation, tests, installs or child delegation calls appeared in the records.

| Reviewer | Status | Result | Findings |
| --- | --- | --- | --- |
| Implementation readiness | Completed | Not ready | 3 Major |
| Codebase details | Completed | Not ready | 2 Major |
| Style and contract clarity | Completed | Not ready | 1 Major, 2 Nit |

The parent also checked the cited world-browser preparation case, web TypeScript configuration and Vite extension ordering. Other source claims are attributed to the reviewers and their read coverage. The underflow example is analytical, not a reproduced runtime failure. No tests, builds, browser checks or benchmarks were run during this review; earlier 421-test/typecheck/build results remain baseline evidence only.

This is one completed audit round, not a converged review loop. No fixes, accepted-risk decisions or re-audits have occurred. The full feature-spec stages were not run because the owner selected implementation-plan-only review.

## Findings

### IR-01 — Major: Define the conditional-underflow and reported-probability policy

**Raw finding:** `readiness-1-1`

**Target:** `design_draft.md:463,467–475`

The plan specifies conditional normalization, separately evaluated square-root masks and a returned joint outcome mass, but does not fix the behavior when usable conditional distributions and a normalized posterior coexist with a joint mass that rounds to zero. It also does not fix whether the conditional input-y vector is normalized before convolution with the y response.

The reviewer describes a legal unequal-spacing 2×2 fixture with one occupied input site. An off-diagonal x response rounds to `Number.MIN_VALUE`; a zero draw selects that first positive x bin. A conditional y response slightly below 0.5 can erase a subnormal numerator if multiplied before normalization. Normalizing the conditional vector first may avoid that loss. Even then, the reported product of x and conditional-y masses may round to zero while square-root masks remain usable.

**Why this matters:** Different implementations can disagree about success versus failure, whether a successful receipt can report zero probability, the error stage, and whether one or two draws remain consumed. These are externally visible command/RNG contracts, not only rounding differences.

**Required clarification:** Pin the conditional calculation order, specify the outcome if the reported joint mass underflows, and name the failure stage and expected consumed draws for that policy. Add a focused numerical fixture. Do not silently choose success-with-zero, failure, a probability floor or a new log-probability API during implementation.

**Source basis:** Approved detector formulas in the earlier design; `packages/sim-core/src/grid2d.ts:createPsiGrid2D` permits the described class of geometry. **Limitation:** analytical example only; its exact floating-point fixture was not executed.

### IR-02 — Major: Finish the world/UI command contracts and width-validation boundaries

**Raw finding:** `readiness-1-2`

**Target:** `design_draft.md:494–500,516,525–533,542`

`SpatialMeasurementCommandResult` describes branches but leaves the discriminant field, rejection-reason representation and complete fields unspecified. The helper is told to define shared request/result types without enumerating the variants. The executor's lifetime/epoch fields and the requests for mood, ownership and roster operations are likewise not fully pinned. The distinction between a positive-finite core sigma, world command validation and the UI's 0.2–2 slider range is unclear.

**Why this matters:** A fresh implementer must design interfaces while connecting the world, executor and forms. Those choices affect stale-event rejection, diagnostics and acceptance tests. Existing mood wrappers return an event, a pair of events or void; existing UI callbacks use unchecked function closures, so there is no existing uniform interface to reuse unchanged.

**Required clarification:** Add concise field tables or illustrative type declarations for the world result/rejection reasons, every shared request/result variant, captured world/roster/epoch information, and the separate core/world/UI width-validity rules. Reference the existing receipt definition rather than repeating it wholesale.

**Source basis:** `packages/web/src/world/world2d.ts:measureMood`, `measurePair`, `prepareBellPair`, `measureAndRelease`; `packages/web/src/EntanglementControls2D.tsx:action`; `packages/web/src/Gaussian2DDemo.tsx:worldAction`.

### IR-03 — Major: Specify when the default spatial action becomes usable

**Raw finding:** `readiness-1-3`

**Target:** `design_draft.md:443,521–533,545–551,576–587,608`

Step 4 mounts execution/form logic, step 5 exposes Measure position and Apply/arming controls, but provenance and chronological science integration arrive in step 7. The next combined review gate is in step 8. The opening requires ordered stable slices and forbids an incomplete default action, but does not say whether steps 4–8 are one unpublished integration slice or how entry points stay unavailable until their dependencies are complete.

**Why this matters:** The current controller presentation can restore untouched-Gaussian provenance for a generic time-zero world action. If the new button becomes active before that behavior is removed, a real measured state can be published as pristine. The implementer must invent staging/activation behavior or expose an incomplete scientific path.

**Required clarification:** State the exact activation checkpoint and prerequisites. Make provenance invalidation, chronological help and shared guard behavior prerequisites for usable default position actions. Specify how intermediate steps remain buildable and testable without exposing incomplete behavior; do not implicitly authorize a new feature-flag platform.

**Source basis:** `packages/web/src/Gaussian2DDemo.tsx:pristineGaussian`, scene publication and `worldAction`; the plan's own step-7 repair.

### IR-04 — Major: Remove the proposed case-insensitive module-name collision

**Raw finding:** `codebase-1-1`

**Target:** `design_draft.md:516–522`

The proposed pure helper `creatureActions2d.ts` and React component `CreatureActions2D.tsx` have the same extensionless basename under case-insensitive comparison. This project uses extensionless imports. TypeScript and Vite try `.ts` before `.tsx`, so a component import can resolve to the helper on an ordinary case-insensitive Windows checkout.

**Why this matters:** The proposed inventory can cause missing exports or platform-dependent module resolution. Avoiding it currently requires an unplanned rename or an import/configuration workaround.

**Required clarification:** Assign distinct case-insensitive basenames to the helper and component, and update their tests and planned imports consistently. This is a naming repair; no resolver/configuration change is needed.

**Source basis:** `packages/web/tsconfig.json:compilerOptions.moduleResolution` is `Bundler`; installed TypeScript `tryAddingExtensions` and Windows case-sensitivity logic; installed Vite `DEFAULT_EXTENSIONS` in `node_modules/vite/dist/node/chunks/logger.js`. The parent confirmed the configuration and Vite extension order. **Limitation:** no proposed-file build was run.

### IR-05 — Major: Include the required world-browser regression repair in the file inventory

**Raw finding:** `codebase-1-2`

**Target:** `design_draft.md:523–531,545,590–598,637,657`

The plan removes automatic partner fallback and requires explicit ordered A/B targets. The required final regression command still runs `scripts/world-2d-browser-check.mjs`, whose preparation case clicks Entangle moods immediately after loading a fresh world and waits for `Pair pair-1`. It selects neither target. The script is omitted from the declared complete modification inventory, which forbids unlisted edits without approval.

**Why this matters:** The unchanged regression depends on the exact fallback the new design removes. Preserving fallback to pass the old test would violate the targeting contract; changing the test is currently outside the listed execution scope.

**Required clarification:** Add a Modify entry for `scripts/world-2d-browser-check.mjs`. Its preparation case must open the action, explicitly choose ordered A/B targets and Apply, then retain its existing pair, measurement, release and spatial-continuity checks.

**Source basis:** `scripts/world-2d-browser-check.mjs:105` and following pair assertions; `packages/web/src/EntanglementControls2D.tsx:target` fallback. The parent independently read the cited regression case.

### IR-06 — Major: State the latency acceptance statistic for both budgets

**Raw finding:** `style-1-1`

**Target:** `design_draft.md:620`, compared with approved acceptance wording at line 311.

The detailed plan says, “Warm p95 core must be ≤16.7 ms and full synchronous action <50 ms.” This can mean p95 for both or an all-samples limit for the full action. The earlier approved acceptance section applies warm p95 to both metrics, and the detailed paragraph separately says maximums have no new pass threshold.

**Why this matters:** Identical measurements can produce different acceptance verdicts depending on the reader's interpretation.

**Required clarification:** Repeat “warm p95” explicitly for both numerical and full synchronous-handler limits, retaining the approved treatment of cold samples, maximums and long-task investigation. A stricter all-samples requirement would be a changed acceptance decision, not an editorial repair.

### IR-07 — Nit: Remove provisional wording from the approved seed default

**Raw finding:** `style-1-2`

**Target:** `design_draft.md:492`

The approved execution contract still calls `0x53504154` a “proposed default,” even though earlier sections say the detailed plan will pin it and no remaining seed-selection gate is listed.

**Required clarification:** State that it is the default, or explicitly identify an unresolved seed decision. The finding does not propose a different value.

### IR-08 — Nit: Define the latency sampling populations

**Raw finding:** `style-1-3`

**Target:** `design_draft.md:618–620`

Five cold contexts and at least 200 warmed actions are required for each axes mode and population size, “covering” playback states and three widths. It is unclear whether counts and p95 limits apply separately to every playback/width combination or to pooled samples.

**Why this matters:** Different sample allocations can hide a slow subgroup or yield different p95 values while appearing compliant.

**Required clarification:** Define per-condition counts and thresholds, or a pooled allocation with mandatory subgroup reporting. This review does not select a policy on the owner's behalf.

## Traceability and open decisions

| Consolidated ID | Reviewer finding | Severity | State |
| --- | --- | --- | --- |
| IR-01 | readiness-1-1 | Major | Open; numerical policy clarification needed |
| IR-02 | readiness-1-2 | Major | Open; interface/validation contract needed |
| IR-03 | readiness-1-3 | Major | Open; activation/staging contract needed |
| IR-04 | codebase-1-1 | Major | Open; proposed file naming repair needed |
| IR-05 | codebase-1-2 | Major | Open; file inventory and regression repair needed |
| IR-06 | style-1-1 | Major | Open; acceptance-statistic clarification needed |
| IR-07 | style-1-2 | Nit | Open; seed wording clarification needed |
| IR-08 | style-1-3 | Nit | Open; sampling-population clarification needed |

No raw finding was dropped or merged away. No finding has been contested, accepted as risk or fixed. A later resolution step should assess each finding before editing; reviewer recommendations are evidence, not authority to change architecture or acceptance requirements.

## What this review did not reopen

The reviewers found the owned-state commit seam, two-cache invalidation, interior-only grid convention, separate RNG streams and scheduler-preservation direction consistent with the inspected code. This is source-level support for the proposed boundaries, not validation of the new numerical operation.

Explicit owner selection of palette/face samples is a legitimate later gate, not an undocumented choice forced onto the implementer. Target-device, assistive-technology, real zoom, touch/pen and sustained-performance gates remain open. Proposed new files and APIs were not counted as defects merely because they do not yet exist.

## Review provenance and limitations

**Workflow:** `3515b0b5-6c9f-4a4c-81fd-f950f81fb51d`.

| Role | Child run |
| --- | --- |
| Implementation readiness | `9f7977de-14a9-4a35-b76b-58c19c8565e1` |
| Codebase details | `ac9d3a58-0cb2-4a63-844d-fd1c847cc2a2` |
| Style | `57ef9dad-ef1e-4c7e-a174-92b5be84cbe3` |

Complete raw reports, including individual read lists and limitations, are local retention-managed artifacts under:

`C:/Users/marys/.pi/agent/sessions/--D--Projects-psi-zoo--/subagent-artifacts/outputs/3515b0b5-6c9f-4a4c-81fd-f950f81fb51d/implementation-review/`

Files: `readiness-r1.md`, `codebase-r1.md`, `style-r1.md`.

The native workflow receipt is:

`C:/Users/marys/AppData/Local/Temp/pi-subagents-user-marys/async-subagent-runs/3515b0b5-6c9f-4a4c-81fd-f950f81fb51d/workflow-receipt.json`

All reviewers read the active target range and required persona/standard files. Source coverage was targeted, not an exhaustive read of every referenced file. Two exploratory lookups were absent: `tsconfig.base.json` and Vite's old `dist/node/constants.js` location. Neither is an advertised required plan reference. The actual Vite defaults were subsequently located; no finding relies on the absent files.

The parent verified the actual guidance-read calls and observed read/search-only tool records (49 readiness calls, 105 codebase calls and 7 style calls). Fresh-context isolation concerns conversation history; it does not mean a separate filesystem or independently isolated project instructions. This review made no claim to validate the feature's physics, runtime behavior or performance.

## Next checkpoint at the time of round 1

Choose whether to resolve findings with the agent, update the design manually, conclude with these findings open, or pause. No fixes or further audit rounds run automatically. Implementation remains unauthorized by this review.

## Resolution addendum — 2026-10-31

The owner subsequently selected IR-01 option A and batch-approved all eight documentation corrections through **Auto accept**, including IR-08's 36-condition latency sampling workload. The corrections are applied to [design_draft.md](./design_draft.md); dispositions and resolution checks are recorded in [goldfish_review_report.md](./goldfish_review_report.md). All six Major findings and two Nits are addressed in documentation, with none contested, escalated or declined.

This addendum does not revise the historical findings, original line references, reviewed hash or **Not ready** verdict above. No independent re-audit has run, and documentation repair alone is not a passing readiness verdict. Existing checks were rerun during resolution: 421 tests across 40 files, typecheck and build passed. No new detector, browser, visual or performance validation is implied. Implementation remains separately unauthorized; owner visual-sample selection and human/device/performance gates remain open.
