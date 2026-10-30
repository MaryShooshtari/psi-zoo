import { projectTerrainX, type PsiGrid2D } from '@psi-zoo/sim-core';
import { creatureColor2D } from './creatures2d';

export interface MarginalLayer { readonly id: string; readonly density: Float64Array }
/** Linear, shared density axis. At least 0.5 per x unit; expand to 1.15 times
 * the largest peak across ALL creatures (including hidden ones). No peak clipping,
 * smoothing or independent normalization. Extreme finite peaks lose headroom,
 * not relative heights. Division precedes screen multiplication to avoid overflow.
 */
export function marginalDensityScale(layers: readonly MarginalLayer[]): number {
  let peak = 0;
  for (const { density } of layers) for (const rho of density) {
    if (!Number.isFinite(rho) || rho < 0) throw new RangeError('Marginal density must be finite and nonnegative');
    peak = Math.max(peak, rho);
  }
  return Math.max(.5, peak <= Number.MAX_VALUE / 1.15 ? peak * 1.15 : peak);
}
export function projectionViewport(width: number, height: number) {
  const left = Math.min(52, width / 5), right = width - Math.min(28, width / 8);
  const top = Math.min(42, height * .15), baseline = height * .65;
  return { left, right, top, baseline, terrainZero: height * .84, terrainHeight: height * .07 };
}
/** Same physical interior x coordinates as the 2D grid, not i/(nx-1). */
export function projectedX(g: PsiGrid2D, i: number, width: number): number {
  const v = projectionViewport(width, 1);
  return v.left + ((i + 1) * g.dx) / (g.xmax - g.xmin) * (v.right - v.left);
}

export function createProjectionRenderer(g: PsiGrid2D, source: {
  readonly ids: readonly string[];
  copyProjectedDensityX(id: string, output: Float64Array): void;
}, terrain: { readonly terrainRevision: number; copyPotential(output: Float64Array): void }) {
  const cache = new Map<string, Float64Array>();
  const averagedTerrain = new Float64Array(g.nx), xs = new Float64Array(g.nx);
  let lastWidth = -1;
  let field: Float64Array | undefined, revision = -1;
  function draw(context: CanvasRenderingContext2D, width: number, height: number, selected: string, selectedOnly: boolean, showTerrain: boolean, terrainOpacity: number): void {
    const ids = source.ids;
    for (const id of cache.keys()) if (!ids.includes(id)) cache.delete(id);
    const layers = ids.map(id => {
      let density = cache.get(id);
      if (!density) { density = new Float64Array(g.nx); cache.set(id, density); }
      source.copyProjectedDensityX(id, density);
      return { id, density };
    });
    const scale = marginalDensityScale(layers), v = projectionViewport(width, height);
    if (width !== lastWidth) { for (let i = 0; i < g.nx; i++) xs[i] = projectedX(g, i, width); lastWidth = width; }
    const y = (rho: number) => v.baseline - (rho / scale) * (v.baseline - v.top);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#dce9f3'; context.fillRect(0, 0, width, height);
    context.font = '12px system-ui'; context.fillStyle = '#574b76';
    context.fillText(`Position density · shared linear scale 0–${scale.toPrecision(3)}`, v.left, 20);
    context.strokeStyle = '#6c789180'; context.lineWidth = 1; context.setLineDash([]);
    context.beginPath(); context.moveTo(v.left, v.baseline); context.lineTo(v.right, v.baseline); context.stroke();
    context.fillText(`x = ${g.xmin}`, v.left, v.baseline + 18);
    context.fillText(`${g.xmax}`, v.right - 20, v.baseline + 18);
    const visible = layers.filter(l => !selectedOnly || l.id === selected);
    draw.layers = visible;
    draw.scale = scale;
    // All fills precede all outlines, so a later cloud cannot hide another's line.
    for (const layer of visible) {
      const color = creatureColor2D(layer.id);
      context.fillStyle = `rgba(${color.join(',')},0.26)`;
      context.beginPath(); context.moveTo(v.left, v.baseline);
      for (let i = 0; i < g.nx; i++) context.lineTo(xs[i]!, y(layer.density[i]!));
      context.lineTo(v.right, v.baseline); context.closePath(); context.fill();
    }
    for (const layer of [...visible.filter(l => l.id !== selected), ...visible.filter(l => l.id === selected)]) {
      const color = creatureColor2D(layer.id).map(c => Math.round(c * .68));
      context.strokeStyle = `rgb(${color.join(',')})`; context.lineWidth = layer.id === selected ? 3 : 1.7;
      const index = ids.indexOf(layer.id); context.setLineDash(index === 0 ? [] : [8, 3 + index * 2]);
      // Actual zero Dirichlet x boundaries, not invented density samples. With
      // linear joins, the plotted integral equals the dx-weighted sample sum in exact arithmetic.
      context.beginPath(); context.moveTo(v.left, v.baseline);
      for (let i = 0; i < g.nx; i++) context.lineTo(xs[i]!, y(layer.density[i]!));
      context.lineTo(v.right, v.baseline); context.stroke();
    }
    context.setLineDash([]);
    visible.forEach((layer, i) => {
      context.fillStyle = `rgb(${creatureColor2D(layer.id).map(c => Math.round(c * .68)).join(',')})`;
      context.fillText(`${layer.id.toUpperCase()}${layer.id === selected ? ' · selected' : ''}`, v.left + i * 115, v.top + 14);
    });
    if (showTerrain) {
      if (revision !== terrain.terrainRevision) {
        field ??= new Float64Array(g.nx * g.ny);
        terrain.copyPotential(field); projectTerrainX(g, field, averagedTerrain); revision = terrain.terrainRevision;
      }
      context.strokeStyle = '#574b7630'; context.lineWidth = 1;
      context.beginPath(); context.moveTo(v.left, v.terrainZero); context.lineTo(v.right, v.terrainZero); context.stroke();
      // Separate signed energy band. Fixed +/-20 scale is the editable terrain
      // limit, independent of density. A sign change crosses its own zero line.
      const segment = (x0: number, y0: number, x1: number, y1: number, positive: boolean) => {
        context.strokeStyle = positive ? '#9d3c23' : '#3c4b9a';
        context.beginPath(); context.moveTo(x0, y0); context.lineTo(x1, y1); context.stroke();
      };
      context.globalAlpha = .55 * terrainOpacity;
      for (let i = 0; i < g.nx - 1; i++) {
        const a = averagedTerrain[i]!, b = averagedTerrain[i + 1]!;
        if (a === 0 && b === 0) continue; // The zero guide already covers this segment.
        const x0 = xs[i]!, x1 = xs[i + 1]!, y0 = v.terrainZero - a / 20 * v.terrainHeight, y1 = v.terrainZero - b / 20 * v.terrainHeight;
        if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
          const zeroX = x0 + (x1 - x0) * Math.abs(a) / (Math.abs(a) + Math.abs(b));
          segment(x0, y0, zeroX, v.terrainZero, a > 0);
          segment(zeroX, v.terrainZero, x1, y1, b > 0);
        } else segment(x0, y0, x1, y1, (a === 0 ? b : a) >= 0);
      }
      context.globalAlpha = 1; context.fillStyle = '#58647d';
      context.fillText('Average terrain along y · energy ±20 · not a 1D Hamiltonian', v.left, height - 12);
    }
  }
  draw.layers = [] as MarginalLayer[];
  draw.scale = .5;
  return draw;
}
