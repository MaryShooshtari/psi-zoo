# Psi Zoo lab notebook

A place to move from **watching** a wave packet, to **understanding** its equations,
to **checking** the evidence. This follows the [original notebook vision](../PROJECT_SPEC.md):
plain Markdown entries with frontmatter and editorial links to the corresponding
Lean statements. The browser does not yet render these entries; no notebook UI,
Markdown renderer, or KaTeX dependency is introduced here.

## Entries

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

[Run the simulation](../../README.md#local-development) ·
[Gaussian measurements](../FREE_GAUSSIAN_VALIDATION.md) ·
[Roadmap](../ROADMAP.md)
