---
id: "measurement"
title: "Projective measurement and finite resolution"
contexts: "measurement,observation"
---
## Observe

Prepare a Bell pair while paused. In Moods & friendships choose Z or X, then explicitly Measure A or Measure B. Open Measurement outcomes & session events to inspect the sampled record. Selecting a cloud or reading a diagnostic never triggers these operations. For a different kind of measurement, use the original standalone 1D Observer and its Observe interaction.

## Understand

A measurement has possible outcomes, their probabilities and a state update conditional on the reported outcome. Projective measurement uses orthogonal projectors: operators that select mutually exclusive subspaces and leave the selected subspace unchanged when reapplied. Qubit Z outcomes here are 0/1; X outcomes are +/−. Seeded randomness makes a repeated experiment reproducible; it does not make an outcome a decorative choice.

The 1D position detector has finite resolution. It favors amplitudes near a sampled location with a smooth Gaussian mask, rather than retaining exactly one coordinate. This is a generalized measurement, not an exact orthogonal projection. Painting potential, switching view and selecting a creature are neither kind of measurement.

## Explore the mathematics

For a normalized state and outcome projector Pk, Born probability and the positive-probability conditional update are:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="p k equals squared norm P k psi; psi conditional k equals P k psi over square root p k"><mrow><msub><mi>p</mi><mi>k</mi></msub><mo>=</mo><msup><mrow><mo>‖</mo><msub><mi>P</mi><mi>k</mi></msub><mi>ψ</mi><mo>‖</mo></mrow><mn>2</mn></msup><mo>,</mo><mspace width="1em"/><msub><mi>ψ</mi><mi>k</mi></msub><mo>=</mo><mfrac><mrow><msub><mi>P</mi><mi>k</mi></msub><mi>ψ</mi></mrow><msqrt><msub><mi>p</mi><mi>k</mi></msub></msqrt></mfrac></mrow></math>

For a joint mood, a local A projector is Pk⊗I. The implementation samples its Born probability and normalizes the genuine joint state, preserving pair ownership. The recorded probability refers to the pre-measurement state, not a later face expression. Selective measurement is not a unitary time step and need not preserve energy.

For the finite-position detector, K(j|i)=G(j,i)/Σk G(k,i), G(j,i)=exp(−(xj−xi)²/(2σ²)), normalized over outcomes for every input site. With N=Δx Σi |ψi|², P(j)=Δx Σi K(j|i)|ψi|²/N and ψ′i=√K(j|i) ψi/√(N P(j)). The diagonal operators Mj=diag(√K(j|i)) satisfy Σj Mj†Mj=I but generally Mj²≠Mj. Boundary normalization matters; σ is detector resolution, not necessarily posterior width. The legacy Observer notebook contains the full derivation and live recorded example.

[CoordinateProjection.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/CoordinateProjection.lean) proves sharp projection properties and normalization after positive retained mass. [FiniteMeasurement.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/FiniteMeasurement.lean) and [GaussianMeasurement.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/GaussianMeasurement.lean) prove exact finite-response completeness/probability/conditional-normalization results, including the normalized Gaussian instance, under their hypotheses. These do not verify TypeScript sampling, floating-point arithmetic or the game. No joint-mood measurement proof is claimed. See [no-signalling](#no-signalling).
