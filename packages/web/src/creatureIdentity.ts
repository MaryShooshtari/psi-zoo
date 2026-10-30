import { creatureColor2D } from './render/creatures2d';
const NAMES = ['Mochi', 'Pip', 'Lumi', 'Nori'] as const;
/** Presentation-only identity: no RNG, roster-order or selection dependence. */
export function creatureName(id: string): string {
  const letter = ['a', 'b', 'c', 'd'].indexOf(id);
  const index = letter >= 0 ? letter : [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % NAMES.length;
  return NAMES[index]!;
}
export function creatureLabel(id: string): string { return `${creatureName(id)} · ${id.toUpperCase()}`; }
export { creatureColor2D };
export function simpleMood(sz: number, purity: number): string {
  if (purity < .999) return 'Mixed mood';
  return sz > .25 ? 'Bright · +Z leaning' : sz < -.25 ? 'Quiet · −Z leaning' : 'Balanced · Z expectation near zero';
}
