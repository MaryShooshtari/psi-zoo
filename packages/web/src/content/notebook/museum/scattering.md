---
id: "scattering"
title: "Scattering and tunnelling"
contexts: "scattering"
---
## Observe

Experiments → Watch scattering explicitly opens the separate paused 2D Gaussian barrier preset; press Play. Compare outgoing regions after the packet reaches the full-height barrier. For qualified quantitative reflection/transmission choose Advanced → 1D simulations and its original scattering demonstration. Its R/T values appear only in the documented separated-packet window, and edits or measurements invalidate the calibrated interpretation.

## Understand

Scattering means a wave meets a potential and develops outgoing parts. Reflection returns toward its starting side; transmission travels beyond the obstacle. Tunnelling specifically refers to transmission through a classically forbidden region for a given energy, not every cloud seen beyond a positive patch.

A localized packet has a range of momenta and energies. Some transmitted probability can come from components above the barrier. In 2D it could also go around a finite painted obstacle. A still image or arbitrary drawn terrain is therefore not a reliable tunnelling test. The known 2D preset spans all y, but still has an above-barrier tail.

## Explore the mathematics

For an ideal infinite-line rectangular barrier of height V0 and width a, stationary energy 0<E<V0 has decay constant κ=√(2(V0−E)) in our units. A plane wave is an ideal state with a single momentum; sinh is the hyperbolic sine function. Its plane-wave transmission is:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="T of E equals one divided by one plus V zero squared sinh squared of kappa a divided by four E times V zero minus E"><mrow><mi>T</mi><mo>(</mo><mi>E</mi><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><mrow><mn>1</mn><mo>+</mo><mfrac><mrow><msubsup><mi>V</mi><mn>0</mn><mn>2</mn></msubsup><msup><mi>sinh</mi><mn>2</mn></msup><mo>(</mo><mi>κ</mi><mi>a</mi><mo>)</mo></mrow><mrow><mn>4</mn><mi>E</mi><mo>(</mo><msub><mi>V</mi><mn>0</mn></msub><mo>−</mo><mi>E</mi><mo>)</mo></mrow></mfrac></mrow></mfrac></mrow></math>

This formula is not directly the result for the app's smoothed barrier, finite Dirichlet box or a broad-energy packet. A packet comparison needs energy weighting and a separated observation window before boundary returns. Regional masses left + interaction + right account for the total mass, but are R/T coefficients only when the experiment justifies that identification.

[RegionProbability.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/RegionProbability.lean) proves nonnegative bounded regional masses and partition accounting for the exact finite model; it does not certify an arbitrary scene as tunnelling. Continue with [potential dynamics](#potentials).
