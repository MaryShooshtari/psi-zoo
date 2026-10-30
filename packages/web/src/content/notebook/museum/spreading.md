---
id: "spreading"
title: "Free spreading"
contexts: "free-gaussian,guide-spread"
---
## Observe

Start the guide's single free creature, press Play, then Pause and inspect σx and σy in Advanced. These are widths: square roots of position variances. A variance is the mean squared distance from the mean position. The central peak can fall while the total norm stays near one. Compare early times, before the packet reaches the boundary. A painted well or reflected packet need not widen monotonically.

## Understand

A Gaussian is a smooth bell-shaped distribution. Even an initially stationary free Gaussian spreads: different momentum components, which describe different contributions to motion, accumulate different phases. Free means no potential or feedback force in this experiment; it does not mean the state is frozen.

The density is the body. Eye and mouth motion is decorative and cannot cause spreading. The guide waits for a real Play action and a change in the committed state's width, not a wall-clock animation timer. Its initial condition has zero mean momentum, not exactly zero momentum for every possible measurement.

## Explore the mathematics

Use units ℏ=m=1. On the infinite line let the initial density have standard deviation σ0 and amplitude proportional to exp(−(x−x0)²/(4σ0²)+ip0x). Its center moves as x0+p0t and its density width follows:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="sigma of t equals sigma zero times square root of one plus t squared divided by four sigma zero to the fourth"><mrow><mi>σ</mi><mo>(</mo><mi>t</mi><mo>)</mo><mo>=</mo><msub><mi>σ</mi><mn>0</mn></msub><msqrt><mrow><mn>1</mn><mo>+</mo><mfrac><msup><mi>t</mi><mn>2</mn></msup><mrow><mn>4</mn><msubsup><mi>σ</mi><mn>0</mn><mn>4</mn></msubsup></mrow></mfrac></mrow></msqrt></mrow></math>

For a separable free 2D Gaussian (one whose amplitude factors into an x part and a y part), this convention applies separately to x and y. It is an infinite-domain continuum reference, not an exact theorem about our finite lattice or arbitrary initial states. The fixed grid changes dispersion; Dirichlet walls reflect waves. Width tests therefore compare early evolution and grid/time refinement, not arbitrarily late motion.

The implementation uses finite differences and symmetric Cayley splitting. Its norm preservation in exact arithmetic does not guarantee an exact continuum width. Numerical tests separately check width, norm, eigenmode phase and refinement. See [potential energy and numerical evolution](#potentials) for the actual method. No formal Lean theorem for continuum Gaussian spreading is claimed here.
