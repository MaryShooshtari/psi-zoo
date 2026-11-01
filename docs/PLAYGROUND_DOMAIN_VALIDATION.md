# Slice 5F correction — real rectangular world and quieter UI

This owner-requested correction supersedes the square-domain/letterboxed design
in `REDESIGN_5F_VALIDATION.md`. Earlier dirty spatial-action and numerical work
was preserved. No commit, push, dependency installation, solver alteration or
sustained-runtime matrix was performed.

## Actual physical domain

`packages/web/src/playgroundDomain2d.ts` chooses the main terrarium geometry once
at controller creation from the **actual canvas layout dimensions**, not window
size. It redistributes approximately 128² interior samples between x and y:

- hbar = m = 1; **dx = dy = 20/129**, unchanged; **dt = 1/120**, unchanged.
- x interval count ≈ round(129 sqrt(aspect)); y ≈ round(129 / sqrt(aspect)).
- Extents are interval count × spacing, centered on zero. Physical area remains
  approximately 400. A widescreen world is genuinely wider **and shorter**, not
  a stretched square or a lower-resolution square. Sample rounding introduces
  only a small aspect mismatch. Extreme aspect is bounded to [1/4, 4].
- In the measured desktop browser: **200×82 interior samples**, x approximately
  ±15.58 and y approximately ±6.43. Actual physical rendering occupied >98% of
  both playground axes. Waves, potential editing and detector outcomes can all
  occupy x > 10 (and x < −10).
- The existing rectangular-grid Cayley solver, area-weighted observables,
  terrain functions, marginal projection and Gaussian detector already support
  nx ≠ ny and arbitrary bounds. No sim-core or world implementation changes were
  necessary in this correction. Four zero Dirichlet boundaries remain.
- One physical-to-canvas mapping remains authoritative for rendering, pointer
  inspection, terrain and target hits. No image stretching or extra simulated
  samples outside the chosen bounds are claimed.
- 1D remains dy-weighted probability summed over this same 2D state. Reset,
  presets, ordinary resizes and view switches retain controller geometry.
  ResizeObserver redraws only: **no resampling, re-normalization or reset**.

### Intentional tradeoff

A shorter vertical extent can reflect waves sooner than the previous square.
This is a real change to the finite box, not a new continuum-accuracy claim.
Existing scene geometry stays fixed if the browser's aspect changes substantially;
that existing world may then letterbox. Fresh terrarium mounts use the new aspect.
Reset evolution/world presets do not silently rebuild the box or erase terrain.
This avoids turning an ordinary browser resize into a physics operation.
The standalone legacy Gaussian demonstration retains its original square grid.

## UI corrections

- Top contains only the view switch, centered Psi Zoo title and Menu. The title
  remains visible on mobile. No permanent instructional banner.
- Bottom contains playback, time, Clear terrain, a two-line selected identity/mood
  summary and **What am I seeing?** aligned to the right. Help uses the same
  button styling as its neighbors; on small screens controls wrap without page
  scrolling. Help/notebook focus handling and live contextual explanations remain.
- Removed technical chart paragraphs, numeric endpoint labels and duplicate
  top-of-chart creature legend. Selected face labels remain, with appropriate
  dark text in the light 1D view. The independent terrain band appears only when
  its average is nonzero. Its scientific distinction remains in help/notebook.
- Successful creature actions show a short confirmation for **3.2 seconds**.
  The overlay takes no layout row; after expiry it has zero layout height.
  Full receipts retain stable polite live-region semantics and sequence IDs.
  The latest full details remain in **Menu → Experiments → Latest action details**.
- Armed instructions/cancellation, failures and redraw-only recovery stay visible
  when needed; they are not hidden by a success toast timeout. No executor,
  consumed-intent, ordered-target, RNG, reaction or stale-guard policy was changed.

## Bounded performance measurements

`node scripts/performance/playground-domain.mjs` builds an isolated production
module to external temporary storage. Two mood-driven creatures, unchanged h/dt,
24 warmup steps then five batches of 36 steps; Node v24.20.0:

| Grid | Interior cells | Median ms / complete two-creature step |
| --- | ---: | ---: |
| Previous square 128×128 | 16,384 | 3.734 |
| Near-constant-budget rectangle 194×85 | 16,490 | 3.569 |
| Full-height expansion 300×128 | 38,400 | 8.350 |

The >2× cost of the full-height option motivated the constant-budget rectangle,
**without coarsening sample spacing**. Serial Node microbenchmarks do not prove
browser throughput, FPS parity or sustained performance. Norms remained within
1.7e-13 of one over these short runs.

The focused browser suite also measures five seconds of actual two-creature
playback, using the 200×82 grid and ordinary scheduler/rendering. Final sample:
**4.925 physical seconds / 5.074 wall seconds**, 146 observed rAF callbacks;
maximum final norm error <4.4e-13. An earlier sample recorded 4.992 / 5.032 seconds
and 290 callbacks. Keep this variation: these are bounded probes, not a smoothness
or sustained acceptance pass. Four-creature smoothness remains unestablished.

## Validation actually run

- `npm run test`: **569 tests passed, 47 files**.
- `npm run typecheck`, `npm run build`: passed.
- `npx tsc -p scripts/performance/tsconfig.json`: passed (includes new benchmark).
- `npx tsc -p packages/web/tsconfig.world2d.json`: passed.
- `node scripts/projection-browser-check.mjs --playground`: **25 passed**.
  Verifies actual domain occupancy, propagation beyond x=10, expanded-domain
  pointer terrain and mounted detector, marginal norm, unchanged state on views
  and resize, timed/accessible feedback, details, no notification scrollbar,
  contextual help and fresh responsive geometry at 390×844 and 512×300.
- `node scripts/spatial-actions-browser-check.mjs`: **91 passed**. Includes
  seeded native/pointer equivalence, ordered Bell targets, ambiguous hits,
  cancellation, stale guards, failure recovery, guide guards and DPR1/2 layouts.
- `node scripts/projection-browser-check.mjs --redesign`: **38 passed**. Includes
  playing/reference-step continuity, keyboard menu traversal/focus, live science,
  Clear terrain with a registered Bell pair and responsive view rectangles.
- `git diff --check`: passed (only normal Windows line-ending warnings).

New numerical tests independently specify initial |psi|² variance sigma² and
free Gaussian widths sigma(t)² = sigma0² + t²/(4 sigma0²), with 1% finite-grid/time
error tolerance before wall returns. A directed packet places >55% of probability
past x=10 after 360 actual steps; discrete norm error <2e-12 and free static-H
energy error <2e-11. These are roundoff bounds for the separable discrete free
model, not for arbitrary mean-field feedback or measurement energy changes.

Initial checks caught an obsolete square-border assertion, a test needing the
joint-detector type narrowed before reading y, asynchronous browser setup/focus
readiness, an old miss coordinate outside the new shorter vertical box, and a
notification scrollbar caused by the hidden announcement's static position.
These were corrected; final named suites pass. No failure was reclassified as a
physics success without running its relevant checks.

### Screenshot and raw evidence

Final focused browser output:
`C:/Users/marys/AppData/Local/Temp/psi-projection-check-ij3Nvr/`.
Includes desktop, projection, evolved propagation, confirmation, after-confirmation,
phone, short-landscape images and `bounded-domain-runtime.json`.
Actual images were inspected: the box fills the field, cloud faces remain, help
is bottom-right, notifications leave no strip/scrollbar, mobile/short controls fit.

Node cost evidence:
`C:/Users/marys/AppData/Local/Temp/psi-domain-cost-KI0jiW/results.json`.
Logs in the executing bash environment:
`/tmp/psi-playground-test-final.log`, `/tmp/psi-playground-browser-final.log`,
`/tmp/psi-playground-actions.log`, `/tmp/psi-playground-projection.log`.

## Changed files in this correction

- Domain: new `packages/web/src/playgroundDomain2d.ts` and `.test.ts`.
- UI: `App.tsx`, `Gaussian2DDemo.tsx`, `CreatureActions2D.tsx`,
  `CreatureActions2D.test.tsx`, `CreatureSummary2D.tsx`, `style.css`.
- Render: `render/projection1d.ts`, `render/projection1d.test.ts`,
  `render/creatureDecoration.ts`, `render/creatures2d.ts`, `render/creatures2d.test.ts`.
- Notebook: `content/notebook/museum/{probability,potentials}.md`.
- Browser: `scripts/projection-browser-check.mjs`,
  `scripts/spatial-actions-browser-cases.mjs`, `scripts/redesign-browser-cases.mjs`,
  new `scripts/playground-browser-cases.mjs`.
- Cost probe: new `scripts/performance/playground-domain.{ts,mjs}`;
  `scripts/performance/tsconfig.json`.
- Records: this file, `docs/ROADMAP.md`, `docs/SESSION_HANDOFF.md`,
  supersession note in `docs/REDESIGN_5F_VALIDATION.md`.

Remaining human gates: real AT, touch/pen, hardware zoom/high-DPR, subjective
acceptance and sustained/four-creature performance. No full historical browser
sweep or expensive runtime matrix was run.
