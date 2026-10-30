import type { PsiGrid2D } from '@psi-zoo/sim-core';
import { initialCreature2D, type WorldOptions2D } from './world2d';
export type WorldPreset2D = 'independent' | 'mood' | 'attraction' | 'repulsion' | 'bell';
/** Same spatial packets in all examples: contrasts are caused by H, not artwork.
 * Social examples keep sz=+/-1 stationary (omega=0) for an unambiguous comparison.
 */
export function createWorldPreset2D(g: PsiGrid2D, preset: WorldPreset2D): WorldOptions2D {
  if (!['independent', 'mood', 'attraction', 'repulsion', 'bell'].includes(preset)) throw new RangeError('Unknown world preset');
  const social = preset === 'attraction' || preset === 'repulsion';
  return {
    bellPairs: preset === 'bell' ? [{ id: 'friendship', creatureAId: 'a', creatureBId: 'b' }] : [],
    interactions: { drives: preset === 'mood', social, strength: 3, range: 2 },
    creatures: [-1, 1].map((sign, index) => initialCreature2D(g, index === 0 ? 'a' : 'b',
      { x0: sign * 1.5, y0: 0, sigmaX: 0.7, sigmaY: 0.7, px: 0, py: 0 },
      index === 1 && (preset === 'repulsion' || preset === 'mood') ? 1 : 0,
      { driveStrength: 0.3, preferredDirection: index === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 }, moodFrequency: social ? 0 : 0.8 })),
  };
}
