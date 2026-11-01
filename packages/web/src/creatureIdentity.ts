import { creatureColor2D } from './render/creatures2d';
/** Presentation-only stable reference, never a sampled position or personality.
 * Extra IDs remain distinct; no name table, roster-order dependence or RNG. */
export function creatureLabel(id: string): string { return `Creature ${id.toUpperCase()}`; }
export { creatureColor2D };
export function simpleMood(sz: number, purity: number): string {
  if (purity < .999) return 'Mixed mood';
  return sz > .25 ? 'Bright · +Z leaning' : sz < -.25 ? 'Quiet · −Z leaning' : 'Balanced · Z expectation near zero';
}
