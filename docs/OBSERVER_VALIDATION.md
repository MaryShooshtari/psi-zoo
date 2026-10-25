# Slice 3 — Observer release validation

## Scope and release status

Slice 3 is functionally approved: finite-resolution position measurement,
interactive observation, Born-rule notebook, and unclipped density visualization.
The definition of done is met: a player can observe/localize a packet, continue
its real numerical evolution, and read why. Final release checks pass and an
authentic observation GIF is now embedded in the README alongside the retained
Slice 2 scattering GIF. No commit or push has been made automatically.

## Automated evidence

Commands run from the app repository:

```bash
npm run test
npm run typecheck
npm run build
git diff --check
```

- **232 tests in 17 files pass** (224 before Phase 3C).
- Full sim-core and web TypeScript checks pass.
- Production Vite build passes.
- No diff whitespace errors; Windows Git may print LF-to-CRLF notices.
- Added five notebook tests, two density-scale tests, and one real-browser click
  regression test. Existing measurement, CN, terrain, scattering, controller,
  Paint/Observe and seeded replay tests remain green.

Notebook unit checks use React server rendering: bundled Markdown availability,
progressive section structure, dialog navigation markup, six native MathML
blocks with accessible labels, observation examples and proof links. Browser
checks additionally exercise actual modal navigation, layout and equation XML.
The unit renderer test checks computed drawing coordinates, not a screenshot
oracle. Numerical tolerances remain in the core/controller tests; no physics
solver or measurement-mathematics change was needed.

## Final release audit

The complete pending Slice 3 diff was reviewed, including all untracked source,
content, tests, scripts and media: **10 modified tracked files and 15 new files**.
All new files are intentional release deliverables. No raw capture frames,
browser profiles, logs, temporary manifests or build outputs appear in the
pending changes; Vite dist and node_modules remain ignored. There are no package,
lockfile, dependency, TypeScript/Vite/Vitest configuration or CN-solver changes.
The separate Lean repository remains clean and unchanged.

A repository-wide Markdown check found **62 valid local links/anchors across
18 Markdown files**, with no missing relative targets (including reference-style
link definitions). External URL availability was not rechecked in this final
relative-link audit. The final tests, typecheck, production build and diff check
were rerun after GIF/documentation updates. Commit and push are intentionally
left to the user.

## Density display decision

For normalized grid states, Δx ∑ᵢ |ψᵢ|² = 1 implies |ψᵢ|² ≤ 1/Δx.
The fixed density ceiling is **1.05/Δx**, i.e. **10.5 at Δx=0.1**, with headroom
for roundoff and line thickness. The screen-height fraction for density ρ is
sqrt(ρ / (1.05/Δx)). Equal screen spacings therefore correspond to unequal
increments of density; the left ticks explicitly show the true densities:
0.00, 0.42, 1.68, 3.78, 6.72, 10.50 on the current grids.

This nonlinear axis makes broad packets legible without clipping tall measured
peaks or changing the scale during evolution. There is no silent autoscaling,
zoom state or history-dependent peak envelope. Potential remains independently
linear on 0–5; marker and region cuts retain their distinct styles. The axis
caption, canvas accessible description, explanatory text and README all disclose
the square-root spacing. **Screen area is not probability**; use density tick
values and the dx-weighted norm diagnostic. The fixed bound assumes the app's
normalized states, not arbitrary unnormalized external data. Repeated sharp
measurements can approach the grid scale, where conserved norm is not evidence
of continuum accuracy.

## Real-browser acceptance

Executed against the actual Vite app with **Chrome/155.0.8059.86**, headless,
1280×1000 requested window, using Chrome DevTools Protocol through Node's native
WebSocket. No browser-automation dependency was installed. Reproduce with:

```bash
node scripts/observer-browser-check.mjs
```

On another machine set `CHROME_PATH` to the Chrome executable. The script starts
its own Vite server at 127.0.0.1:5174 and browser debugging at port 9223; those
ports must be free. It uses a fresh temporary browser profile and shuts down its
own browser/server afterward. It wraps Canvas2D drawing methods to inspect real
rendered paths; it does not replace the simulation, expose a controller hook,
script wavefunction movement, or edit the numerical state.

| Requested item | Observed result |
| --- | --- |
| 1. Free evolution display | Initial free density moments and unit norm match; actual evolution then changes the displayed state |
| 2. Paint mode | Real mouse press/release edits rendered potential while paused |
| 3. One measurement per Observe action | Real plot click increments count once; pointer location is not the outcome |
| 4. Marker at sampled position | Marker drawing coordinate agrees with the displayed sampled x |
| 5. No clipped localized peak | Peak density exceeds 0.5 while every density coordinate remains inside fixed plot bounds |
| 6. Re-spreading | Free-packet variance reconstructed from real render coordinates grows by more than 4× after continued evolution |
| 7. Paused and playing observation | Both work; observation while playing leaves playback running |
| 8. Norm and energy | Norm remains one to displayed precision; energy and referenced drift are finite/sensible |
| 9. Reset | Initial packet width/time return, observation result clears and playback pauses |
| 10. Notebook | Opens, pauses playback, renders six valid MathML equations and the observation example; closes via button and Escape; Play resumes afterward |
| 11. Keyboard | Space on Observe triggers once; Escape closes the modal and restores focus to its trigger |
| 12. Browser errors | No console/runtime/resource errors in the final successful run |

All **12 acceptance items passed**, expressed as 14 script assertions where an
item has multiple paths. Screenshot files were opened for visual inspection.
This desktop headless check does not replace manual touch/pen, screen-reader,
HiDPI, narrow-screen or cross-browser review. These remain useful release checks,
not claims of completed device testing.

### Bugs found during browser validation

The first run exposed a Phase 3B issue: Chrome's synthesized click PointerEvent
reported isPrimary=false for a primary mouse click. The observation listener had
incorrectly rejected that field. Click routing now checks enabled mode, left
button and plot bounds, not pointerdown-only primary semantics; a dedicated
regression test covers this. Pointer painting's primary-pointer guard is unchanged.

A later run completed all interaction checks but found a 404 resource error from
the missing favicon. The HTML now includes a tiny inline ψ icon and the correct
Observer title. The final rerun had zero browser errors. Earlier failed runs are
not counted as acceptance passes.

## Screenshot provenance

- [observer.png](media/observer.png): captured from the actual running app after
  Reset and one keyboard-triggered observation, paused at t=0; default seed 831,
  σ=0.4, sampled x=−4.80. It shows the true localized density, magenta marker,
  terrain, controls and state-derived diagnostics. Full-page 1280×2025 capture.
- [observer-notebook.png](media/observer-notebook.png): the same app/state, with
  the notebook open and scrolled to its native MathML detector equations.
- Both PNGs come directly from CDP Page.captureScreenshot. They are not fabricated,
  composited, or generated physics illustrations. The script overwrites them
  only with new screenshots from a fresh genuine acceptance run.

## Authentic Observer GIF

[observer.gif](media/observer.gif) is a genuine recording of the running app in
Chrome/155.0.8059.86: **900×698, 51 frames, 8.98 seconds, 1,012,411 bytes**
(about 0.97 MiB). The initial free packet evolves from t=0; a single native
Observe button action, while paused at **t=1.96**, samples **x=−3.30** with default
seed 831 and response σ=0.4. Continued CN evolution re-spreads the localized state
through **t=5.94**. The marker stays at the past observation. The recording shows
the actual state-derived norm and energy readouts before and after measurement.

Reproduce from the repository root:

```bash
node scripts/capture-observer-gif.mjs
```

The script starts its own Vite server and fresh-profile Chrome at ports 5174 and
9223 (which must be free). `CHROME_PATH` can override the executable path. Native
CDP screenshots are sampled at roughly 8 fps. Temporary presentation-only CSS
hides unrelated controls/explanations and compacts spacing so the real plot,
observation action/result and diagnostics fit together. It does not change any
canvas pixels, diagnostic values, controller, RNG, physics, or numerical state.

Encoding uses a fixed 252-color palette and standard GIF LZW, with no added
packages. The only pixel processing is palette quantization; there are no
fabricated or interpolated simulation frames. Screenshot wall-clock intervals
set the evolving frame delays (rounded to centiseconds); the initial,
post-measurement and final real paused frames have readable 0.6, 1.0 and 1.5-second
holds. The animation loops. Re-recordings can have slightly different simulation
action times because this is wall-clock playback, not a deterministic step script.

Chrome's native ImageDecoder successfully decoded **all 51 frames**, and its
summed duration matched 8.98 seconds. Decoded initial, localized and final frames
were visually inspected. The capture run reported **zero browser errors**. Raw
screenshots, decoded verification samples and the capture manifest remain in an
OS temporary directory, not the repository. Only the final GIF and reproducible
capture script are included in the release.

## Lean evidence and scope

The separate companion repo was inspected with clean source status at commit
`94a75c8f71448482434f9d76a667c53cf4d8853e`. The following commands succeeded with
no warnings or errors:

```bash
cd ../psi-zoo-proofs
lake env lean PsiZooProofs/CoordinateProjection.lean
lake env lean PsiZooProofs/CrankNicolsonUnitarity.lean
```

The notebook pins links to these existing checked files at that commit.
CoordinateProjection proves the exact sharp operator's idempotence,
self-adjointness, regional mass and conditional normalized norm. It neither
samples an outcome nor establishes the app's finite-resolution Gaussian POVM.
CrankNicolsonUnitarity concerns exact finite matrices, not floating-point
TypeScript or continuum convergence. No Lean files were modified. No formal
Gaussian-POVM or Born-sampling proof is claimed.

## Notebook implementation limits

The bundled [observer.md](../packages/web/src/content/notebook/observer.md) is the
single content source, with flat frontmatter, sections, paragraphs, HTTPS links
and native MathML. The renderer intentionally supports only that small authored
subset; it is not a CMS or a safe renderer for untrusted user Markdown/HTML.
Only the Observer entry is integrated; the older CN Markdown remains separately
readable documentation. Native MathML needs a modern browser; cross-browser
mathematics and assistive-technology behavior have not all been manually checked.

Opening the notebook pauses and cancels a live paint stroke. Closing leaves the
simulation paused for an explicit Play action. Observation RNG, physical state,
time, terrain and resolution are not changed by reading. Live-example values
are the last sampled outcome, not a continuously tracked particle. The Gaussian
response width need not equal posterior width; arbitrary posteriors need not be
Gaussian, and re-spreading need not be monotonic in arbitrary painted potentials.
