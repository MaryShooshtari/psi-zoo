import type { PsiGrid2D } from '../../src/grid2d';

/** Tiny, well-scaled fixtures only. Deliberately materializes every response
 * column and the complete joint outcome table; no production detector imports.
 * Physical-coordinate differences, not the production offset-kernel shortcut.
 */
export function measurement2dReference(g: PsiGrid2D, sigma: number) {
  const xs = Array.from({ length: g.nx }, (_, i) => g.xmin + (i + 1) * g.dx);
  const ys = Array.from({ length: g.ny }, (_, j) => g.ymin + (j + 1) * g.dy);
  function columns(coordinates: number[]) {
    return coordinates.map(input => {
      const response = coordinates.map(outcome => Math.exp(-0.5 * ((outcome - input) / sigma) ** 2));
      const total = response.reduce((sum, value) => sum + value, 0);
      return response.map(value => value / total);
    });
  }
  const rx = columns(xs), ry = columns(ys), area = g.dx * g.dy;
  let norm = 0;
  for (const value of g.values) norm += value * value * area;
  const joint = new Float64Array(g.nx * g.ny);
  // Outcome-major exhaustive enumeration, independent of conditional sampling.
  for (let b = 0; b < g.ny; b++) for (let a = 0; a < g.nx; a++) {
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
      const k = 2 * (j * g.nx + i);
      const mass = area * (g.values[k]! ** 2 + g.values[k + 1]! ** 2) / norm;
      joint[b * g.nx + a]! += mass * rx[i]![a]! * ry[j]![b]!;
    }
  }
  const x = Float64Array.from({ length: g.nx }, (_, a) => {
    let sum = 0;
    for (let b = 0; b < g.ny; b++) sum += joint[b * g.nx + a]!;
    return sum;
  });
  function conditionalY(a: number) {
    return Float64Array.from({ length: g.ny }, (_, b) => joint[b * g.nx + a]! / x[a]!);
  }
  function posterior(a: number, b?: number) {
    const values = g.values.slice();
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
      const k = 2 * (j * g.nx + i);
      const mask = Math.sqrt(rx[i]![a]!) * (b === undefined ? 1 : Math.sqrt(ry[j]![b]!));
      values[k]! *= mask; values[k + 1]! *= mask;
    }
    let squaredNorm = 0;
    for (const value of values) squaredNorm += value * value * area;
    return Float64Array.from(values, value => value / Math.sqrt(squaredNorm));
  }
  return { x, joint, conditionalY, posterior, rx, ry, norm };
}

/** A draw strictly inside a known positive CDF bin. */
export function binDraw(probabilities: ArrayLike<number>, index: number): number {
  let before = 0, total = 0;
  for (let k = 0; k < probabilities.length; k++) {
    total += probabilities[k]!;
    if (k < index) before += probabilities[k]!;
  }
  return (before + probabilities[index]! / 2) / total;
}

export function stateDistance2D(g: PsiGrid2D, a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let k = 0; k < a.length; k++) sum += (a[k]! - b[k]!) ** 2;
  return Math.sqrt(sum * g.dx * g.dy);
}
