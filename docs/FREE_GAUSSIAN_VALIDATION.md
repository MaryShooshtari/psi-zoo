# Free Gaussian evolution validation

Validated by `packages/sim-core/tests/freeGaussianEvolution.test.ts`.
No solver changes or per-step normalization are used.

## Conventions and setup

- hbar = m = 1; V = 0; x_i = -20 + i*dx on [-20,20], including both endpoints.
- Initial envelope: exp(-(x+5)^2/(4*sigma0^2)), with sigma0=1 the
  standard deviation of the **density**, not the amplitude envelope.
- Initial phase: exp(i*k0*x), no quadratic phase/chirp.
- Call initializeGaussian with normalization disabled, zero both complex endpoints,
  then normalize once. Endpoints remain exactly zero throughout evolution.
- Independently accumulate P=dx*sum|psi|^2 and mean, then the centered second moment
  in a second pass; sigma is its square root. Cross-check against normSquared,
  positionExpectation and positionVariance (the latter returns variance).
- Independently specified continuum reference:
  mean=-5+k0*t, sigma=sqrt(1+t^2/4). It does not depend on the analytic helper.

## Measured baseline results

With dx=0.1 and dt=0.01:

| k0 | t | Numerical mean | Analytic mean | Numerical sigma | Analytic sigma |
|---:|---:|---:|---:|---:|---:|
| 0 | 0 | -5.000000000000002 | -5 | 1.000000000000000 | 1 |
| 0 | 0.5 | -5.000000000000001 | -5 | 1.030700385210227 | 1.030776406404415 |
| 0 | 1 | -4.999999999999999 | -5 | 1.117753611620215 | 1.118033988749895 |
| 0 | 2 | -5.000000000000001 | -5 | 1.413326765175038 | 1.414213562373095 |
| 0.75 | 0 | -5.000000000000001 | -5 | 1.000000000000000 | 1 |
| 0.75 | 0.5 | -4.625825660379195 | -4.625 | 1.030528627874990 | 1.030776406404415 |
| 0.75 | 1 | -4.251651320758382 | -4.25 | 1.117119962886547 | 1.118033988749895 |
| 0.75 | 2 | -3.503302641516763 | -3.5 | 1.411321382931102 | 1.414213562373095 |

Largest baseline mean error: 0.0033026415167634.
Largest baseline sigma error: 0.0028921794419936.
Moving mean velocity: approximately 0.74834867924 versus 0.75.

Maximum absolute probability-norm drift from the initially normalized state:

- Baseline k0=0: 4.785061236134425e-14.
- Baseline k0=0.75: 4.7406523151494184e-14.
- Across all new runs, including the 1600-step temporal reference: 2.183808689437683e-13.

These are observed values, not hard-coded regression targets.

## Spatial convergence

Same domain and initial conditions (k0=0.75), final time t=2, dt=0.0025.
The small fixed dt keeps temporal error below the finest spatial error.

| dx | Absolute mean error | Absolute sigma error |
|---:|---:|---:|
| 0.2 | 0.013073436947113937 | 0.011337204160750902 |
| 0.1 | 0.003279471679724644 | 0.002864723008315417 |
| 0.05 | 0.000821659891215631 | 0.000719400150585026 |

Both errors fall by approximately four when dx is halved, consistent with
second-order central differences. The coarsest grid does NOT satisfy the 0.01
baseline accuracy target; it is included to test convergence, not as a passing
accuracy configuration.

## Temporal convergence

Fixed dx=0.1, k0=0.75, t=2; compare complete complex states in the dx-weighted
L2 norm against dt_ref=0.00125. No phase alignment is applied. Keeping dx fixed
isolates temporal convergence from continuum spatial error.

| dt | L2 error against fine-time reference |
|---:|---:|
| 0.08 | 0.001601792258796992 |
| 0.04 | 0.000402048506283427 |
| 0.02 | 0.000100336094897496 |

Error ratios are approximately 3.984 and 4.007 (second order).
The distance between reference runs at dt=0.0025 and 0.00125 is
1.1808836720003353e-6, about 1.18% of the smallest measured error.
Under second-order scaling, the finer reference's remaining temporal error is
approximately one third of that difference, well below the measured errors.

## Tolerance rationale and boundary checks

- Continuum mean/sigma error: <0.01 absolute for both baseline runs.
- Initial mean/sigma and moment-utility cross-checks: <1e-12 absolute;
  initial probability error <2e-15; independent norm cross-check <1e-14.
- Stationary packet mean: <1e-12 from its initial center.
- Moving packet average velocity: <0.005 absolute error.
- Probability-norm drift: <5e-12, a roundoff budget for up to 1600 steps,
  distinct from discretization accuracy.
- Spatial and temporal halving error ratios must lie between 3.6 and 4.4.
  This brackets the expected factor four while allowing higher-order terms
  and finite reference error. Temporal errors must also exceed 1e-9, and
  reference refinement distance must be <2% of the smallest measured error.
- Every step checks exact zero endpoints, >9 measured standard deviations
  from the mean to the nearest wall, and <1e-14 probability in the outer
  two spatial units at each end. This checks actual near-boundary density,
  rather than relying on the trivially zero endpoint values.
- Baseline stationary packet: minimum separation 10.613 sigma, maximum outer-strip
  mass 2.618e-20. Moving packet: 11.689 sigma, outer-strip mass 1.102e-24.

## Limitations

This validates free spreading and mean motion through t=2 before significant
boundary interaction; it is not a claim of infinite-domain accuracy at arbitrary
times. The discrete dispersion relation differs from E=k^2/2, causing the moving
packet's mean and width to lag the continuum predictions at finite dx. CN also
introduces a second-order temporal phase error. Conservation alone does not
remove either error. Longer runs need renewed domain-size and convergence checks.
The existing Gaussian initializer's implementation uses the correct /4 density-
width convention, although some of its pre-existing prose still describes /2;
this validation follows the implementation and explicitly tests the initial width.
