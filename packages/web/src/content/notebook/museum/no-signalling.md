---
id: "no-signalling"
title: "No-signalling and conditional states"
contexts: "release,conditional,no-signalling"
---
## Observe

Reset a Bell example while paused and compare Z or X measurement records. Correlations become visible only when you compare outcomes from repeated preparations. Inspect a selected conditional partner state after a known result. Then use Measure & Release to restore independent ownership; this is a coordinated global operation, not a local communication button.

## Understand

Conditional means that a particular outcome is known and selected. Unconditional means all possible outcomes are combined with their probabilities, as when a distant observer has not received the record. These are different descriptions. A partner's conditional state can change without creating a locally detectable signal in its unconditional statistics.

A correlation is a relationship between results. Communication requires controlling and conveying information; a random local result cannot itself choose a message for the other observer. Comparing outcome records requires an ordinary classical channel. The app's line is deliberately static so it does not suggest something being transmitted.

## Explore the mathematics

For a joint density matrix ρAB and a complete set of local projectors Pk on A, the unconditioned operation sums all branches. The partial trace over A gives exactly the same B reduced state:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="rho B prime equals trace A of sum k P k tensor I rho A B P k tensor I equals rho B"><mrow><msubsup><mi>ρ</mi><mi>B</mi><mo>′</mo></msubsup><mo>=</mo><msub><mi>Tr</mi><mi>A</mi></msub><mo>[</mo><munder><mo>∑</mo><mi>k</mi></munder><mo>(</mo><msub><mi>P</mi><mi>k</mi></msub><mo>⊗</mo><mi>I</mi><mo>)</mo><msub><mi>ρ</mi><mrow><mi>A</mi><mi>B</mi></mrow></msub><mo>(</mo><msub><mi>P</mi><mi>k</mi></msub><mo>⊗</mo><mi>I</mi><mo>)</mo><mo>]</mo><mo>=</mo><msub><mi>ρ</mi><mi>B</mi></msub></mrow></math>

By contrast, a conditional branch divides by pk and can have a different B state. Weighting those conditional matrices by pk recovers the unconditional matrix. The app's single trajectory records one branch, not an ensemble average, so one displayed conditional Bloch vector is not evidence that a remote signal was sent.

The approximate spatial interface must not turn those conditional expectations into forces. All registered pair members therefore have mood-dependent drive/social terms suspended, including product pairs after measurement. Measure & Release first factors an already-product joint state, or explicitly measures first when necessary; it then restores independent qubits. This globally coordinated game operation is not a proof of locality of arbitrary expectation-feedback theories.

Existing numerical/algebraic tests verify the implemented measurement probabilities, reduced-state averaging and suspension guards for their cases. No completed Lean no-signalling or whole-game theorem is claimed here. The companion proves selected exact finite-matrix, qubit and measurement statements, not the browser, the entire numerical implementation, continuum physics or error bounds. See [entangled states](#entanglement) and [mean-field limitations](#mean-field).
