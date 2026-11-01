import { createPsiGrid2D } from '../../packages/sim-core/src/index';
import { QuantumWorld2D } from '../../packages/web/src/world/world2d';
import { createWorldPreset2D } from '../../packages/web/src/world/worldPresets2d';

/** Bounded solver-cost comparison, not a sustained runtime or FPS guarantee. */
export function benchmarkDomains() {
  const h = 20 / 129;
  const sizes: readonly (readonly [number, number])[] = [[128,128],[194,85],[300,128]];
  return sizes.map(([nx,ny]) => {
    const g = createPsiGrid2D({ nx, ny, xmin: -(nx+1)*h/2, xmax: (nx+1)*h/2, ymin: -(ny+1)*h/2, ymax: (ny+1)*h/2 });
    const w = new QuantumWorld2D(g, createWorldPreset2D(g, 'mood')), v = new Float64Array(g.nx*g.ny);
    for (let n=0;n<24;n++) w.step(v,1/120);
    const batches: number[] = [];
    for (let b=0;b<5;b++) {
      const start = performance.now();
      for (let n=0;n<36;n++) w.step(v,1/120);
      batches.push((performance.now()-start)/36);
    }
    return { nx,ny,cells:g.nx*g.ny,dx:g.dx,dy:g.dy,twoCreatureMsPerStep:batches,medianMsPerStep:[...batches].sort((a,b)=>a-b)[2],norms:w.getSnapshot().creatures.map(c=>c.norm) };
  });
}
