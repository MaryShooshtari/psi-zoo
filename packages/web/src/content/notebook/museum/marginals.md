---
id: "marginals"
title: "Marginal distributions — a quantum shadow"
contexts: "projection,guide-shadow"
---
## Observe

While paused or playing, use the always-visible 1D view button. The mirror transformation changes presentation; it neither pauses nor physically flattens the creature. Return to 2D and compare its state, time and terrain. Reduced motion switches views immediately without changing the calculation.

## Understand

A marginal probability distribution answers a question while ignoring another coordinate. Here the hill answers where along x the creature could be found, regardless of y. Sum the 2D density along each vertical column to obtain it. The missing y detail and complex phase cannot be recovered from this hill.

This is not a standalone 1D wavefunction, an independent 1D Schrödinger solver or a measurement. A mixed x reduced state and even a pure separable one can have the same marginal; the diagonal density does not specify the full reduced density operator.

## Explore the mathematics

The continuous marginal integrates over y. Grid cells need their y spacing; the second sum then reproduces the complete spatial norm.

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="rho x at i equals delta y sum over j absolute psi i j squared; delta x sum over i rho x at i equals N"><mrow><msub><mi>ρ</mi><mi>x</mi></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>=</mo><mi>Δy</mi><munder><mo>∑</mo><mi>j</mi></munder><msup><mrow><mo>|</mo><msub><mi>ψ</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>|</mo></mrow><mn>2</mn></msup><mo>,</mo><mspace width="1em"/><mi>Δx</mi><munder><mo>∑</mo><mi>i</mi></munder><msub><mi>ρ</mi><mi>x</mi></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>=</mo><mi>N</mi></mrow></math>

The common adaptive linear scale uses every roster member, including hidden ones, not a separate peak normalization per creature. Zero boundary endpoints and straight segments preserve the discrete curve-area identity. Density has inverse-length units here, versus inverse-area units in the heatmap. Projection buffers are reused; no evolving state is replaced.

Average terrain along y is Vbar(i)=(1/ny) Σj V(i,j), an unweighted sample average of editable terrain only. It excludes social and mood-drive terms. It is not an exact effective 1D Hamiltonian: y structure and x–y correlations matter, and an effective reduction would require assumptions on the transverse state and may introduce extra terms. Painting requires the 2D view because this marginal supplies no y location.

For an actual separate 1D wavefunction choose Advanced / Legacy demonstrations. Entering that experiment starts a fresh controller, unlike view switching. Continue with [potential energy](#potentials).
