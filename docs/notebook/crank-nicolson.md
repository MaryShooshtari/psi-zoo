---
topic: "Crank–Nicolson probability conservation"
equation: "Uᴴ U = U Uᴴ = I; P(Uψ) = P(ψ)"
mechanic: "Free Gaussian evolution and probability diagnostic (Slice 1)"
status: "Exact matrix theorems checked in Lean; TypeScript numerically validated"
---

# Why the wave packet keeps its probability

[Notebook index](README.md) · [Run the simulation](../../README.md#local-development) ·
[Detailed numerical results](../FREE_GAUSSIAN_VALIDATION.md)

## The short explanation

The glowing curve in Psi Zoo is a probability **density**, not a solid object.
The packet can spread, so its peak can shrink while the total area underneath
stays the same. On our grid that area is a weighted sum, called the squared norm:

$$P(\psi)=\Delta x\sum_j |\psi_j|^2.$$

If it starts at one, the total probability should remain one. Crank–Nicolson
(CN) is a way of advancing time that preserves this sum **exactly in exact
arithmetic** for the model below. The application normalizes once at startup,
not after every step: conservation is not manufactured by rescaling the cloud.

The companion Lean repository now checks the mathematics: a step exists, is
unique, and is given by a unitary matrix. The TypeScript solver is tested, but
**the TypeScript code itself is not formally verified**. Small floating-point
drift is expected. Conservation also does not mean the packet has exactly the
right continuum shape or speed: spatial and time discretization still matter.

## 1. The finite model: points, walls, and energy

Use units $\hbar=m=1$. In the continuum the Hamiltonian (energy operator) is
$H=-\tfrac12\partial_x^2+V(x)$. Replace the second derivative by a three-point
difference. There are $n$ **interior** coordinates, with zero wavefunction at
the two omitted endpoints (homogeneous Dirichlet walls). For $j=0,\ldots,n-1$:

$$
(H\psi)_j=(\Delta x^{-2}+V_j)\psi_j
 -\frac{\psi_{j-1}+\psi_{j+1}}{2\Delta x^2},
$$

where missing endpoint neighbors mean zero. Equivalently,

$$
H_{jk}=\begin{cases}
\Delta x^{-2}+V_j & j=k,\\
-1/(2\Delta x^2) & |j-k|=1,\\
0 & \text{otherwise}.
\end{cases}
$$

Assumptions throughout: $\Delta x>0$, $\Delta t\in\mathbb R$, and a fixed
real potential $V:\mathrm{Fin}\ n\to\mathbb R$. Negative and zero time steps
are included. The formal results allow every natural $n$, including zero and
one; the application requires at least three full-grid points, hence at least
one interior coordinate.

The physics inner product conjugates its **first** argument:

$$\langle\phi,\psi\rangle_{\Delta x}
 =\Delta x\sum_j\overline{\phi_j}\psi_j,\qquad
\langle\psi,\psi\rangle_{\Delta x}=P(\psi).$$

**Hermitian** means $H^{\mathrm H}=H$, where $\mathrm H$ denotes conjugate
transpose. Here the coefficients are real and symmetric, so this holds. It
implies $\langle\phi,H\psi\rangle_{\Delta x}
=\langle H\phi,\psi\rangle_{\Delta x}$ and
$\operatorname{Im}\langle\psi,H\psi\rangle_{\Delta x}=0$: the energy form is real.

Definitions and proofs: [GridHamiltonian.lean][hamiltonian],
[GridInnerProduct.lean][inner], and [GridNormalization.lean][norm].
The weighted sum is the existing `weightedSquaredNorm`, not Lean's default norm
on a function type.

## 2. A time step that balances old and new states

The Schrödinger equation is $i\partial_t\psi=H\psi$. CN evaluates the right
side at the average of the old and new states:

$$
\frac{\psi_+-\psi_-}{\Delta t}
 =-iH\frac{\psi_++\psi_-}{2}.
$$

This quotient is explanatory notation for nonzero $\Delta t$. The formal
relation uses **no division by time** and also makes sense at zero:

$$
A=I+i(\Delta t/2)H,\qquad B=I-i(\Delta t/2)H,\qquad
A\psi_+=B\psi_-.
$$

The exact equivalent rearrangement is

$$\psi_+-\psi_-=-i(\Delta t/2)H(\psi_++\psi_-).$$

These are `crankNicolsonLeftMatrix`, `crankNicolsonRightMatrix`,
`CrankNicolsonStep`, and `crankNicolsonStep_iff` in
[CrankNicolsonConservation.lean][conservation].
The [TypeScript stepper](../../packages/sim-core/src/crankNicolson.ts) uses the
same signs and solves only for interiors with a tridiagonal Thomas algorithm.
The Lean-to-TypeScript correspondence is editorial, not mechanically proved.

## 3. Why probability is conserved

Set $s=\psi_++\psi_-$ and $d=\psi_+-\psi_-$. Polarization gives

$$P(\psi_+)-P(\psi_-)=\operatorname{Re}\langle s,d\rangle_{\Delta x}.$$

The mixed terms cancel in the real part by conjugate symmetry. Substitute the
step equation and use linearity in the second argument:

$$
\operatorname{Re}\langle s,d\rangle_{\Delta x}
=\operatorname{Re}\left[-i(\Delta t/2)\langle s,Hs\rangle_{\Delta x}\right]=0.
$$

The last equality holds because the energy form is real, so multiplication by
$-i$ makes it purely imaginary. Thus every pair satisfying the implicit step
has $P(\psi_+)=P(\psi_-)$. This proof does not assume invertibility or unitarity.
It is `weightedSquaredNorm_sub_eq_re_gridInnerProduct` followed by
`crankNicolsonStep_weightedSquaredNorm` in [the conservation module][conservation].

## 4. Does the implicit equation actually have a solution?

Yes, uniquely. Suppose $A\psi=0$. Because $B0=0$, this is a step from zero to
$\psi$. Conservation forces $P(\psi)=P(0)=0$. Positive spacing makes the sum
positive definite, so every coordinate of $\psi$ vanishes. Thus $A$ has trivial
kernel and is injective. Finite square matrix algebra over $\mathbb C$ then
makes $A$ invertible. Every right-hand side $B\psi_-$ has exactly one preimage.

This is proved in [CrankNicolsonInvertibility.lean][invertibility], not assumed.

## 5. The Cayley-transform evolution operator

The unique next state can therefore be written explicitly:

$$U=A^{-1}B,\qquad AU=B,\qquad \psi_+=U\psi_-.$$

This rational expression is the CN Cayley-transform evolution. This is the
**actual factor order in the Lean definition**. The numerical application
solves the tridiagonal equation instead of forming a dense inverse.
[CrankNicolsonEvolution.lean][evolution] proves that this state satisfies the
step, that any other solution equals it, and that $P(U\psi)=P(\psi)$.
At $\Delta t=0$, $U=I$.

## 6. The flagship identity: unitarity

A unitary matrix has conjugate transpose as inverse:

$$U^{\mathrm H}U=I,\qquad UU^{\mathrm H}=I,\qquad U^{-1}=U^{\mathrm H}.$$

Here is the algebra checked in [CrankNicolsonUnitarity.lean][unitarity]:

1. Hermiticity gives $A^{\mathrm H}=B$, $B^{\mathrm H}=A$, and $A+B=2I$.
2. Take the adjoint of $AU=B$: $U^{\mathrm H}B=A$.
3. Hence $U^{\mathrm H}AU=A$ and $U^{\mathrm H}BU=B$.
4. Add: $U^{\mathrm H}(A+B)U=A+B$. Substitute $2I$ and cancel the nonzero
   scalar $2$, obtaining $U^{\mathrm H}U=I$.
5. For finite square matrices a left inverse is also a right inverse, giving
   $UU^{\mathrm H}=I$ and membership in Mathlib's complex unitary group.

For intuition, unitarity preserves lengths and inner products rather than
stretching or shrinking states. Since the grid inner product is the ordinary
coordinate inner product times the positive constant $\Delta x$, this also
preserves $P$. The Lean norm theorem was already proved independently by the
conditional-conservation route above; the argument is not circular.

## 7. Exact statement-to-source map

All Lean names below are in namespace `PsiZoo`. In this table, $P$ is exactly
`weightedSquaredNorm dx`, $H$ is `gridHamiltonianMatrix dx V`, and $A,B,U$ are
the definitions above. Common hypotheses are $n\in\mathbb N$,
$dx>0$, $dt\in\mathbb R$, $V:\mathrm{Fin}\ n\to\mathbb R$, and complex interior
states. Some algebraic identities have weaker hypotheses in their source.

| Exact mathematical statement | Lean declaration and source |
| --- | --- |
| $H^{\mathrm H}=H$ | `gridHamiltonianMatrix_isHermitian` — [Hamiltonian][hamiltonian] |
| $\operatorname{Im}\langle\psi,H\psi\rangle_{dx}=0$ | `gridHamiltonian_energy_im_eq_zero` — [Hamiltonian][hamiltonian] |
| $A\psi_+=B\psi_-\iff\psi_+-\psi_-=-i(dt/2)H(\psi_++\psi_-)$ | `crankNicolsonStep_iff` — [Conservation][conservation] |
| $P(\psi_+)-P(\psi_-)=\operatorname{Re}\langle\psi_++\psi_-,\psi_+-\psi_-\rangle_{dx}$ | `weightedSquaredNorm_sub_eq_re_gridInnerProduct` — [Conservation][conservation] |
| $A\psi_+=B\psi_-\Rightarrow P(\psi_+)=P(\psi_-)$ | `crankNicolsonStep_weightedSquaredNorm` — [Conservation][conservation] |
| $A\psi=0\Rightarrow\psi=0$ | `crankNicolsonLeftMatrix_mulVec_eq_zero` — [Invertibility][invertibility] |
| $\operatorname{IsUnit}(A)$ (matrix invertibility) | `crankNicolsonLeftMatrix_isUnit` — [Invertibility][invertibility] |
| $\forall\psi_-,\ \exists!\psi_+,\ A\psi_+=B\psi_-$ | `crankNicolsonStep_existsUnique` — [Invertibility][invertibility] |
| $AU=B$ | `crankNicolsonLeftMatrix_mul_evolution` — [Evolution][evolution] |
| $A(U\psi)=B\psi$ | `crankNicolsonEvolution_step` — [Evolution][evolution] |
| $A\psi_+=B\psi_-\Rightarrow\psi_+=U\psi_-$ | `crankNicolsonStep_eq_evolution` — [Evolution][evolution] |
| $P(U\psi)=P(\psi)$ | `crankNicolsonEvolution_weightedSquaredNorm` — [Evolution][evolution] |
| $P(\psi)=1\Rightarrow P(U\psi)=1$ | `crankNicolsonEvolution_preserves_normalization` — [Evolution][evolution] |
| $U(dx,0,V)=I$ | `crankNicolsonEvolution_zero_dt` — [Evolution][evolution] |
| $A^{\mathrm H}=B$, $B^{\mathrm H}=A$ | `crankNicolsonLeftMatrix_conjTranspose`, `crankNicolsonRightMatrix_conjTranspose` — [Unitarity][unitarity] |
| $A+B=2I$ | `crankNicolsonLeftMatrix_add_rightMatrix` — [Unitarity][unitarity] |
| $U^{\mathrm H}B=A$ | `crankNicolsonEvolution_conjTranspose_mul_rightMatrix` — [Unitarity][unitarity] |
| $U^{\mathrm H}U=I$ | `crankNicolsonEvolution_conjTranspose_mul_self` — [Unitarity][unitarity] |
| $UU^{\mathrm H}=I$ | `crankNicolsonEvolution_mul_conjTranspose_self` — [Unitarity][unitarity] |
| $U\in\mathrm{Matrix.unitaryGroup}(\mathrm{Fin}\ n,\mathbb C)$ | `crankNicolsonEvolution_mem_unitaryGroup` — [Unitarity][unitarity] |
| $U^{-1}=U^{\mathrm H}$ | `crankNicolsonEvolution_inv_eq_conjTranspose` — [Unitarity][unitarity] |

The proof repo's [README][proofs] explains how to run `lake build`. Links point
to its current `master` branch; this is an editorial map, not an extraction of
Lean declarations or a proof that the TypeScript implements them.

## 8. What the numerical experiments say

The [Gaussian validation report](../FREE_GAUSSIAN_VALIDATION.md) records actual
measurements from [freeGaussianEvolution.test.ts](../../packages/sim-core/tests/freeGaussianEvolution.test.ts).
The interval is $[-20,20]$, $V=0$, initial center $-5$, and initial **density**
standard deviation $\sigma_0=1$. The unchirped amplitude envelope is
$\exp(-(x+5)^2/(4\sigma_0^2))$. The independently specified continuum reference is

$$\mu(t)=-5+k_0t,\qquad \sigma(t)=\sqrt{1+t^2/4}.$$

With $dx=0.1$, $dt=0.01$, at $t=2$:

| Initial momentum $k_0$ | Numerical mean / continuum mean | Numerical width / continuum width | Maximum probability drift over the run |
| --- | --- | --- | --- |
| 0 | -5.000000000000001 / -5 | 1.413326765175038 / 1.414213562373095 | 4.785061236134425e-14 |
| 0.75 | -3.503302641516763 / -3.5 | 1.411321382931102 / 1.414213562373095 | 4.7406523151494184e-14 |

These are the existing report's observed values, not new regression targets.
Across its runs, including a 1,600-step temporal reference, maximum norm drift
was **2.183808689437683e-13**, below the test budget of **5e-12**. Spatial errors
fall by approximately four under grid halving; temporal error ratios are
approximately **3.984** and **4.007**, consistent with second-order convergence.
Tests check tiny outer-strip mass and distance to walls at every step, not just
zero endpoints. These comparisons apply before significant boundary interaction,
not to arbitrary late times when the finite box reflects the packet.

The separate [CN conservation tests](../../packages/sim-core/tests/crankNicolson.test.ts)
exercise a nonuniform static real potential, exact zero endpoints, negative-time
reversal, zero-time behavior, small grids, analytic discrete-mode phase, and
invalid-input/overflow handling. The 1,000-step conservation scenario was also
measured for this documentation milestone using the unchanged public API
(Node 24.20.0, Windows; no per-step normalization):

- 65 full-grid points, $dx=0.2$, $x_0=-3$, $dt=0.01$.
- Initial interior components: $\operatorname{Re}\psi_i=\sin(0.31i)$,
  $\operatorname{Im}\psi_i=\cos(0.17i)$ for $i=1,\ldots,63$; zero endpoints,
  followed by one `normalize` call.
- Fixed $V_i=0.02i+\sin(0.2i)$; measure `normSquared` and the real part of
  `energyExpectation` after each step against their initial values.

| Quantity | Initial value | Maximum absolute drift | Existing test budget |
| --- | ---: | ---: | ---: |
| Probability norm | 1 | 1.4432899320127035e-14 | 2e-12 |
| Energy form | 1.6781737382615014 | 3.1530333899354446e-14 | 3.3563474765230028e-12 |

The energy budget is $2\cdot10^{-12}\max(1,|E_0|)$; the norm budget is
$2\cdot10^{-12}P_0$. Values are observations, not rigorous error bounds, and may
vary slightly by runtime. The setup and accumulation are those of the test
`preserves norm and static-H energy over 1000 steps without normalization`.
**Static-H energy conservation over time is numerically tested but is not a
formal theorem in the current Lean modules.** Reality of the energy form is proved.

## 9. Where verification stops

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| Lean + Mathlib | Exact finite matrix results under the stated hypotheses: Hermiticity, unique step, norm conservation, unitarity | Refinement of TypeScript to Lean, Thomas solver correctness, IEEE-754 error bounds, continuum convergence |
| TypeScript tests | Tested scenarios meet explicit invariant, accuracy, convergence, and input-validation tolerances | Universal correctness for all inputs, exact arithmetic, or arbitrary long-time accuracy |
| Browser integration | Canvas reads the evolved state and shows its diagnostics; controller tests exercise playback | Formally verified rendering, DOM behavior, pixel accuracy, or completed manual browser review |

Large time steps remain unitary in the exact model but can have large phase
error; extreme floating-point scales can make the checked numerical solve fail.
There is no formal continuum PDE or Gaussian-spreading theorem here. General
measurement, Gaussian localization, Bloch dynamics, and entanglement are not
certified by these results. A Gaussian measurement mask is not an exact
coordinate projection. No new game mechanics or notebook rendering are implied.

To reproduce the automated checks, run `npm run test`, `npm run typecheck`, and
`npm run build` in the app repository, and `lake build` in the proof repository.
Tests assert budgets rather than printing every measurement; the Gaussian report
retains the measured baseline and full convergence tables.

[proofs]: https://github.com/MaryShooshtari/psi-zoo-proofs
[hamiltonian]: https://github.com/MaryShooshtari/psi-zoo-proofs/blob/master/PsiZooProofs/GridHamiltonian.lean
[inner]: https://github.com/MaryShooshtari/psi-zoo-proofs/blob/master/PsiZooProofs/GridInnerProduct.lean
[norm]: https://github.com/MaryShooshtari/psi-zoo-proofs/blob/master/PsiZooProofs/GridNormalization.lean
[conservation]: https://github.com/MaryShooshtari/psi-zoo-proofs/blob/master/PsiZooProofs/CrankNicolsonConservation.lean
[invertibility]: https://github.com/MaryShooshtari/psi-zoo-proofs/blob/master/PsiZooProofs/CrankNicolsonInvertibility.lean
[evolution]: https://github.com/MaryShooshtari/psi-zoo-proofs/blob/master/PsiZooProofs/CrankNicolsonEvolution.lean
[unitarity]: https://github.com/MaryShooshtari/psi-zoo-proofs/blob/master/PsiZooProofs/CrankNicolsonUnitarity.lean
