---
id: "potentials"
title: "Potential energy and Schrödinger dynamics"
contexts: "barrier,well,terrain,guide-landscape"
---
## Observe

In 2D open Menu → Terrain. Choose Barrier (+) or Well (−) and paint, then Play. Clear terrain removes the landscape without resetting the wavefunction. Reset evolution restores initial states but normally retains terrain; loading an experiment is a separate operation. The guide's explicitly labeled finish/skip cleanup is intentionally stronger.

## Understand

Potential energy assigns an energy value to each position. Warm areas are positive, blue areas negative. A Hamiltonian is the mathematical rule for total energy and time evolution: kinetic energy describes spatial variation, while potential energy describes the landscape. Editing it changes the next evolution rule, not the present amplitudes, probabilities or physical time.

Drawing is not measurement. It neither samples an outcome nor localizes the state. A well can focus or confine density without preparing a specific bound state, a state confined by the potential. An energy eigenstate has a definite energy rather than a spread of energy outcomes. A positive patch does not by itself demonstrate tunnelling; the packet's energy distribution and the geometry must also be known.

## Explore the mathematics

In ℏ=m=1 units (Planck's reduced constant and mass set to one), i is the imaginary unit with i²=−1, t is time and ψ is the wavefunction. The linear single-particle equation is:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="i partial t psi equals H psi; H equals minus one half Laplacian plus V"><mrow><mi>i</mi><msub><mi>∂</mi><mi>t</mi></msub><mi>ψ</mi><mo>=</mo><mi>H</mi><mi>ψ</mi><mo>,</mo><mspace width="1em"/><mi>H</mi><mo>=</mo><mo>−</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><msup><mi>∇</mi><mn>2</mn></msup><mo>+</mo><mi>V</mi></mrow></math>

The Laplacian is the sum of second spatial derivatives; the app approximates each by centered differences. Taking a conjugate transpose swaps matrix rows/columns and conjugates its complex entries. With Hermitian (conjugate-transpose symmetric) H, 1D Crank–Nicolson solves (I+iΔtH/2)ψnext=(I−iΔtH/2)ψold. Here I is identity. It is unitary in exact arithmetic: it preserves the norm, not necessarily continuum accuracy for large steps.

The 2D method is symmetric splitting, NOT unsplit 2D CN: PV(Δt/2) Cx(Δt/2) Cy(Δt) Cx(Δt/2) PV(Δt/2). PV multiplies by exp(−iVτ); each C is a directional Cayley solve. V is frozen over a whole committed step. For static real terrain this has second-order time accuracy; split energy has discretization error and is not exactly the full-H conserved energy. Fixed dt=1/120 and 128×128 interior points remain unchanged. The mean-field feedback scheme has a separate, generally first-order limitation.

A sudden terrain edit changes energy by the current density-weighted ΔV without changing the state. Subsequent time-dependent-H evolution need not conserve energy. Gaussian brush stamps have finite support and bounded signed height; they are additive in 2D, with the existing cap. The legacy 1D maximum-stamping rule is different.

[CrankNicolsonUnitarity.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/CrankNicolsonUnitarity.lean) proves the exact finite-matrix CN unitarity identities under its hypotheses. [HermitianCayley.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/HermitianCayley.lean) includes exact static-H energy conservation for the Cayley model. Neither verifies this TypeScript implementation, its split full-H energy, floating-point error, or the whole game. Continue with [mean-field interactions](#mean-field).
