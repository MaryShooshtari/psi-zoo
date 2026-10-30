---
id: "mean-field"
title: "Mean-field interactions"
contexts: "interaction,multiple"
---
## Observe

Try the attraction and repulsion world presets under Experiments, or enable Mood drives and Social interactions under Moods & friendships. Compare with both controls off using the same initial spatial packets. Inspect the selected force and social potential. Pair preparation suspends mood-dependent spatial feedback for both registered members, even after a measurement makes the joint mood a product state.

## Understand

Mean field replaces a complicated joint influence with a simpler effective field built from summary statistics. An expectation is an average predicted from a quantum state, not a sampled outcome. Here each creature evolves in its own potential built from its mood's Z expectation and other creatures' mean positions. A centroid is that mean position, not a measured point or a little object carrying the wave.

This is a deterministic approximate game model, not exact many-body Schrödinger evolution. Independent clouds have no joint spatial wavefunction or coherent cross-creature interference. Classical feedback between separate states does not create entanglement. Registered joint moods must not use conditional local expectations as spatial signals; their feedback is therefore disabled.

## Explore the mathematics

Let zi be creature i's Z expectation, di its fixed direction, Fi its drive strength, g the social strength and ℓ the interaction range. The 2D effective potential has these terms, with no self-interaction:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="V i effective equals V terrain minus F i z i d i dot r minus r center minus g z i sum over j not i of z j exp minus absolute r minus mean r j squared over two ell squared"><mrow><msub><mi>V</mi><mi>i</mi></msub><mo>=</mo><msub><mi>V</mi><mtext>terrain</mtext></msub><mo>−</mo><msub><mi>F</mi><mi>i</mi></msub><msub><mi>z</mi><mi>i</mi></msub><msub><mi>d</mi><mi>i</mi></msub><mo>·</mo><mo>(</mo><mi>r</mi><mo>−</mo><msub><mi>r</mi><mi>c</mi></msub><mo>)</mo><mo>−</mo><mi>g</mi><msub><mi>z</mi><mi>i</mi></msub><munder><mo>∑</mo><mrow><mi>j</mi><mo>≠</mo><mi>i</mi></mrow></munder><msub><mi>z</mi><mi>j</mi></msub><mi>exp</mi><mo>(</mo><mo>−</mo><mfrac><msup><mrow><mo>|</mo><mi>r</mi><mo>−</mo><msub><mover><mi>r</mi><mo>¯</mo></mover><mi>j</mi></msub><mo>|</mo></mrow><mn>2</mn></msup><mrow><mn>2</mn><msup><mi>ℓ</mi><mn>2</mn></msup></mrow></mfrac><mo>)</mo></mrow></math>

rc is the domain center. Switches can disable each feedback term. Sources are frozen from the same whole-step endpoint, processed in stable ID order, and all spatial candidates commit together. Moods advance by their existing midpoint/endpoint schedule. The frozen real-potential spatial solves preserve norm to floating-point error, but updating the feedback from old summaries makes the combined scheme generally first-order in time. No exactly conserved total mean-field energy is claimed. The legacy 1D world instead uses its documented density-contact interaction, not this centroid Gaussian formula.

[CreatureCoupling.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/CreatureCoupling.lean) proves selected exact real-potential, symmetry and frozen-CN norm properties for its stated mood/contact model. It does not verify this 2D centroid algorithm, establish exact combined-energy conservation, or certify a many-body simulation. Continue with [no-signalling safeguards](#no-signalling).
