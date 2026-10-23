import type { PsiGrid } from './grid';

/** Raw dx-weighted masses, NOT automatically reflection/transmission coefficients. */
export interface RegionProbabilities {
  readonly left: number;
  readonly interaction: number;
  readonly right: number;
  readonly total: number;
}

/**
 * Partition samples into x < leftEdge, leftEdge <= x <= rightEdge, x > rightEdge.
 * Every grid point (including endpoints) contributes exactly once, using the
 * same rectangle-sum convention as normSquared. No interpolation, normalization,
 * projection, or state mutation. Cuts may be off-grid or outside the domain.
 *
 * The incident packet contributes to left before collision! Only for a known
 * left-incident experiment AFTER outgoing separation and BEFORE wall returns may
 * left/initialNorm and right/initialNorm be interpreted as estimates of R and T.
 * Low interaction mass alone does not establish that scattering has occurred.
 */
export function probabilityRegions(psi: PsiGrid, leftEdge: number, rightEdge: number): RegionProbabilities {
  if (!Number.isFinite(leftEdge) || !Number.isFinite(rightEdge) || leftEdge > rightEdge) {
    throw new RangeError('Region cuts must be finite and ordered');
  }
  if (!Number.isSafeInteger(psi.count) || psi.count < 3 || psi.values.length !== 2 * psi.count
    || !Number.isFinite(psi.dx) || psi.dx <= 0 || !Number.isFinite(psi.x0)
    || !Number.isFinite((psi.count - 1) * psi.dx)
    || !Number.isFinite(psi.x0 + (psi.count - 1) * psi.dx)) {
    throw new RangeError('Invalid grid geometry or state length');
  }
  let left = 0, interaction = 0, right = 0;
  for (let i = 0; i < psi.count; i++) {
    const re = psi.values[2 * i]!, im = psi.values[2 * i + 1]!;
    if (!Number.isFinite(re) || !Number.isFinite(im)) throw new RangeError('State values must be finite');
    const density = re * re + im * im;
    const x = psi.x0 + i * psi.dx;
    if (x < leftEdge) left += density;
    else if (x > rightEdge) right += density;
    else interaction += density;
  }
  left *= psi.dx; interaction *= psi.dx; right *= psi.dx;
  const total = left + interaction + right;
  if (!Number.isFinite(total)) throw new RangeError('Probability mass overflow');
  return { left, interaction, right, total };
}
