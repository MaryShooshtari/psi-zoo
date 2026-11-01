import type { PsiGrid2D } from '@psi-zoo/sim-core';
import type { WorldAction2D, WorldSnapshot2D } from '../world/world2d';
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
/** Armed actions never resolve overlap by selection, height or ID. Compute the
 * threshold across ALL visible layers before testing marginal under-curve hits.
 * Pass only renderer-visible layers; native forms may still name hidden IDs. */
export function actionCandidates(layers: readonly DensityLayer[], index: number,
  plot?: { readonly y: number; readonly top: number; readonly baseline: number; readonly scale: number; readonly samplePosition?: number }): readonly string[] {
  if (!Number.isSafeInteger(index) || index < 0) return [];
  if (plot && (!Number.isFinite(plot.y) || !Number.isFinite(plot.scale) || !Number.isFinite(plot.top) || !Number.isFinite(plot.baseline) || plot.scale <= 0
    || !(plot.baseline > plot.top) || plot.y < plot.top || plot.y > plot.baseline
    || plot.samplePosition !== undefined && !Number.isFinite(plot.samplePosition))) return [];
  let peak = 0;
  for (const layer of layers) for (const rho of layer.density) peak = Math.max(peak, rho);
  const threshold = Math.max(1e-8, .01 * peak);
  return layers.filter(layer => {
    let rho = layer.density[index];
    if (plot?.samplePosition !== undefined) {
      // The renderer joins interior nodes linearly to zero boundary endpoints.
      // Compare with that actual segment, not the nearest sample's taller hill.
      const position = plot.samplePosition, left = Math.floor(position), fraction = position - left;
      if (position < 0 || position > layer.density.length + 1) return false;
      rho = (layer.density[left - 1] ?? 0) * (1 - fraction) + (layer.density[left] ?? 0) * fraction;
    }
    return rho !== undefined && rho >= threshold && (!plot || plot.y >= plot.baseline - rho / plot.scale * (plot.baseline - plot.top));
  }).map(layer => layer.id);
}
/** Read-only exact marginal hit mapping, including the zero boundary segments.
 * This does not change the renderer, scale, physical coordinates or inspection. */
export function projectedActionCandidates(layers: readonly DensityLayer[], g: PsiGrid2D, x: number, y: number, width: number, height: number, scale: number): readonly string[] {
  const v = projectionViewport(width, height);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0 || x < v.left || x > v.right || !(v.right > v.left)) return [];
  const samplePosition = (x - v.left) / (v.right - v.left) * (g.xmax - g.xmin) / g.dx;
  return actionCandidates(layers, 0, { y, top: v.top, baseline: v.baseline, scale, samplePosition });
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
/** Actual sampled targets only. Preparation and zero-draw factorization are not surprises. */
export function measurementReactionTargets(receipt: WorldAction2D): readonly string[] {
  return Object.freeze(receipt.kind === 'spatial-measurement' ? [receipt.targetId]
    : [...new Set(receipt.events.flatMap(event => event.type === 'measure' ? [event.creatureId] : []))]);
}
export function createCreatureDecoration(g: PsiGrid2D) {
  const anchors = new Map<string, { anchor: FaceAnchor | null; checked: number; mean: number; size: number }>();
  let lifetime: object | undefined, spatialCount = -1, time = 0;
  function draw(context: CanvasRenderingContext2D, width: number, height: number, layers: readonly DensityLayer[], snapshot: WorldSnapshot2D | undefined,
    selected: string, projected: boolean, reduced: boolean, now: number, animate = true, densityScale?: number, worldLifetime?: object, surprisedIds: readonly string[] = []): void {
    if (!snapshot) return;
    // A new posterior may leave the old anchor significant. Invalidate once at
    // publication, not by adding another full density scan to every frame.
    if (snapshot.spatialMeasurementCount !== spatialCount || worldLifetime !== lifetime || snapshot.time < time) anchors.clear();
    lifetime = worldLifetime; spatialCount = snapshot.spatialMeasurementCount; time = snapshot.time;
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
      // Owner-selected F1: the cloud is the body; only small ink features and
      // a non-circular selection bracket are overlaid on significant density.
      if (id === selected) {
        context.strokeStyle = '#493d60'; context.lineWidth = 2; context.beginPath();
        context.moveTo(-18, -7); context.lineTo(-18, -15); context.lineTo(-10, -15);
        context.moveTo(10, 15); context.lineTo(18, 15); context.lineTo(18, 7); context.stroke();
      }
      // Tiny translucent cheeks sit directly in the cloud: no head disc or halo.
      context.fillStyle = '#f4a6c570';
      for (const x of [-10, 10]) { context.beginPath(); context.ellipse(x, 4, 3.5, 2, 0, 0, 2 * Math.PI); context.fill(); }
      context.strokeStyle = '#34314e'; context.fillStyle = '#34314e'; context.lineWidth = 1.6;
      const surprised = !reduced && surprisedIds.includes(id);
      const blink = !surprised && blinkClosed(id, now, reduced || !animate);
      for (const x of [-5, 5]) {
        context.beginPath();
        if (blink) { context.moveTo(x - 2, -2); context.lineTo(x + 2, -2); context.stroke(); }
        else {
          context.ellipse(x, -2, 2.1, c.sz < -.25 ? 1.6 : 3, 0, 0, Math.PI * 2); context.fill();
          context.fillStyle = '#fff9ef'; context.beginPath(); context.ellipse(x - .5, -3, .65, .8, 0, 0, 2 * Math.PI); context.fill(); context.fillStyle = '#34314e';
        }
      }
      context.beginPath();
      if (surprised) context.ellipse(0, 5, 2, 2.5, 0, 0, 2 * Math.PI);
      else { context.moveTo(-4, 4); context.quadraticCurveTo(0, c.localMood.purity < .999 ? 4 : c.sz > .25 ? 8 : c.sz < -.25 ? 1 : 5, 4, 4); }
      context.stroke();
      context.font = '11px system-ui'; context.textAlign = 'center';
      // Only the selected identity needs a label; moods remain in the inspector.
      if (id === selected) { context.fillStyle = projected ? '#574b76' : '#f9f4ff'; context.fillText(`${creatureLabel(id)}${c.localMood.kind === 'paired' ? ' ∞' : ''}`, 0, -23); }
      context.restore();
    }
    context.restore();
  }
  draw.invalidate = () => anchors.clear();
  return draw;
}
