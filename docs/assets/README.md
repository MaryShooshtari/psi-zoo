# Psiways README media

These are real browser captures of the current application, not design mockups.
Historical recordings remain unchanged in `../media/`.

| Asset | Content |
| --- | --- |
| `psiways-terrarium.png` | 1440×900 desktop screenshot, two independent creatures after actual numerical evolution, paused near physical time 1.97. |
| `psiways-marginal.png` | The exact same paused state, terrain and time in the 1D x-marginal view. Every spatial/mood value and controller identity was compared before and after switching. |
| `psiways-evolution.gif` | Seven genuine sampled browser frames, 960×600 presentation, 3.07 seconds including initial/final holds; physical time approximately 0–1.94 in sampled frames. |
| `capture.json` | Browser version, grid, timestep, norms, physical sample times, native GIF decoding results and capture policy. |

The source viewport was 1440×900 at DPR 1. The main rectangular grid had 174×94
interior samples, unchanged spacing `20/129`, timestep `1/120`, and four zero
Dirichlet edges. The final norm errors were below 1.8e-13. No terrain, measurement,
force preset or amplitude fixture was injected: the recording uses the default
independent scene and actual Play/Pause controls. Faces were enabled through the
existing appearance control; reduced motion disabled decorative animation.

PNG screenshots are unaltered browser frames. The GIF downsamples those actual
frames and uses an adaptive global palette with the existing LZW encoding
approach. No interpolated states, invented pixels, synthetic movement or added
annotations are used. Its coarse sampling is a short illustration, not an FPS
benchmark, continuum-accuracy test or sustained-performance acceptance result.
Every GIF frame and its duration were verified with Chrome's native ImageDecoder.

## Reproduce

From the repository root, with existing npm dependencies and Chrome installed:

```bash
node scripts/projection-browser-check.mjs --branding
```

Set `CHROME_PATH` if the harness's default Chrome path does not match your system.
Run serially: the browser harness shares fixed local ports. This command
regenerates only these Psiways assets; it does not overwrite historical media.
Actual sample timings vary with the machine. The capture stops after observing
roughly 1.6 physical seconds, so the final sampled time can be slightly later.

The branding check also verifies metadata, same-state view switching, and title
fit at 390×844 and 512×300. Responsive screenshots and raw audit output go to the
printed temporary directory, not into the application bundle.
