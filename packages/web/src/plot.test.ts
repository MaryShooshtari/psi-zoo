import { expect, it, vi } from 'vitest';
import { createPsiGrid, measurePosition } from '@psi-zoo/sim-core';
import { SimulationPlayback } from './simulation';
import { drawSimulation, plotBounds, densityScaleMaximum, densityPlotFraction } from './plot';

it('draws two independent densities, including imaginary amplitudes, on the same physical coordinate scale', () => {
  const a = createPsiGrid(5, 0.5, -1), b = createPsiGrid(5, 0.5, -1);
  a.values[2] = 1; b.values[3] = -1; // Same density despite different complex phases.
  b.values[6] = 0.5;
  const beforeA = a.values.slice(), beforeB = b.values.slice();
  const paths: { colour: string; dash: number[]; points: number[][] }[] = [];
  let points: number[][] = [], dash: number[] = [];
  const { context } = mockContext();
  context.beginPath = () => { points = []; };
  context.moveTo = context.lineTo = (x, y) => { points.push([x, y]); };
  context.setLineDash = values => { dash = [...values]; };
  context.stroke = () => { paths.push({ colour: String(context.strokeStyle), dash, points: [...points] }); };
  drawSimulation(context, a, new Float64Array(5), 800, 340, null, b);
  const pathA = paths.find(p => p.colour === '#a8f9fc' && p.points.length === 5)!;
  const pathB = paths.find(p => p.colour === '#f49bdf' && p.points.length === 5)!;
  const { left, right, bottom, top } = plotBounds(800, 340);
  expect(pathA.points[1]).toEqual([left + (right - left) / 4, bottom - densityPlotFraction(1, 0.5) * (bottom - top)]);
  expect(pathB.points[1]).toEqual(pathA.points[1]); // Not summed/cancelled amplitudes.
  expect(pathB.points[3]![1]).toBe(bottom - densityPlotFraction(0.25, 0.5) * (bottom - top));
  expect(pathA.dash).toEqual([]); expect(pathB.dash).toEqual([3, 3]);
  expect(a.values).toEqual(beforeA); expect(b.values).toEqual(beforeB);
});

function mockContext() {
  const methods = new Map<string, ReturnType<typeof vi.fn>>();
  const context = new Proxy({} as CanvasRenderingContext2D, {
    get(target, key: string) {
      if (key in target) return Reflect.get(target, key);
      if (!methods.has(key)) methods.set(key, vi.fn());
      return methods.get(key);
    },
  });
  return { context, methods };
}

it('renders the last sampled position with a magenta line and diamond, and omits it after clearing', () => {
  const { context, methods } = mockContext();
  const psi = createPsiGrid(401, 0.1, -20);
  const terrain = new Float64Array(psi.count);
  const { top, left, right, bottom } = plotBounds(800, 340);
  const x = left + (5 - psi.x0) / ((psi.count - 1) * psi.dx) * (right - left);
  drawSimulation(context, psi, terrain, 800, 340, 5);
  expect(context.strokeStyle).toBe('#f49bdf');
  expect(context.moveTo).toHaveBeenCalledWith(x, top);
  expect(context.lineTo).toHaveBeenCalledWith(x, bottom);
  expect(context.moveTo).toHaveBeenCalledWith(x, top + 2);
  methods.forEach(method => method.mockClear());
  drawSimulation(context, psi, terrain, 800, 340, null);
  expect(context.moveTo).not.toHaveBeenCalledWith(x, top + 2);
  expect(context.strokeStyle).toBe('#8394ae');
});

it('uses fixed, explicitly labeled nonlinear density ticks with no state-dependent autoscaling', () => {
  const { context } = mockContext();
  const psi = createPsiGrid(401, 0.1, -20);
  drawSimulation(context, psi, new Float64Array(401), 800, 340);
  expect(densityScaleMaximum(0.1)).toBe(10.5);
  expect(context.fillText).toHaveBeenCalledWith('Density |ψ|² · sqrt-spaced axis · 0–10.5', 58, 22);
  const { left, top, bottom } = plotBounds(800, 340);
  for (let i = 0; i <= 5; i++) {
    const density = 10.5 * (i / 5) ** 2;
    expect(context.fillText).toHaveBeenCalledWith(density.toFixed(2), left - 8, bottom - i / 5 * (bottom - top) + 4);
    expect(densityPlotFraction(density, 0.1)).toBeCloseTo(i / 5, 15);
  }
  expect(densityPlotFraction(0.4, 0.1)).toBeGreaterThan(0.19); // broad packet remains legible
});

it('keeps a sharp measured peak above 0.5 and even a single-site normalized state below the plot ceiling', () => {
  const c = new SimulationPlayback({ request: () => 1, cancel: () => {} }, () => {});
  const measured = measurePosition(c.psi, 0.2, () => 0.5).state;
  const singleSite = createPsiGrid(401, 0.1, -20);
  singleSite.values[400] = Math.sqrt(1 / singleSite.dx);
  for (const psi of [measured, singleSite]) {
    const { context } = mockContext();
    let peak = 0;
    const { left, right, top, bottom } = plotBounds(800, 340);
    drawSimulation(context, psi, new Float64Array(psi.count), 800, 340, -5);
    for (let i = 1; i < psi.count - 1; i++) {
      const density = psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2;
      peak = Math.max(peak, density);
      const y = bottom - densityPlotFraction(density, psi.dx) * (bottom - top);
      expect(y).toBeGreaterThan(top); expect(y).toBeLessThanOrEqual(bottom);
      expect(context.lineTo).toHaveBeenCalledWith(left + i / (psi.count - 1) * (right - left), y);
    }
    expect(peak).toBeGreaterThan(0.5);
    expect(context.strokeStyle).toBe('#f49bdf'); // marker still drawn on top
    expect(context.fillText).toHaveBeenCalledWith('V(x)', 0, 0);
  }
});
