import type { WorldSnapshot2D } from './world/world2d';
import { creatureLabel, creatureColor2D, simpleMood } from './creatureIdentity';
export function CreatureSummary2D({ snapshot }: { snapshot: WorldSnapshot2D }) {
  const c = snapshot.creatures.find(c => c.id === snapshot.selected)!;
  return <div className="creature-summary" aria-label="Selected creature summary">
    <strong><span className="creature-swatch" aria-hidden="true" style={{ backgroundColor: `rgb(${creatureColor2D(c.id).join(',')})` }} /> {creatureLabel(c.id)}{c.localMood.kind === 'paired' ? ' ∞' : ''}</strong>
    <span>{simpleMood(c.sz, c.localMood.purity)}</span>
  </div>;
}
