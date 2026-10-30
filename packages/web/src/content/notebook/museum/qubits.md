---
id: "qubits"
title: "Qubits and Bloch vectors"
contexts: "mood"
---
## Observe

Select a creature and open Advanced. Watch its Bloch components as you Play. These are expectation values, not repeatedly sampled mood choices. The small face reflects published values but never rolls a random mood. Compare an independent mood with a Bell-pair member's local purity.

## Understand

A qubit is a quantum system with two basis states, here called 0 and 1. A pure state is described by two complex amplitudes up to an irrelevant common phase. A mixed state describes local statistics that cannot be represented by one pure-state vector, for example when a qubit is part of an entangled pair.

The Bloch vector contains expectations for three measurement directions called X, Y and Z. For a pure normalized qubit its length is one. A mixed qubit can lie inside the sphere; the maximally mixed state is at its center. A zero local vector is not a zero-norm state or missing qubit. Purity measures how far a density matrix is from being mixed; density matrix here means the matrix that encodes all measurement probabilities of that subsystem.

## Explore the mathematics

The Pauli matrices σX, σY and σZ encode the three directions. With r the Bloch vector, identity I, and trace Tr the diagonal sum:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="rho equals one half of identity plus r dot sigma; purity equals trace rho squared equals one plus r squared over two"><mrow><mi>ρ</mi><mo>=</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><mo>(</mo><mi>I</mi><mo>+</mo><mi>r</mi><mo>·</mo><mi>σ</mi><mo>)</mo><mo>,</mo><mspace width="1em"/><mi>Tr</mi><mo>(</mo><msup><mi>ρ</mi><mn>2</mn></msup><mo>)</mo><mo>=</mo><mfrac><mrow><mn>1</mn><mo>+</mo><msup><mrow><mo>|</mo><mi>r</mi><mo>|</mo></mrow><mn>2</mn></msup></mrow><mn>2</mn></mfrac></mrow></math>

For a normalized qubit, purity lies in [1/2,1]. The independent mood uses Hm=(ω/2)σX, so its Bloch vector rotates about X at angular frequency ω. The general exact formula for H=a·σ is U(t)=cos(|a|t)I−i sin(|a|t)(a·σ)/|a|, with the identity limit at a=0. The implementation uses the closed-form exponential without Euler drift.

[Qubit.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/Qubit.lean) covers normalized Bloch identities and the trigonometric propagator's norm/rotation properties. [QubitExponential.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/QubitExponential.lean) covers the genuine matrix exponential's unitarity. The equality of these two formal propagator constructions is not formalized in that release; neither proves the TypeScript or pair-measurement implementation. See [entangled states](#entanglement).
