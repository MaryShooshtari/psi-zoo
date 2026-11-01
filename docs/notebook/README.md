# Psiways lab notebook

A place to move from **watching** a wave packet, to **understanding** its equations,
to **checking** the evidence. This follows the [original notebook vision](../PROJECT_SPEC.md):
plain Markdown entries with frontmatter and editorial links to the corresponding
Lean statements. The main playground's **What am I seeing?** opens contextual
help, a seven-step learning path in the current scene, and the complete notebook.
In-app equations use native MathML; no equation-font download is required.

## Playground chapters

Read these in the app, or inspect their authored Markdown sources:

- [Wavefunctions and probability](../../packages/web/src/content/notebook/museum/probability.md)
- [Free spreading](../../packages/web/src/content/notebook/museum/spreading.md)
- [Marginal distributions](../../packages/web/src/content/notebook/museum/marginals.md)
- [Potential energy and dynamics](../../packages/web/src/content/notebook/museum/potentials.md)
- [Scattering and tunnelling](../../packages/web/src/content/notebook/museum/scattering.md)
- [Qubits and Bloch vectors](../../packages/web/src/content/notebook/museum/qubits.md)
- [Approximate mean-field interactions](../../packages/web/src/content/notebook/museum/mean-field.md)
- [Entangled mood states](../../packages/web/src/content/notebook/museum/entanglement.md)
- [Finite-resolution measurement](../../packages/web/src/content/notebook/museum/measurement.md)
- [No-signalling and conditional states](../../packages/web/src/content/notebook/museum/no-signalling.md)

Each follows **Observe → Understand → Explore the mathematics**, distinguishing
simulation, approximation and specific formal mathematical evidence.

## Retained foundation entries

The Observer notebook remains available in the separate legacy 1D experiment.
The CN entry below is documentation-only.

- [The Observer — Why does the wavefunction collapse?](../../packages/web/src/content/notebook/observer.md)
  — Born probabilities, boundary-normalized Gaussian detector response,
  conditional update, subsequent evolution and the distinction from exact
  coordinate projection. Open **Why did it jump?** beside the observation controls
  in the app. Start with the intuitive section, then expand the mathematics and
  evidence. The Markdown source is bundled directly, avoiding a duplicate UI copy.

- [Why the wave packet keeps its probability](crank-nicolson.md) — discrete
  Hamiltonian, Crank–Nicolson, unique solvability, exact unitarity, and what the
  numerical tests actually measure. Start with the short explanation; continue
  into the derivation and proof map when curious.

## Three kinds of evidence

1. **Formal mathematics:** Lean checks exact finite-dimensional statements under
   explicit hypotheses in the [companion proof repository](https://github.com/MaryShooshtari/psi-zoo-proofs).
2. **Numerical validation:** TypeScript tests compare floating-point computations
   with invariants and independent analytic predictions, within stated tolerances.
3. **Not verified:** correspondence of the TypeScript implementation to the Lean
   definitions, rounding-error bounds, continuum convergence proofs, and UI correctness.

A passing test is not a formal proof; a formal matrix theorem does not certify
an implementation. Entries should always say which kind of evidence supports a claim.

[Run the simulation](../../README.md#run-it-locally) ·
[Gaussian evolution validation](../FREE_GAUSSIAN_VALIDATION.md) ·
[Roadmap](../ROADMAP.md)
