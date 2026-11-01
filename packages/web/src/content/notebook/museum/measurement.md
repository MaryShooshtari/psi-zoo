---
id: "measurement"
title: "Projective measurement and finite resolution"
contexts: "measurement,observation"
---
## Observe

Open Menu → Measure position. Choose a native creature target and detector width σ, then Apply, or explicitly Arm on canvas and click one unambiguous visible cloud. In 2D the detector reports x/y; in the 1D marginal it reports x only. A click identifies the creature, not the returned coordinate: the detector samples across its state. Target selection alone does not execute. Width defaults to 0.4, with controls from 0.2 to 2; these are not continuum-accuracy limits.

For moods, use Entangle moods, explicitly choose first and second independent targets and Apply ordered Bell preparation. Then use Measure mood or the coordinated pair controls in Creatures → Advanced simulation settings. Preparation itself samples no outcome. The stable result line records the latest successful action and its physical time, not a current particle location. Advanced retains exact outcome mass, norms, seed and draw counts. Inspect clicks and reading diagnostics never measure. The retained standalone 1D Observer is a separate experiment.

## Understand

A measurement has possible outcomes, their probabilities and a state update conditional on the reported outcome. Projective measurement uses orthogonal projectors: operators that select mutually exclusive subspaces and leave the selected subspace unchanged when reapplied. Qubit Z outcomes here are 0/1; X outcomes are +/−. Seeded randomness makes a repeated experiment reproducible; it does not make an outcome a decorative choice.

The main-world and retained standalone position detectors have finite resolution. It favors amplitudes near a sampled location with a smooth Gaussian mask, rather than retaining exactly one coordinate. This is a generalized measurement, not an exact orthogonal projection. Painting potential, switching view and Inspect selection are neither kind of measurement. An x-only detector applies its x mask across every y of the full complex 2D state. It reports no y; conditioning can still change the y marginal of an x–y correlated state. The main detector consumes exactly one draw for x-only success or two for x/y success, without committing an intermediate x-only state.

A rejected draft consumes no draw. A numerical failure leaves committed amplitudes and the previous successful result unchanged, but any draws already requested remain consumed. In particular, an unrepresentable selected joint outcome mass is a failed attempt, not a zero-probability success. No floor, hidden retry or RNG rewind is used. A retry is a new explicit action. A display failure after a committed update is different: Redraw refreshes the result without executing or sampling again. Playback is not automatically paused for these action refusals or failures.

## Explore the mathematics

For a normalized state and outcome projector Pk, Born probability and the positive-probability conditional update are:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="p k equals squared norm P k psi; psi conditional k equals P k psi over square root p k"><mrow><msub><mi>p</mi><mi>k</mi></msub><mo>=</mo><msup><mrow><mo>‖</mo><msub><mi>P</mi><mi>k</mi></msub><mi>ψ</mi><mo>‖</mo></mrow><mn>2</mn></msup><mo>,</mo><mspace width="1em"/><msub><mi>ψ</mi><mi>k</mi></msub><mo>=</mo><mfrac><mrow><msub><mi>P</mi><mi>k</mi></msub><mi>ψ</mi></mrow><msqrt><msub><mi>p</mi><mi>k</mi></msub></msqrt></mfrac></mrow></math>

For a joint mood, a local A projector is Pk⊗I. The implementation samples its Born probability and normalizes the genuine joint state, preserving pair ownership. The recorded probability refers to the pre-measurement state, not a later face expression. Selective measurement is not a unitary time step and need not preserve energy.

For the retained one-dimensional finite-position detector, K(j|i)=G(j,i)/Σk G(k,i), G(j,i)=exp(−(xj−xi)²/(2σ²)), normalized over outcomes for every input site. With N=Δx Σi |ψi|², P(j)=Δx Σi K(j|i)|ψi|²/N and ψ′i=√K(j|i) ψi/√(N P(j)). The diagonal operators Mj=diag(√K(j|i)) satisfy Σj Mj†Mj=I but generally Mj²≠Mj. Boundary normalization matters; σ is detector resolution, not necessarily posterior width. The legacy Observer notebook contains the full derivation and live recorded example.

For the main 2D state, use area element ΔxΔy. The x-only positive diagonal operator is Mₐ(i,j)=√Kx(a|i). The joint operator is Mₐᵦ(i,j)=√Kx(a|i) √Ky(b|j). Outcome mass is the area-weighted squared norm of Mψ divided by the input norm squared; the full conditional state is normalized once. The implementation samples x then conditional y for the joint law, normalizing the conditional input-y distribution before convolution to avoid avoidable underflow. This finite-grid validity does not establish continuum accuracy at sharp σ or energy conservation across measurement.

[CoordinateProjection.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/CoordinateProjection.lean) proves sharp projection properties and normalization after positive retained mass. [FiniteMeasurement.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/FiniteMeasurement.lean) and [GaussianMeasurement.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/GaussianMeasurement.lean) prove exact finite-response completeness/probability/conditional-normalization results, including the normalized Gaussian instance, under their hypotheses. These do not verify TypeScript sampling, floating-point arithmetic or the game. No joint-mood measurement proof is claimed. See [no-signalling](#no-signalling).
