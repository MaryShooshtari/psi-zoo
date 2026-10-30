import { expect, it } from 'vitest';
import { createPsiGrid2D } from '@psi-zoo/sim-core';
import { createProjectionRenderer, marginalDensityScale, projectedX, projectionViewport } from './projection1d';

it('maps exact physical interior x samples, including a single column, independently of ny', () => {
  const g = createPsiGrid2D({ nx: 3, ny: 7, xmin: -3, xmax: 5 }), width = 800;
  const v = projectionViewport(width, 400);
  for (let i = 0; i < 3; i++) expect(projectedX(g, i, width)).toBe(v.left + (i + 1) / 4 * (v.right - v.left));
  const h = createPsiGrid2D({ nx: 1, ny: 5 }); expect(projectedX(h, 0, width)).toBe((v.left + v.right) / 2);
});
it('uses one finite linear density range for all creatures, including unusually high peaks', () => {
  const layers = [ { id: 'a', density: new Float64Array([0, .2, 0]) }, { id: 'b', density: new Float64Array([0, 2, 0]) } ];
  expect(marginalDensityScale(layers)).toBe(2 * 1.15);
  expect(marginalDensityScale([{ id: 'a', density: new Float64Array(3) }])).toBe(.5);
  expect(marginalDensityScale([{ id: 'a', density: new Float64Array([Number.MAX_VALUE]) }])).toBe(Number.MAX_VALUE);
  for (const rho of [-1, NaN, Infinity]) expect(() => marginalDensityScale([{ id: 'a', density: new Float64Array([rho]) }])).toThrow();
});
it('draws linear nonnegative curves at shared heights, selected outline last, and caches only terrain by revision', () => {
  const g = createPsiGrid2D({ nx: 3, ny: 2 });
  const outputs = new Map<string, Float64Array>(), paths: { points: number[][]; style: string; width: number }[] = [];
  let points: number[][] = [], copies = 0, revision = 0;
  const source = { ids: ['a', 'b'], copyProjectedDensityX(id: string, out: Float64Array) {
    if (outputs.has(id)) expect(outputs.get(id)).toBe(out); outputs.set(id, out);
    out.set(id === 'a' ? [0, .2, 0] : [0, .8, 0]);
  } };
  const terrain = { get terrainRevision() { return revision; }, copyPotential(out: Float64Array) { copies++; out.set([2, -2, 0, 4, -4, 0]); } };
  const renderer = createProjectionRenderer(g, source, terrain);
  const context = {
    strokeStyle: '', lineWidth: 1, fillStyle: '', globalAlpha: 1,
    clearRect() {}, fillRect() {}, fillText() {}, setLineDash() {},
    beginPath() { points = []; }, moveTo(x: number, y: number) { points.push([x, y]); }, lineTo(x: number, y: number) { points.push([x, y]); },
    closePath() {}, fill() {}, stroke(this: CanvasRenderingContext2D) { paths.push({ points: points.slice(), style: String(this.strokeStyle), width: this.lineWidth }); },
  } as unknown as CanvasRenderingContext2D;
  renderer(context, 800, 400, 'a', false, true, .6);
  const curves = paths.filter(p => p.points.length === g.nx + 2), viewport = projectionViewport(800, 400), baseline = viewport.baseline;
  expect(curves).toHaveLength(2); expect(curves[1]!.width).toBe(3);
  expect((baseline - curves[1]!.points[2]![1]!) / (baseline - curves[0]!.points[2]![1]!)).toBeCloseTo(.25, 14);
  // Include the actual unstored zero Dirichlet endpoints. The area of the
  // piecewise-linear curve then agrees with dx*sum(rho), not peak normalization.
  for (const [curve, expected] of [[curves[0]!, 4], [curves[1]!, 1]] as const) {
    let area = 0;
    for (let i = 1; i < curve.points.length; i++) {
      const a = curve.points[i - 1]!, b = curve.points[i]!;
      area += .5 * (2 * baseline - a[1]! - b[1]!) * (b[0]! - a[0]!);
    }
    area *= (g.xmax - g.xmin) / (viewport.right - viewport.left) * (.8 * 1.15) / (baseline - viewport.top);
    expect(area).toBeCloseTo(expected, 13);
  }
  for (const p of curves) for (const [x, y] of p.points) { expect(x).toBeGreaterThan(0); expect(y).toBeLessThanOrEqual(baseline); }
  const signed = paths.filter(p => p.style === '#9d3c23' || p.style === '#3c4b9a');
  expect(signed.some(p => p.style === '#9d3c23')).toBe(true);
  expect(signed.some(p => p.style === '#3c4b9a')).toBe(true);
  for (const path of signed) for (const [, y] of path.points) {
    if (path.style === '#9d3c23') expect(y).toBeLessThanOrEqual(viewport.terrainZero);
    else expect(y).toBeGreaterThanOrEqual(viewport.terrainZero);
  }
  renderer(context, 800, 400, 'b', true, true, .6); expect(copies).toBe(1);
  revision++; renderer(context, 800, 400, 'b', false, true, .6); expect(copies).toBe(2);
  revision++; renderer(context, 800, 400, 'b', false, false, .6); expect(copies).toBe(2);
  expect(context.globalAlpha).toBe(1);
});
