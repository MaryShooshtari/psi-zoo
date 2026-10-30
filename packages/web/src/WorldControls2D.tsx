import type { InteractionSettings2D } from '@psi-zoo/sim-core';
import type { WorldSnapshot2D } from './world/world2d';
import type { WorldPreset2D } from './world/worldPresets2d';
import { creatureColor2D, creatureName } from './creatureIdentity';
import { SettingsPage } from './TerrariumShell';
export function WorldControls2D({ snapshot: s, selectedOnly, changeView, select, add, remove, interactions, preset, disabled }: {
  snapshot: WorldSnapshot2D; selectedOnly: boolean; changeView: (value: boolean) => void;
  select: (id: string) => void; add: () => void; remove: () => void;
  interactions: (settings: Partial<InteractionSettings2D>) => void; preset: (p: WorldPreset2D) => void; disabled: boolean;
}) {
  const c = s.creatures.find(c => c.id === s.selected)!, settings = s.interactions;
  const n = (x: number, digits = 5) => x.toFixed(digits);
  const pair = s.pairs.find(p => p.id === c.localMood.pairId);
  const measurement = [...s.moodHistory].reverse().find(e => e.type === 'measure' && e.creatureId === c.id);
  return <section className="world-inspector" aria-label="2D creature world">
    <SettingsPage section="Creatures"><fieldset className="brush-controls" disabled={disabled}>
      <legend>Creatures · each has its own norm-one state</legend>
      {s.creatures.map(c => <label key={c.id} className="painting-toggle">
        <input type="radio" name="world-creature" value={c.id} checked={c.id === s.selected} onChange={() => select(c.id)} />
        <span className="creature-swatch" aria-hidden="true" style={{ backgroundColor: `rgb(${creatureColor2D(c.id).join(',')})` }} />
        Creature {c.id.toUpperCase()} · {creatureName(c.id)}</label>)}
      <button onClick={add} disabled={s.creatures.length >= s.maxPopulation}>Add creature</button>
      <button onClick={remove} disabled={s.creatures.length <= 1 || c.localMood.kind === 'paired'} title={c.localMood.kind === 'paired' ? 'Measure & Release before removing either member' : undefined}>Remove selected creature</button>
    </fieldset></SettingsPage>
    <SettingsPage section="Display"><fieldset className="brush-controls" disabled={disabled}><legend>Density layers</legend>
      <label className="painting-toggle"><input aria-label="Show selected creature only" type="checkbox" checked={selectedOnly} onChange={e => changeView(e.currentTarget.checked)} /> Show selected density only</label>
    </fieldset></SettingsPage>
    <SettingsPage section="Moods & friendships"><fieldset className="brush-controls" disabled={disabled}>
      <legend>Effective Hamiltonian controls · applied live, never a reset</legend>
      <label className="painting-toggle"><input aria-label="Mood drives" type="checkbox" checked={settings.drives} onChange={e => interactions({ drives: e.currentTarget.checked })} /> Mood drives</label>
      <label className="painting-toggle"><input aria-label="Social interactions" type="checkbox" checked={settings.social} onChange={e => interactions({ social: e.currentTarget.checked })} /> Social interactions</label>
      <label>Social strength g₀ = {n(settings.strength, 1)}<input aria-label="2D social strength" type="range" min="0" max="6" step="0.5" value={settings.strength} onChange={e => interactions({ strength: e.currentTarget.valueAsNumber })} /></label>
      <label>Social range ℓ = {n(settings.range, 1)}<input aria-label="2D social range" type="range" min="0.5" max="4" step="0.1" value={settings.range} onChange={e => interactions({ range: e.currentTarget.valueAsNumber })} /></label>
    </fieldset></SettingsPage>
    <SettingsPage section="Experiments"><div className="controls" aria-label="World presets">
      <button disabled={disabled} onClick={() => preset('independent')}>World: independent</button>
      <button disabled={disabled} onClick={() => preset('mood')}>World: mood drive</button>
      <button disabled={disabled} onClick={() => preset('attraction')}>World: attraction</button>
      <button disabled={disabled} onClick={() => preset('repulsion')}>World: repulsion</button>
      <button disabled={disabled} onClick={() => preset('bell')}>World: entangled friendship</button>
    </div></SettingsPage>
    <SettingsPage section="Advanced"><h2>Creature {c.id.toUpperCase()} · selected inspection · {creatureName(c.id)}</h2>
    <div className="diagnostics" aria-label="All creature norms">
      {s.creatures.map(c => <span key={c.id} data-creature-id={c.id}><strong>Norm {c.id.toUpperCase()}:</strong> {n(c.norm, 12)}</span>)}
    </div>
    <div className="diagnostics" aria-label="Selected 2D creature diagnostics">
      <span><strong>Mean x:</strong> {n(c.x)}</span><span><strong>Mean y:</strong> {n(c.y)}</span>
      <span><strong>Selected σx:</strong> {n(c.sigmaX)}</span><span><strong>Selected σy:</strong> {n(c.sigmaY)}</span>
      <span><strong>Bloch x:</strong> {n(c.bloch.x)}</span><span><strong>Bloch y:</strong> {n(c.bloch.y)}</span><span><strong>Mood sz:</strong> {n(c.sz)}</span>
      <span><strong>Mood norm:</strong> {n(c.moodNorm, 12)}</span>
      <span><strong>Selected local purity:</strong> {n(c.localMood.purity, 6)}</span>
      <span><strong>Selected pair identity:</strong> {pair?.id ?? 'Independent'}</span>
      <span><strong>Selected entanglement entropy:</strong> {pair ? `${n(pair.entropy, 6)} bits` : 'Not paired'}</span>
      <span><strong>Last recorded mood outcome:</strong> {measurement?.type === 'measure' ? `${measurement.basis} → ${measurement.basis === 'X' ? (measurement.outcome === 0 ? '+' : '−') : measurement.outcome} (probability ${n(measurement.probability, 6)})` : 'None for this creature'}</span>
      <span><strong>Drive strength:</strong> {n(c.parameters.driveStrength, 2)}</span>
      <span><strong>Direction:</strong> ({n(c.parameters.preferredDirection.x, 2)}, {n(c.parameters.preferredDirection.y, 2)})</span>
      <span><strong>Mood frequency:</strong> {n(c.parameters.moodFrequency, 2)}</span>
      <span><strong>Drive force x:</strong> {n(c.forceX)}</span><span><strong>Drive force y:</strong> {n(c.forceY)}</span>
      <span><strong>Social V at mean:</strong> {n(c.socialAtMean)}</span>
    </div>
    </SettingsPage><SettingsPage section="Physics notebook"><p className="plot-note">Colors identify independent density layers, not coherent amplitudes. Select a creature and Show selected density only to inspect overlaps without color blending. Each norm is one; the integral of the sum of densities equals the creature count. Spatial states remain independent. Registered mood pairs share a genuine two-qubit state; this is not spatial entanglement or an exact many-body model.</p>
    <p className="plot-note">Same-sign sz values attract; opposite signs repel; near-zero sz weakens the rule. Mood evolves unitarily with Hm=(ω/2)σx. Drives and social potentials use one common pre-step snapshot; frozen feedback is generally first-order in time. Individual energies need not be conserved, and no conserved many-body energy is claimed.</p></SettingsPage>
  </section>;
}
