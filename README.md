# Psi Zoo

A quantum-creature terrarium for learning, playing, and formally exploring
Schrödinger dynamics.

**Status:** Slice 1 numerical core and browser integration implemented; manual
browser review and a demo capture remain. The Canvas plot shows actual
Crank–Nicolson evolution of a free Gaussian. See [the roadmap](docs/ROADMAP.md)
and [Gaussian validation results](docs/FREE_GAUSSIAN_VALIDATION.md).

## Browser simulation

Starts paused. Use **Play**, **Pause**, and **Reset** to evolve or reconstruct the
initial packet. The plot uses fixed axes and displays density computed directly
from the numerical wavefunction. Time, probability norm, and energy are calculated
from that same state.

Defaults: x in [-20,20], 401 points, dx=0.1, dt=0.01, hbar=m=1,
V=0, center=-5, density standard deviation=1, momentum k0=0.75.
Dirichlet endpoints are zeroed before the single initial normalization. There is
no normalization during evolution. At long times the packet reflects from the walls.

Playback uses elapsed wall time and fixed numerical steps, normally at one physical
time unit per wall second. Work is capped at eight steps per frame; excess wall
time after a stall is discarded rather than changing dt. Background tabs pause.
React diagnostics refresh at most ten times per second while Canvas draws each
frame. Unmount cancels playback, and stale callbacks cannot restart a loop.

Vite, TypeScript, and Vitest resolve `@psi-zoo/sim-core` directly to its workspace
public source entry, avoiding stale installed workspace copies.

The existing Node-based Vitest setup tests the playback controller with a fake
frame scheduler, including actual numerical acceptance results, diagnostics,
refresh-rate independence, errors, reset, and StrictMode-style disposal. It does
not mount React or test Canvas pixels. Manual checks still needed: button and
keyboard interaction, plot readability on small/high-DPI displays, resize,
background-tab pause, and development StrictMode/HMR cleanup. No screenshot or
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
- `AGENTS.md` and `.pi/prompts/`: coding agent guardrails and shortcuts

The separate companion repository `psi-zoo-proofs` will formalize selected
mathematical claims in Lean 4 + Mathlib. No Lean proof is claimed yet.
