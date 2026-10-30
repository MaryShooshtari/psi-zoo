import type { Snapshot2D, SimulationPlayback2D } from './simulation2d';
import type { TerrainDisplaySettings } from './TerrainControls';
export const GUIDE_PREFERENCE = 'psi-zoo-guide-v1';
export function guideWasCompleted(): boolean {
  try { return globalThis.localStorage?.getItem(GUIDE_PREFERENCE) === 'done'; } catch { return false; }
}
export function rememberGuideCompletion(): void {
  try { globalThis.localStorage?.setItem(GUIDE_PREFERENCE, 'done'); } catch { /* Optional preference, never required. */ }
}
export function hasObservedSpreading(played: boolean, initial: Pick<Snapshot2D, 'sigmaX' | 'sigmaY'> | null, now: Snapshot2D | null): boolean {
  // A user Play action AND committed physical evolution with changed width.
  // A 20% width increase is perceptible, not merely floating-point drift.
  // The criterion uses evolved state, never a wall-clock timer.
  return !!(played && initial && now && now.time > 0 && now.world?.creatures.length === 1 &&
    Number.isFinite(now.sigmaX) && Number.isFinite(now.sigmaY) && initial.sigmaX > 0 && initial.sigmaY > 0 &&
    Math.max(now.sigmaX / initial.sigmaX, now.sigmaY / initial.sigmaY) >= 1.2);
}
/** Called only on a fresh independent-preset controller after consent.
 * Finishing/skipping remounts that same canonical scene; old timers/controllers
 * are disposed by the existing component cleanup. No intermediate publication. */
export function prepareMuseumScene(controller: SimulationPlayback2D): void {
  controller.world!.remove('b');
}
export function qualifyingBarrierStroke(distance: number, before: number, after: number, max: number): boolean {
  return distance >= 12 && after > before && max > 0;
}
/** A deliberately activated accessible terrain action, not automatic advancement. */
export function paintGuideBarrier(controller: SimulationPlayback2D, settings: TerrainDisplaySettings): void {
  if (settings.tool !== 'barrier') return;
  for (let i = 0; i < 5; i++) controller.stamp(-0.5 + i * 0.25, 0, { sigma: settings.sigma, amplitude: settings.amplitude, tool: 'barrier' });
}
