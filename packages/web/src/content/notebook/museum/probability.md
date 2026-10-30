---
id: "probability"
title: "Wavefunctions and probability"
contexts: "density,independent,faces"
---
## Observe

Select Mochi with the list or click a cloud. Press Play and compare its width and brightness; use Advanced to inspect its norm. Switch creature decorations off in Display to see the underlying density. Faces, names, blinks, halos and dotted friendship lines are annotations, not particles or additional forces.

## Understand

A probability is a number between zero and one describing how often an outcome occurs over repeated preparations. A probability density gives probability per unit area: add it over a region to obtain that region's probability. A single point has no finite probability in a continuous model. Grid cells instead have finite probability masses.

A normalized state has total probability one. The UI's squared norm (often shortened to norm) is that total, computed with the grid spacing, not the height of a peak. A complex number has real and imaginary components; together they allow a size and a phase.

A wavefunction is a complex-valued amplitude: it has a size and a phase, an angle needed to predict how parts of the same coherent state combine. The Born rule says density is the squared amplitude magnitude. Density alone cannot reconstruct phase. The cloud is not a hidden little ball's trajectory, and selecting it is not a measurement.

Each creature has its own normalized spatial state. Two independent creatures' densities do not acquire interference merely by overlapping. Coherent interference requires amplitudes in the same quantum state to combine before their magnitude is squared. Mood entanglement uses a separate joint two-qubit state, not a joint spatial wavefunction.

## Explore the mathematics

For a normalized 2D wavefunction, probability in a region is the integral of its density there. On this app's interior grid, the area-weighted sum replaces that integral.

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="rho equals absolute psi squared; total probability equals delta x delta y sum over i j absolute psi i j squared equals one"><mrow><mi>ρ</mi><mo>=</mo><msup><mrow><mo>|</mo><mi>ψ</mi><mo>|</mo></mrow><mn>2</mn></msup><mo>,</mo><mspace width="1em"/><mi>N</mi><mo>=</mo><mi>Δx</mi><mi>Δy</mi><munder><mo>∑</mo><mrow><mi>i</mi><mo>,</mo><mi>j</mi></mrow></munder><msup><mrow><mo>|</mo><msub><mi>ψ</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>|</mo></mrow><mn>2</mn></msup><mo>=</mo><mn>1</mn></mrow></math>

Conjugation reverses a complex number's imaginary component; Re takes its real component. A coherent sum has the cross term 2 Re(conjugate(ψ1) ψ2); a display sum of independent densities has no such term. The latter is not the density of a normalized coherent superposition without further assumptions and normalization.

The main world uses 128×128 interior samples on x,y ∈ [−10,10], spacing Δx=Δy=20/129 and zero Dirichlet boundaries (the wavefunction vanishes at the omitted edges). Complex values are interleaved Float64 numbers (64-bit floating-point real and imaginary components). Initialization normalizes once; evolution does not repeatedly rescale states to hide numerical drift. The norm diagnostic is a numerical sum, not a count of bright pixels. Heatmap brightness is a monotone display mapping, not a linear area plot; the marginal plot has a common linear density scale.

[Exact grid norm definitions in GridNormalization.lean](https://github.com/MaryShooshtari/psi-zoo-proofs/blob/ac2ff0ffb4f05f2758b85909885b4ef337287eb4/PsiZooProofs/GridNormalization.lean) concern finite complex sums and normalization, not browser pixels or IEEE-754 error. Continue with [free spreading](#spreading) or [marginal distributions](#marginals).
