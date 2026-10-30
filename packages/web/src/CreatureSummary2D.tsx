import type { WorldSnapshot2D } from './world/world2d';
import { creatureName, creatureColor2D, simpleMood } from './creatureIdentity';
export function CreatureSummary2D({ snapshot }: { snapshot: WorldSnapshot2D }) {
  const c = snapshot.creatures.find(c => c.id === snapshot.selected)!;
  return <div className="creature-summary" aria-label="Selected creature summary">
    <strong><span className="creature-swatch" aria-hidden="true" style={{ backgroundColor: `rgb(${creatureColor2D(c.id).join(',')})` }} /> {creatureName(c.id)} · {c.id.toUpperCase()}</strong>
    <span>{simpleMood(c.sz, c.localMood.purity)}</span>
    <span>{c.localMood.kind === 'paired' ? `∞ Mood pair · ${c.localMood.pairId}` : 'Independent mood'}</span>
  </div>;
}
