---
title: "The Observer — Why does the wavefunction collapse?"
topic: "Born rule and finite-resolution position measurement"
mechanic: "Observe particle (Slice 3)"
status: "Gaussian POVM numerically tested; exact projection is a separate Lean theorem"
---

## Start with what you saw

The cyan curve is a probability density, not a classical particle trajectory. The wavefunction carries complex amplitudes and phases; it does not draw a hidden little ball's path through the plot. The Born rule connects those amplitudes to position probabilities.

Clicking Observe triggers a measurement; your click does not choose where the result lands. The simulation samples an outcome from the state and the detector response. The update favors amplitudes near that result and suppresses distant ones. This conditional localization is what we call collapse here. It is an idealized measurement rule, not a detailed simulation of a physical apparatus or an explanation of all interpretations of quantum mechanics.

The magenta line and diamond record the last observed position at its measurement time. They are a past result, not a moving particle. The wavefunction can evolve away from that marker.

Try free exploration: Observe while paused, then Play. A localized free packet usually re-spreads. In arbitrary painted potentials the width need not increase monotonically: confinement, focusing, and reflections can change it. Observing during playback uses exactly the same measurement rule without resetting physical time or editing the terrain.

The plot uses a fixed square-root-spaced density axis to show both broad and tall peaks. Its tick labels are density values, but geometric area under this nonlinear display is not probability. The norm diagnostic uses the actual dx-weighted sum, not screen area.

## The mathematics of this detector

We use dimensionless units ℏ = m = 1, positions xᵢ = x₀ + i Δx, positive spacing Δx, and exactly zero Dirichlet endpoints. With n full-grid points, both input and reported positions range over the interior set I = {1,…,n−2}. The probability density is ρ(x) = |ψ(x)|². For a nonzero grid state, define its actual squared norm N and normalized input masses wᵢ:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="N equals delta x times sum over interior i of absolute psi i squared; w i equals delta x absolute psi i squared divided by N"><mrow><mi>N</mi><mo>=</mo><mi>Δx</mi><munder><mo>∑</mo><mrow><mi>i</mi><mo>∈</mo><mi>I</mi></mrow></munder><msup><mrow><mo>|</mo><msub><mi>ψ</mi><mi>i</mi></msub><mo>|</mo></mrow><mn>2</mn></msup><mo>,</mo><mspace width="1em"/><msub><mi>w</mi><mi>i</mi></msub><mo>=</mo><mfrac><mrow><mi>Δx</mi><msup><mrow><mo>|</mo><msub><mi>ψ</mi><mi>i</mi></msub><mo>|</mo></mrow><mn>2</mn></msup></mrow><mi>N</mi></mfrac><mo>,</mo><mspace width="1em"/><munder><mo>∑</mo><mi>i</mi></munder><msub><mi>w</mi><mi>i</mi></msub><mo>=</mo><mn>1</mn></mrow></math>

The detector resolution σ > 0 is the width of an untruncated Gaussian response in spatial units. It is not necessarily the measured packet's width. At boundaries, or when the grid is coarse relative to σ, even the response's realized mean and variance differ from that untruncated Gaussian.

For each input site i separately, normalize the response over all allowed outcomes j. This boundary correction is essential: merely moving a normalized infinite-line Gaussian onto a finite grid would lose probability near the walls.

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="g j i equals exp of minus x j minus x i squared over two sigma squared; Z i equals sum over k in I of g k i"><mrow><msub><mi>g</mi><mrow><mi>j</mi><mi>i</mi></mrow></msub><mo>=</mo><mi>exp</mi><mo>(</mo><mo>−</mo><mfrac><msup><mrow><mo>(</mo><msub><mi>x</mi><mi>j</mi></msub><mo>−</mo><msub><mi>x</mi><mi>i</mi></msub><mo>)</mo></mrow><mn>2</mn></msup><mrow><mn>2</mn><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac><mo>)</mo><mo>,</mo><mspace width="1em"/><msub><mi>Z</mi><mi>i</mi></msub><mo>=</mo><munder><mo>∑</mo><mrow><mi>k</mi><mo>∈</mo><mi>I</mi></mrow></munder><msub><mi>g</mi><mrow><mi>k</mi><mi>i</mi></mrow></msub></mrow></math>

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="K of j given i equals g j i divided by Z i; sum over j in I of K of j given i equals one"><mrow><mi>K</mi><mo>(</mo><mi>j</mi><mo>|</mo><mi>i</mi><mo>)</mo><mo>=</mo><mfrac><msub><mi>g</mi><mrow><mi>j</mi><mi>i</mi></mrow></msub><msub><mi>Z</mi><mi>i</mi></msub></mfrac><mo>,</mo><mspace width="1em"/><munder><mo>∑</mo><mrow><mi>j</mi><mo>∈</mo><mi>I</mi></mrow></munder><mi>K</mi><mo>(</mo><mi>j</mi><mo>|</mo><mi>i</mi><mo>)</mo><mo>=</mo><mn>1</mn></mrow></math>

The probability of reporting outcome j is the Born-weighted detector response. P(j) is a discrete outcome probability, not a density. There is no extra Δx in the sum over outcomes: it is already in wᵢ.

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="P of j equals sum over i in I of w i K of j given i; sum over j in I of P of j equals one"><mrow><mi>P</mi><mo>(</mo><mi>j</mi><mo>)</mo><mo>=</mo><munder><mo>∑</mo><mrow><mi>i</mi><mo>∈</mo><mi>I</mi></mrow></munder><msub><mi>w</mi><mi>i</mi></msub><mi>K</mi><mo>(</mo><mi>j</mi><mo>|</mo><mi>i</mi><mo>)</mo><mo>,</mo><mspace width="1em"/><munder><mo>∑</mo><mrow><mi>j</mi><mo>∈</mo><mi>I</mi></mrow></munder><mi>P</mi><mo>(</mo><mi>j</mi><mo>)</mo><mo>=</mo><mn>1</mn></mrow></math>

One seeded random draw samples j from P. For a sampled outcome with positive probability, the positive real amplitude mask preserves phase wherever it is nonzero. The actual input norm N is handled explicitly:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="psi prime i equals square root of K of j given i times psi i divided by square root of N P of j"><mrow><msubsup><mi>ψ</mi><mi>i</mi><mo>′</mo></msubsup><mo>=</mo><mfrac><mrow><msqrt><mrow><mi>K</mi><mo>(</mo><mi>j</mi><mo>|</mo><mi>i</mi><mo>)</mo></mrow></msqrt><msub><mi>ψ</mi><mi>i</mi></msub></mrow><msqrt><mrow><mi>N</mi><mi>P</mi><mo>(</mo><mi>j</mi><mo>)</mo></mrow></msqrt></mfrac></mrow></math>

To check normalization, substitute this expression into Δx ∑ᵢ |ψ′ᵢ|². The numerator becomes Δx ∑ᵢ K(j|i)|ψᵢ|² = N P(j), cancelling the denominator. Thus the new norm is one. The implementation removes summation roundoff with a final normalization and retains exactly zero endpoints. Zero or nonrepresentable input norms are rejected; very small tails can underflow to zero.

These diagonal operators Mⱼ = diag(√K(j|i)) form a finite-resolution Gaussian POVM instrument: ∑ⱼ Mⱼ†Mⱼ = identity on interior states. They are generally not idempotent projectors. Exact coordinate projection would retain only coordinate j, discard every other coordinate, and then normalize if that coordinate has nonzero mass. Our finite-width update usually retains several coordinates. For arbitrary input states the posterior need not be Gaussian, even though the detector response is Gaussian.

## Why it evolves again — and why energy can jump

Between observations, the state follows the same time-dependent Schrödinger equation with a time-independent Hamiltonian whenever the terrain is held fixed. “Time-independent” describes H, not a frozen wavefunction. On the grid, the app approximates this equation using the existing finite-difference Hamiltonian and Crank–Nicolson steps:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="i partial t psi equals H psi; H equals minus one half partial x squared plus V of x"><mrow><mi>i</mi><msub><mi>∂</mi><mi>t</mi></msub><mi>ψ</mi><mo>=</mo><mi>H</mi><mi>ψ</mi><mo>,</mo><mspace width="1em"/><mi>H</mi><mo>=</mo><mo>−</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><msubsup><mi>∂</mi><mi>x</mi><mn>2</mn></msubsup><mo>+</mo><mi>V</mi><mo>(</mo><mi>x</mi><mo>)</mo></mrow></math>

The measurement update is not a unitary time step. Multiplication by a spatially varying mask generally changes kinetic gradients and does not commute with H. The energy expectation can therefore change even though the potential and physical time do not. Localization often increases kinetic energy in the free example, but there is no claim that every selective outcome raises energy for every input state and potential.

The UI re-establishes its energy-drift reference after measurement and terrain changes. During subsequent fixed-H evolution, norm and expected energy are conserved up to floating-point error. No per-step renormalization hides evolution drift. Small grid spacing and time steps still matter for accuracy; conservation alone does not prove continuum accuracy. Narrow packets approaching the grid scale deserve particular caution.

## What Lean proves — and what it does not

The companion repository's [CoordinateProjection.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/94a75c8f71448482434f9d76a667c53cf4d8853e/PsiZooProofs/CoordinateProjection.lean) proves idempotence, self-adjointness, retained regional mass, and normalization after a positive-mass exact sharp projection. In particular, coordinateProjection_idempotent, coordinateProjection_mass, and normalize_coordinateProjection concern that sharp operator, not the Gaussian mask above. The file neither chooses a random outcome nor proves the Born sampling algorithm.

The separate [CrankNicolsonUnitarity.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/94a75c8f71448482434f9d76a667c53cf4d8853e/PsiZooProofs/CrankNicolsonUnitarity.lean) proves exact finite-matrix CN unitarity under its hypotheses. These two source files were checked locally with Lean at the linked commit for this release review. Neither theorem formally verifies the TypeScript implementation, IEEE-754 arithmetic, the Gaussian POVM, or its sampling. The finite-resolution measurement is supported here by numerical tests, not a completed companion proof of that model.
