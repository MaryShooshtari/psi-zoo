import type { PsiGrid2D } from './grid2d';
import { validatePotential2D } from './grid2d';
export interface CreatureParameters2D {
  readonly driveStrength: number;
  readonly preferredDirection: { readonly x: number; readonly y: number };
  readonly moodFrequency: number;
}
export interface InteractionSettings2D {
  readonly drives: boolean; readonly social: boolean;
  readonly strength: number; readonly range: number;
}
export interface InteractionSource2D {
  readonly id: string; readonly x: number; readonly y: number; readonly sz: number;
  readonly parameters: CreatureParameters2D;
}
/** Conservative game-model limits, not limits imposed on the core solver. */
export function validateInteractionSettings2D(s: InteractionSettings2D): void {
  if (typeof s.drives !== 'boolean' || typeof s.social !== 'boolean' || !Number.isFinite(s.strength) || s.strength < 0 || s.strength > 10
    || !Number.isFinite(s.range) || s.range < 0.2 || s.range > 10) throw new RangeError('Interactions require boolean switches, strength in [0,10], range in [0.2,10]');
}
/** Copy and normalize direction ONCE. Frequency is finite, possibly signed/zero. */
export function creatureParameters2D(p: CreatureParameters2D): CreatureParameters2D {
  const { x, y } = p.preferredDirection, length = Math.hypot(x, y);
  if (!Number.isFinite(p.driveStrength) || p.driveStrength < 0 || p.driveStrength > 1 || !Number.isFinite(p.moodFrequency)
    || !Number.isFinite(length) || length === 0) throw new RangeError('Creature needs drive strength in [0,1], finite frequency and finite nonzero direction');
  return Object.freeze({ driveStrength: p.driveStrength, moodFrequency: p.moodFrequency,
    preferredDirection: Object.freeze({ x: x / length, y: y / length }) });
}
export function drivePotentialAt2D(g: PsiGrid2D, a: InteractionSource2D, s: InteractionSettings2D, x: number, y: number): number {
  if (!s.drives || a.parameters.driveStrength === 0) return 0;
  const d = a.parameters.preferredDirection;
  return -a.parameters.driveStrength * a.sz * (d.x * (x - (g.xmin + g.xmax) / 2) + d.y * (y - (g.ymin + g.ymax) / 2));
}
/** Sources must be in stable ID order; composeEffectivePotential2D enforces it. */
export function socialPotentialAt2D(a: InteractionSource2D, sources: readonly InteractionSource2D[], s: InteractionSettings2D, x: number, y: number): number {
  if (!s.social || s.strength === 0) return 0;
  let sum = 0;
  for (const b of sources) if (b.id !== a.id) {
    const dx = (x - b.x) / s.range, dy = (y - b.y) / s.range;
    sum -= s.strength * a.sz * b.sz * Math.exp(-0.5 * (dx * dx + dy * dy));
  }
  return sum;
}
export function createInteractionWorkspace2D(g: PsiGrid2D) { return { x: new Float64Array(g.nx), y: new Float64Array(g.ny) }; }
export type InteractionWorkspace2D = ReturnType<typeof createInteractionWorkspace2D>;
/** Fill caller-owned scratch; never change terrain or clamp the effective H.
 * All sources are endpoint means/Bloch expectations from ONE world snapshot.
 * Stable-ID summation gives deterministic results independent of collection order.
 * This centroid-based game-defined mean field is NOT entanglement or a joint state.
 */
export function composeEffectivePotential2D(g: PsiGrid2D, terrain: Float64Array, target: InteractionSource2D,
  sources: readonly InteractionSource2D[], s: InteractionSettings2D, out: Float64Array,
  workspace: InteractionWorkspace2D = createInteractionWorkspace2D(g)): void {
  validateInteractionSettings2D(s); validatePotential2D(g, terrain);
  if (out.length !== terrain.length || out.buffer === terrain.buffer || out.buffer === g.values.buffer) throw new RangeError('Effective potential output must be correctly sized and disjoint');
  const sorted = [...sources].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const ids = new Set<string>();
  for (const a of [...sorted, target]) {
    if (!a.id || ![a.x, a.y, a.sz].every(Number.isFinite) || Math.abs(a.sz) > 1 + 1e-10) throw new RangeError('Invalid interaction snapshot');
    creatureParameters2D(a.parameters);
  }
  for (const a of sorted) { if (ids.has(a.id)) throw new RangeError('Duplicate interaction source ID'); ids.add(a.id); }
  const d = target.parameters.preferredDirection;
  if (Math.abs(Math.hypot(d.x, d.y) - 1) > 1e-12) throw new RangeError('Preferred direction must be normalized');
  const { x: wx, y: wy } = workspace;
  if (wx.length !== g.nx || wy.length !== g.ny || wx.buffer === wy.buffer
    || [wx.buffer, wy.buffer].some(buffer => buffer === out.buffer || buffer === terrain.buffer || buffer === g.values.buffer)) throw new RangeError('Interaction workspace must be sized and disjoint');
  const force = s.drives ? target.parameters.driveStrength * target.sz : 0;
  for (let i = 0; i < g.nx; i++) wx[i] = -force * d.x * (g.xmin + (i + 1) * g.dx - (g.xmin + g.xmax) / 2);
  for (let j = 0; j < g.ny; j++) wy[j] = -force * d.y * (g.ymin + (j + 1) * g.dy - (g.ymin + g.ymax) / 2);
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) out[j * g.nx + i] = terrain[j * g.nx + i]! + wx[i]! + wy[j]!;
  if (s.social && s.strength !== 0) for (const b of sorted) if (b.id !== target.id) {
    const coefficient = -s.strength * target.sz * b.sz;
    if (coefficient === 0) continue;
    // Exact Gaussian separability: exp(-(X²+Y²)/2)=exp(-X²/2)*exp(-Y²/2).
    // Only O(nx+ny) exponentials per pair, not O(nx*ny). No convolution/FFT.
    for (let i = 0; i < g.nx; i++) wx[i] = Math.exp(-0.5 * ((g.xmin + (i + 1) * g.dx - b.x) / s.range) ** 2);
    for (let j = 0; j < g.ny; j++) wy[j] = coefficient * Math.exp(-0.5 * ((g.ymin + (j + 1) * g.dy - b.y) / s.range) ** 2);
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) out[j * g.nx + i]! += wx[i]! * wy[j]!;
  }
  for (const value of out) if (!Number.isFinite(value)) throw new RangeError('Effective potential must remain finite');
}
