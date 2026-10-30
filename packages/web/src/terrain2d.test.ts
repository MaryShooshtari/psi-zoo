import { describe, expect, it } from 'vitest';
import { createPsiGrid2D, initializeGaussian2D, stampPotential2D, CayleyStepper2D, normSquared2D, energyExpectation2D, xCoordinate2D } from '@psi-zoo/sim-core';
import { SimulationPlayback2D } from './simulation2d';
import { DistanceStroke2D, bindTerrainPainting2D, type Point2D } from './terrainBrush';
import { createTerrainPreset2D, BARRIER_2D } from './terrainPresets';
import { canvasToPhysical2D, physicalToCanvas2D, interiorViewport2D } from './render/density2d';
import { createPotentialRenderer2D, fillPotentialPixels2D } from './render/potential2d';
const brush = { tool: 'barrier' as const, sigma: 0.7, amplitude: 2 };
function controller() {
  let callback: ((now: number) => void) | undefined;
  const s = new SimulationPlayback2D({ request: cb => { callback = cb; return 1; }, cancel: () => { callback = undefined; } }, () => {});
  return { s, tick: (t: number) => callback?.(t) };
}

describe('event-independent physical strokes', () => {
  it('sparse/dense straight path stamps and potentials match, with continuous coverage', () => {
    const run = (subdivisions: number) => {
      const g = createPsiGrid2D({ nx: 71, ny: 53 }), values = new Float64Array(g.nx * g.ny), points: Point2D[] = [];
      const stroke = new DistanceStroke2D({ x: -4, y: 0 }, Math.min(g.dx, g.dy, brush.sigma / 2), p => { points.push(p); stampPotential2D(g, values, p.x, p.y, brush); });
      for (let i = 1; i <= subdivisions; i++) stroke.move({ x: -4 + 8 * i / subdivisions, y: 0 }); stroke.finish();
      return { g, values, points };
    };
    const a = run(1), b = run(117); expect(a.points.length).toBe(b.points.length);
    let maxDifference = 0; for (let k = 0; k < a.values.length; k++) maxDifference = Math.max(maxDifference, Math.abs(a.values[k]! - b.values[k]!));
    console.log('5B sparse/dense stroke max potential difference', maxDifference); expect(maxDifference).toBeLessThan(1e-11);
    for (let k = 1; k < a.points.length; k++) expect(a.points[k]!.x - a.points[k - 1]!.x).toBeCloseTo(Math.min(a.g.dx, a.g.dy, 0.35), 12);
    for (let i = 0; i < a.g.nx; i++) if (Math.abs(xCoordinate2D(a.g, i)) < 4) expect(a.values[26 * a.g.nx + i]).toBeGreaterThan(2);
  });
  it('click is one stamp; residual crosses corners; cancel/finish prevent later stamping', () => {
    const points: Point2D[] = [], s = new DistanceStroke2D({ x: 0, y: 0 }, 1, p => points.push(p));
    s.finish({ x: 0, y: 0 }); s.move({ x: 2, y: 0 }); expect(points).toHaveLength(1);
    const next = new DistanceStroke2D({ x: 0, y: 0 }, 1, p => points.push(p));
    next.move({ x: 0.6, y: 0 }); next.move({ x: 0.6, y: 0.6 }); expect(points.at(-1)!.y).toBeCloseTo(0.4, 14);
    next.cancel(); next.move({ x: 0, y: 5 }); expect(points).toHaveLength(3);
    expect(() => new DistanceStroke2D({ x: 0, y: 0 }, 0, () => {})).toThrow();
  });
  it('mapping shares renderer transform, exact grid-cell centers, letterboxing and y inversion', () => {
    const g = createPsiGrid2D({ nx: 9, ny: 5, xmin: -4, xmax: 4, ymin: -2, ymax: 2 });
    expect(canvasToPhysical2D(g, 10, 10, 600, 600)).toBeNull();
    const p = physicalToCanvas2D(g, 2, 1, 600, 600); expect(p).toEqual({ x: 450, y: 225 }); expect(canvasToPhysical2D(g, p.x, p.y, 600, 600)).toEqual({ x: 2, y: 1 });
    const v = interiorViewport2D(g, 600, 600);
    const cell = physicalToCanvas2D(g, g.xmin + g.dx, g.ymin + g.dy, 600, 600);
    expect(cell.x).toBeCloseTo(v.x + v.width / (2 * g.nx), 13);
    expect(cell.y).toBeCloseTo(v.y + v.height - v.height / (2 * g.ny), 13);
  });
  it('pointer ownership, CSS scale, view mode, cancel, capture and disposal', () => {
    const listeners = new Map<string, (e: PointerEvent) => void>(); let captured: number | null = null, count = 0;
    const canvas = { clientWidth: 600, clientHeight: 600, getBoundingClientRect: () => ({ left: 20, top: 30, width: 300, height: 300 }),
      addEventListener: (n: string, cb: (e: PointerEvent) => void) => listeners.set(n, cb), removeEventListener: (n: string) => listeners.delete(n),
      setPointerCapture: (id: number) => { captured = id; }, hasPointerCapture: (id: number) => id === captured, releasePointerCapture: () => { captured = null; } } as unknown as HTMLCanvasElement;
    const g = createPsiGrid2D(); let tool: 'view' | 'barrier' = 'view'; const points: Point2D[] = [];
    const binding = bindTerrainPainting2D(canvas, { grid: g, settings: () => ({ ...brush, tool }), stamp: p => { count++; points.push(p); }, changed: () => {}, preview: () => {}, onError: e => { throw e; } });
    const event = (type: string, extra = {}) => listeners.get(type)?.({ clientX: 170, clientY: 180, pointerId: 1, button: 0, isPrimary: true, preventDefault() {}, ...extra } as PointerEvent);
    event('pointerdown'); expect(count).toBe(0); tool = 'barrier'; event('pointerdown', { button: 2 }); expect(count).toBe(0);
    event('pointerdown'); expect(count).toBe(1); expect(points[0]).toEqual({ x: 0, y: 0 }); expect(captured).toBe(1);
    event('pointermove', { pointerId: 2, clientX: 180 }); expect(count).toBe(1);
    event('pointercancel'); expect(captured).toBeNull(); event('pointerdown'); expect(count).toBe(2);
    binding.dispose(); expect(captured).toBeNull(); expect(listeners.size).toBe(0);
  });
});

describe('owned revisioned terrain and experiment actions', () => {
  it('copies input/inspection, tracks actual changes, no-op clear and retains grid/state during edits', () => {
    const input = new Float64Array(12), c = new SimulationPlayback2D({ request: () => 0, cancel: () => {} }, () => {}, { grid: { nx: 4, ny: 3 }, potential: input });
    input.fill(9); const inspection = c.potential; inspection.fill(8); expect(c.potential.every(v => v === 0)).toBe(true);
    c.clearTerrain(); expect(c.terrainRevision).toBe(0); const initial = c.psi.values.slice(), grid = c.psi;
    c.stamp(-2, 0, { ...brush, sigma: 3 }); expect(c.terrainRevision).toBe(1); expect(c.psi).toBe(grid); expect(c.psi.values).toEqual(initial);
    c.clearTerrain(); expect(c.terrainRevision).toBe(2); expect(c.psi.values).toEqual(initial); c.clearTerrain(); expect(c.terrainRevision).toBe(2);
    expect(() => new SimulationPlayback2D({ request: () => 0, cancel: () => {} }, () => {}, { potential: new Float64Array(3) })).toThrow();
  });
  it('edit and clear preserve time/psi/playback, reset retains terrain, load replaces reproducibly', () => {
    const { s, tick } = controller(); s.play(); tick(0); tick(50); const time = s.snapshot().time, psi = s.psi.values.slice();
    s.stamp(0, 0, brush); const terrain = s.potential; expect(s.snapshot().time).toBe(time); expect(s.psi.values).toEqual(psi); expect(s.snapshot().playing).toBe(true);
    tick(100); expect(s.snapshot().time).toBeGreaterThan(time); const after = s.psi.values.slice(), later = s.snapshot().time;
    s.clearTerrain(); expect(s.psi.values).toEqual(after); expect(s.snapshot().time).toBe(later);
    s.stamp(0, 0, brush); s.reset(); expect(s.potential).toEqual(terrain); expect(s.snapshot().time).toBe(0); expect(s.snapshot().playing).toBe(false);
    for (const p of ['free', 'barrier', 'well'] as const) {
      s.loadPreset(p); const a = s.psi.values.slice(), v = s.potential; s.stamp(0, 0, brush); s.loadPreset(p);
      expect(s.psi.values).toEqual(a); expect(s.potential).toEqual(v); expect(s.snapshot().time).toBe(0); expect(s.snapshot().playing).toBe(false);
    }
  });
  it('preset geometry: full-y centered positive barrier, specified half-height width, localized negative well', () => {
    const g = createPsiGrid2D({ nx: 199, ny: 61 }), b = createTerrainPreset2D(g, 'barrier'), w = createTerrainPreset2D(g, 'well');
    expect(createTerrainPreset2D(g, 'free').potential.every(v => v === 0)).toBe(true);
    for (let j = 1; j < g.ny; j++) expect(b.potential.slice(j * g.nx, (j + 1) * g.nx)).toEqual(b.potential.slice(0, g.nx));
    expect(b.potential[99]).toBeGreaterThan(5.6); expect(b.potential[95]).toBeCloseTo(BARRIER_2D.height / 2, 2); expect(b.potential[103]).toBeCloseTo(BARRIER_2D.height / 2, 2);
    expect(w.potential.every(v => v <= 0)).toBe(true); expect(w.potential[30 * 199 + 99]).toBe(-5); expect(Math.abs(w.potential[0]!)).toBeLessThan(1e-15);
    expect(() => createTerrainPreset2D(g, 'invalid' as 'free')).toThrow();
  });
  it('reproducible scattering differs from free and redistributes density on both sides without norm loss', () => {
    const run = (barrier: boolean) => {
      const g = createPsiGrid2D(), setup = createTerrainPreset2D(g, 'barrier'); initializeGaussian2D(g, setup.gaussian);
      const v = barrier ? setup.potential : new Float64Array(g.nx * g.ny), s = new CayleyStepper2D(g);
      let initialRight = 0;
      for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) if (xCoordinate2D(g, i) > 1) { const k = 2 * (j * g.nx + i); initialRight += (g.values[k]! ** 2 + g.values[k + 1]! ** 2) * g.dx * g.dy; }
      for (let k = 0; k < 288; k++) s.step(g, v, 1 / 120);
      let left = 0, middle = 0, right = 0, edge = 0;
      for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
        const k = 2 * (j * g.nx + i), p = (g.values[k]! ** 2 + g.values[k + 1]! ** 2) * g.dx * g.dy, x = xCoordinate2D(g, i);
        if (x < -1) left += p; else if (x > 1) right += p; else middle += p;
        if (Math.abs(x) > 8) edge += p;
      }
      return { left, middle, right, edge, norm: normSquared2D(g), initialRight };
    };
    const barrier = run(true), free = run(false); console.log('5B scattering t=2.4, dx=20/129, dt=1/120', { barrier, free });
    expect(barrier.left).toBeGreaterThan(free.left + 0.1); expect(barrier.right).toBeLessThan(free.right - 0.1);
    expect(barrier.right).toBeGreaterThan(barrier.initialRight + 0.001); expect(barrier.middle).toBeGreaterThan(0);
    expect(barrier.norm).toBeCloseTo(1, 11); expect(free.norm).toBeCloseTo(1, 11);
    // These are region masses, NOT measured R/T coefficients or a tunnelling percentage.
  });
});

it('scattering-preset static energy drift refines rather than being assumed exactly conserved', () => {
  const run = (dt: number) => {
    const g = createPsiGrid2D(), setup = createTerrainPreset2D(g, 'barrier'); initializeGaussian2D(g, setup.gaussian);
    const s = new CayleyStepper2D(g), energy = () => energyExpectation2D(g, setup.potential), initial = energy(); let max = 0;
    for (let k = 0; k < Math.round(2.4 / dt); k++) { s.step(g, setup.potential, dt); max = Math.max(max, Math.abs(energy() - initial)); }
    return max;
  };
  const drifts = [run(1 / 60), run(1 / 120), run(1 / 240)];
  console.log('5B scattering static energy max drift dt=1/60,1/120,1/240', drifts);
  for (let k = 0; k < 2; k++) { expect(drifts[k]! / drifts[k + 1]!).toBeGreaterThan(3.7); expect(drifts[k]! / drifts[k + 1]!).toBeLessThan(4.3); }
}, 20000); // Three full-resolution evolutions plus per-step energy; allow parallel CI contention.

it('signed potential pixels have independent sign colors, transparent zero and matching row orientation', () => {
  const g = createPsiGrid2D({ nx: 2, ny: 2 }), v = new Float64Array([20, -20, 0, 10]), pixels = new Uint8ClampedArray(16), before = v.slice();
  fillPotentialPixels2D(g, v, pixels, 20); expect(v).toEqual(before); expect(pixels[3]).toBe(0); expect(pixels[7]).toBe(128);
  expect(pixels[8]).toBe(255); expect(pixels[10]).toBe(65); expect(pixels[12]).toBe(95); expect(pixels[14]).toBe(255);
});
it('overlay caches unchanged terrain, invalidates revision/size/settings, and does not read hidden overlays', () => {
  const original = globalThis.document;
  let copies = 0, puts = 0; const g = createPsiGrid2D({ nx: 3, ny: 2 });
  const staging = { createImageData: () => ({ data: new Uint8ClampedArray(24) }), putImageData: () => { puts++; } };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ getContext: () => staging }) } });
  try {
    const source = { terrainRevision: 0, potentialLimit: 20, copyPotential: (out: Float64Array) => { copies++; out.fill(2); } }, renderer = createPotentialRenderer2D(g, source);
    const context = { save() {}, restore() {}, drawImage() {} } as unknown as CanvasRenderingContext2D;
    renderer.draw(context, 600, 400, false, 0.6); expect(copies).toBe(0);
    renderer.draw(context, 600, 400, true, 0.6); renderer.draw(context, 600, 400, true, 0.6); expect(copies).toBe(1); expect(puts).toBe(1);
    source.terrainRevision++; renderer.draw(context, 600, 400, true, 0.6); renderer.draw(context, 300, 400, true, 0.6); renderer.draw(context, 300, 400, true, 0.8);
    expect(renderer.rebuilds).toBe(4);
  } finally { Object.defineProperty(globalThis, 'document', { configurable: true, value: original }); }
});
