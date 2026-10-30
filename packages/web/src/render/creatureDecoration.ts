import type { PsiGrid2D } from '@psi-zoo/sim-core';
import type { WorldSnapshot2D } from '../world/world2d';
import { creatureLabel } from '../creatureIdentity';
import { physicalToCanvas2D } from './density2d';
import { marginalDensityScale, projectedX, projectionViewport } from './projection1d';
export interface DensityLayer { readonly id: string; readonly density: Float64Array }
export interface FaceAnchor { index: number; peak: number }
/** Significant mode, never a sampled position. Prefer a high-density mean; if a
 * split cloud has a low-density mean, use the first global maximum (stable ties).
 * This query is throttled to publication cadence by the overlay, not every frame. */
export function faceAnchor(density: Float64Array, meanIndex: number): FaceAnchor | null {
  let peak = 0, index = -1;
  for (let k = 0; k < density.length; k++) if (density[k]! > peak) { peak = density[k]!; index = k; }
  if (index < 0 || peak < 1e-8) return null;
  if (meanIndex >= 0 && meanIndex < density.length && density[meanIndex]! >= .35 * peak) index = meanIndex;
  return { index, peak };
}
/** Largest visible local contribution wins. Near-exact ties retain current
 * selection, then lexical ID. Ignore tails below 1% of the largest visible peak.
 * O(cells) only on an explicit click; no allocations of grid-sized arrays. */
export function pickCreature(layers: readonly DensityLayer[], index: number, selected: string): string | null {
  let peak = 0;
  for (const layer of layers) for (const rho of layer.density) peak = Math.max(peak, rho);
  let best = 0, id: string | null = null;
  for (const layer of layers) {
    const rho = layer.density[index] ?? 0, tolerance = 32 * Number.EPSILON * Math.max(peak, rho);
    if (rho < Math.max(1e-8, peak * .01)) continue;
    if (rho > best + tolerance || Math.abs(rho - best) <= tolerance && (layer.id === selected || id !== selected && (id === null || layer.id < id))) { best = rho; id = layer.id; }
  }
  return id;
}
/** A deterministic wall-clock blink changes only eye strokes, never the body or
 * any physics clock/RNG. Reduced motion uses a static, open-eyed expression. */
export function blinkClosed(id: string, milliseconds: number, reduced: boolean): boolean {
  const offset = [...id].reduce((s, c) => s + c.charCodeAt(0) * 71, 0);
  return !reduced && (milliseconds + offset) % 4200 < 140;
}
export function registeredConnections(snapshot: WorldSnapshot2D) {
  return snapshot.pairs.map(p => ({ id: p.id, a: p.creatureAId, b: p.creatureBId }));
}
export function createCreatureDecoration(g: PsiGrid2D) {
  const anchors = new Map<string, { anchor: FaceAnchor | null; checked: number; mean: number; size: number }>();
  return (context: CanvasRenderingContext2D, width: number, height: number, layers: readonly DensityLayer[], snapshot: WorldSnapshot2D | undefined,
    selected: string, projected: boolean, reduced: boolean, now: number, animate = true, densityScale?: number) => {
    if (!snapshot) return;
    const points = new Map<string, { x: number; y: number }>();
    const scale = projected ? densityScale ?? marginalDensityScale(layers) : 1, viewport = projectionViewport(width, height);
    for (const id of anchors.keys()) if (!layers.some(l => l.id === id)) anchors.delete(id);
    for (const layer of layers) {
      const creature = snapshot.creatures.find(c => c.id === layer.id); if (!creature) continue;
      const i = Math.round((creature.x - g.xmin) / g.dx) - 1, j = Math.round((creature.y - g.ymin) / g.dy) - 1;
      const mean = i < 0 || i >= g.nx || !projected && (j < 0 || j >= g.ny) ? -1 : projected ? i : j * g.nx + i;
      let entry = anchors.get(layer.id);
      if (!entry || now - entry.checked >= 100 || entry.mean !== mean || entry.size !== layer.density.length) {
        entry = { anchor: faceAnchor(layer.density, mean), checked: now, mean, size: layer.density.length }; anchors.set(layer.id, entry);
      }
      const anchor = entry.anchor;
      // Suppress a stale cached anchor immediately if density has left it.
      if (!anchor || layer.density[anchor.index]! < .2 * anchor.peak) continue;
      const point = projected ? { x: projectedX(g, anchor.index, width), y: viewport.baseline - layer.density[anchor.index]! / scale * (viewport.baseline - viewport.top) + 20 }
        : physicalToCanvas2D(g, g.xmin + (anchor.index % g.nx + 1) * g.dx, g.ymin + (Math.floor(anchor.index / g.nx) + 1) * g.dy, width, height);
      // Suppress near clipped edges rather than displace a face off its density.
      if (point.x < 28 || point.x > width - 28 || point.y < 30 || point.y > height - 34) continue;
      points.set(layer.id, point);
    }
    context.save();
    context.strokeStyle = '#75619390'; context.lineWidth = 1.3; context.setLineDash([3, 5]);
    for (const pair of registeredConnections(snapshot)) {
      const a = points.get(pair.a), b = points.get(pair.b); if (!a || !b) continue;
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      context.fillStyle = '#574b76'; context.font = '11px system-ui'; context.fillText('∞', (a.x + b.x) / 2, (a.y + b.y) / 2 - 7);
    }
    context.setLineDash([]);
    for (const [id, point] of points) {
      const c = snapshot.creatures.find(c => c.id === id)!;
      context.save(); context.translate(point.x, point.y);
      if (id === selected) { context.strokeStyle = '#6a428d'; context.lineWidth = 2; context.beginPath(); context.arc(0, 0, 18, 0, 2 * Math.PI); context.stroke(); }
      // Tiny translucent UI badge keeps density readable; no replacement body.
      context.fillStyle = '#fff7f7b8'; context.beginPath(); context.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#493d60'; context.fillStyle = '#493d60'; context.lineWidth = 1.6;
      const blink = blinkClosed(id, now, reduced || !animate);
      for (const x of [-5, 5]) {
        context.beginPath();
        if (blink) { context.moveTo(x - 2, -2); context.lineTo(x + 2, -2); context.stroke(); }
        else { context.ellipse(x, -2, 1.4, c.sz < -.25 ? 1.2 : 2.2, 0, 0, Math.PI * 2); context.fill(); }
      }
      context.beginPath(); context.moveTo(-4, 4); context.quadraticCurveTo(0, c.localMood.purity < .999 ? 4 : c.sz > .25 ? 8 : c.sz < -.25 ? 1 : 5, 4, 4); context.stroke();
      context.font = '11px system-ui'; context.textAlign = 'center';
      context.fillText(`${creatureLabel(id)}${c.localMood.kind === 'paired' ? ' ∞' : ''}`, 0, -23);
      context.fillText(c.localMood.purity < .999 ? 'mixed' : c.sz > .25 ? '+Z' : c.sz < -.25 ? '−Z' : '≈0 Z', 0, 31);
      context.restore();
    }
    context.restore();
  };
}
