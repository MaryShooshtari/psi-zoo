---
id: "entanglement"
title: "Entangled two-qubit states"
contexts: "pair"
---
## Observe

Use Moods & friendships → Entangle moods on two independent creatures, or load World: entangled friendship. This is an explicit global preparation, replacing both previous moods with a Bell state; it leaves their spatial amplitudes alone. Inspect local purity 1/2 and entropy 1 bit initially. Local rotations change measurement statistics in some bases, so pause/reset for the initial reference.

## Understand

A joint state describes both qubits together. A product state can be written as one state for A times another for B; an entangled pure state cannot. The app stores four complex amplitudes for the joint mood, rather than faking a friendship by correlated independent random choices.

A reduced state predicts everything measurable on one member alone, ignoring its partner. Taking a partial trace is the mathematical operation that removes the other member from that description. Even when the joint state is pure, a reduced state can be mixed. The dotted line is a static registration indicator, not a travelling influence or force. A measured product pair stays registered until explicit release.

## Explore the mathematics

The initial Bell state and each reduced matrix are:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="Phi plus equals ket zero zero plus ket one one divided by square root two; rho A equals rho B equals I over two"><mrow><mo>|</mo><msup><mi>Φ</mi><mo>+</mo></msup><mo>⟩</mo><mo>=</mo><mfrac><mrow><mo>|</mo><mn>00</mn><mo>⟩</mo><mo>+</mo><mo>|</mo><mn>11</mn><mo>⟩</mo></mrow><msqrt><mn>2</mn></msqrt></mfrac><mo>,</mo><mspace width="1em"/><msub><mi>ρ</mi><mi>A</mi></msub><mo>=</mo><msub><mi>ρ</mi><mi>B</mi></msub><mo>=</mo><mfrac><mi>I</mi><mn>2</mn></mfrac></mrow></math>

The tensor product symbol ⊗ combines the A and B state spaces; labels ab specify one basis value for each. Conjugation reverses an imaginary component, and Tr adds a matrix's diagonal entries. For amplitudes c_ab, (ρA)_aa′=Σb c_ab conjugate(c_a′b). Purity Tr(ρA²)=1/2 initially. The entropy S(ρA)=−Σk λk log2 λk, using the eigenvalues λk (nonnegative spectral weights that sum to one) and 0 log 0=0, is one bit initially; for a pure joint two-qubit state it measures entanglement. Local unitaries UA⊗UB preserve this entropy, unlike selective measurement. The code evolves both local X rotations analytically and preserves the joint norm.

There is no joint tensor-product spatial solver and no spatial entanglement. All registered pair members are excluded from mood-dependent spatial drive/social feedback to prevent conditional expectations from becoming artificial signalling channels. Existing tests cover joint norm, reduced states, correlations, outcome probabilities and ownership, but this chapter claims no completed Lean proof of the joint-state implementation. See [projective measurement](#measurement) and [conditional versus unconditional states](#no-signalling).
