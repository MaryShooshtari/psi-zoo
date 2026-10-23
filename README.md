# Psi Zoo

A quantum-creature terrarium for learning, playing, and formally exploring
Schrödinger dynamics.

**Status:** Slice 2 Phase 3A implemented: configurable directed Gaussian packets,
with validated free motion, building on the accepted Phase 2 painting interface
(user-reported 14/14 manual browser checks). Manual review of the new momentum
control and a demo capture remain. Quantitative scattering/Phase 3B has not started.
See [the roadmap](docs/ROADMAP.md), [potential painting guide](docs/POTENTIAL_LANDSCAPES.md),
[directed packet validation](docs/DIRECTED_GAUSSIAN_VALIDATION.md), and
[Gaussian spreading validation](docs/FREE_GAUSSIAN_VALIDATION.md).

## Explore the project

- **Run the simulation:** [local development](#local-development) and [browser behavior](#browser-simulation).
- **Understand the physics:** [lab notebook](docs/notebook/README.md), starting with
  [why the wave packet keeps its probability](docs/notebook/crank-nicolson.md).
- **Inspect the evidence:** [Gaussian spreading measurements](docs/FREE_GAUSSIAN_VALIDATION.md)
  and [conservation tests](packages/sim-core/tests/crankNicolson.test.ts).
- **Read the formal proofs:** [Lean companion repository](https://github.com/MaryShooshtari/psi-zoo-proofs)
  and [exact theorem-to-source map](docs/notebook/crank-nicolson.md#7-exact-statement-to-source-map).

The completed Lean proof chain establishes exact norm conservation, unique
solvability, explicit evolution, and matrix unitarity for the finite interior
Dirichlet model. **The TypeScript implementation is numerically tested, not
formally verified.** The notebook links the two kinds of evidence and states
what remains outside their scope. Its content is Markdown only; it is not yet
rendered inside the browser app.

## Browser simulation

Starts paused with no terrain and Painting mode off. Use **Play** and **Pause**
to evolve the packet. Enable **Painting mode**, then press/drag inside the plot
with mouse, touch, or pen. Horizontal position sets the location; brush controls
set width sigma (0.3–2 spatial units) and height A (0.1–5 energy units). Defaults
are sigma=0.6 and A=1. Brush settings are held fixed until the stroke ends.
Sparse pointer events produce continuous strokes; repeated painting raises
terrain using max, not accumulation. Painting works paused or running and never
changes the wavefunction directly. Captured dragging outside clamps to the domain
edges; cancellation, focus loss, or disabling painting ends the stroke. Touch
scrolling is disabled over the canvas (scroll elsewhere on the page).

The **Initial momentum p₀** slider selects a value from −1.5 to +1.5; the default
remains +0.75. Negative launches left, zero spreads without drift, and positive
launches right in free space. **Selection only applies on Reset**: changing it
while playing does not kick or replace the live packet.

**Reset** pauses and regenerates the initial packet with the selected momentum at
t=0, **preserving terrain**. **Clear Terrain** removes barriers without changing
the packet, time, playback, or selected momentum. To reproduce the original free
startup, select p₀=0.75, Clear Terrain, then Reset.

The plot displays cyan probability density on the left scale (0–0.5), and dashed
amber potential V(x) on the independent right scale (0–5). Both scales are fixed;
density peaks above 0.5 are clipped, not rescaled. Time, probability norm, and
energy are calculated from the current state and terrain. Norm is conserved up
to roundoff; energy is conserved only while V is unchanged, **not while painting
or clearing terrain**. The overlay updates immediately, even while paused.

Defaults: x in [-20,20], 401 points, dx=0.1, dt=0.01, hbar=m=1,
V=0, center=-5, density standard deviation=1, momentum k0=0.75.
Dirichlet endpoints are zeroed before the single initial normalization. There is
no normalization during evolution. The momentum control keeps |p₀*dx| ≤ 0.15.
Continuum carrier velocity p₀ differs from finite-difference group velocity
sin(p₀*dx)/dx; finite packet width and CN temporal dispersion further affect its
centroid. See [velocity references and tolerances](docs/DIRECTED_GAUSSIAN_VALIDATION.md).
At long times the packet reflects from the Dirichlet walls; negative-momentum
packets start closer to their destination wall.

Playback uses elapsed wall time and fixed numerical steps, normally at one physical
time unit per wall second. Work is capped at eight steps per frame; excess wall
time after a stall is discarded rather than changing dt. Background tabs pause.
React diagnostics refresh at most ten times per second during playback/painting,
with a trailing update for the final paused edit; explicit buttons refresh
immediately. Canvas draws each frame and on terrain edits. Unmount cancels
playback, releases pointer capture, removes listeners, and clears pending UI timers.
Stale playback callbacks cannot restart a loop.

Vite, TypeScript, and Vitest resolve `@psi-zoo/sim-core` directly to its workspace
public source entry, avoiding stale installed workspace copies.

The Node-based Vitest setup tests playback with a fake frame scheduler, including
actual numerical acceptance results, diagnostics, refresh-rate independence,
terrain identity/solver propagation, reset versus clear, and disposal. Pointer
listeners are tested with an EventTarget/capture test double: CSS coordinate
mapping, plot edges, mouse/touch/pen strokes, cancellation, and cleanup, including
integration with the actual playback controller. It does not mount React, test
Canvas pixels, or emulate a real browser's capture implementation. See the
[manual browser checklist](docs/POTENTIAL_LANDSCAPES.md#manual-browser-checklist)
for device input, HiDPI, evolving density, and lifecycle regression checks. The
[new momentum-control review](docs/DIRECTED_GAUSSIAN_VALIDATION.md#limits-and-browser-review)
remains manual and has not been run in Phase 3A. No screenshot or
GIF has been captured yet.

## Local development

Requires Node >=22.19 and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

## Validate changes

```bash
npm run test
npm run typecheck
npm run build
```

## Directory structure

- `packages/sim-core`: dependency-free numerical state, observables, and tested Crank–Nicolson solver
- `packages/web`: React + Vite + Canvas renderer
- `docs/PROJECT_SPEC.md`: initial project handover
- `docs/ROADMAP.md`: vertical slices
- `docs/notebook/`: Markdown explanations, derivations, and links to checked Lean statements
- `docs/FREE_GAUSSIAN_VALIDATION.md`: measured numerical results and tolerance rationale
- `AGENTS.md` and `.pi/prompts/`: coding agent guardrails and shortcuts

The separate [companion repository `psi-zoo-proofs`](https://github.com/MaryShooshtari/psi-zoo-proofs)
contains the completed Crank–Nicolson matrix proof chain in Lean 4 + Mathlib.
See its [proof index and build instructions](https://github.com/MaryShooshtari/psi-zoo-proofs#completed-cranknicolson-proof-chain)
and the [lab-notebook explanation](docs/notebook/crank-nicolson.md).
