import type { CreatureInspection } from './simulation';
import type { CreatureId } from './world/twoCreatureWorld';

/** A projection of measured state coordinates, never an independently animated dial. */
export function CreatureInspector({ selected, inspection, onSelect }: {
  selected: CreatureId; inspection?: CreatureInspection; onSelect(id: CreatureId): void;
}) {
  const number = (value: number | undefined, digits = 4) => value !== undefined && Number.isFinite(value) ? value.toFixed(digits) : '—';
  const r = inspection?.bloch;
  return <section className="creature-inspector" aria-label="Selected creature observables">
    <fieldset className="brush-controls">
      <legend>Inspect and observe a creature</legend>
      <label className="painting-toggle creature-a"><input type="radio" name="creature" value="a" checked={selected === 'a'}
        onChange={() => onSelect('a')} /> Creature A · cyan solid</label>
      <label className="painting-toggle creature-b"><input type="radio" name="creature" value="b" checked={selected === 'b'}
        onChange={() => onSelect('b')} /> Creature B · rose dashed</label>
    </fieldset>
    <h2>Creature {selected.toUpperCase()} · physical observables</h2>
    <div className="diagnostics">
      <span><strong>Position expectation ⟨x⟩:</strong> {number(inspection?.position)}</span>
      <span><strong>Spatial norm:</strong> {number(inspection?.norm, 10)}</span>
      <span><strong>Mood norm:</strong> {number(inspection?.moodNorm, 10)}</span>
      <span><strong>Bloch rx:</strong> {number(r?.x)}</span>
      <span><strong>Bloch ry:</strong> {number(r?.y)}</span>
      <span><strong>Bloch rz:</strong> {number(r?.z)}</span>
    </div>
    <div className="bloch-readout">
      <svg viewBox="0 0 110 110" role="img" aria-label="Bloch x–z projection of selected mood">
        <circle cx="55" cy="55" r="36" fill="none" stroke="#426681" />
        <path d="M19 55H91 M55 19V91" fill="none" stroke="#426681" />
        <text x="94" y="59">x</text><text x="52" y="13">z</text>
        {r && <><line x1="55" y1="55" x2={55 + 36 * r.x} y2={55 - 36 * r.z} stroke={selected === 'a' ? '#a8f9fc' : '#f49bdf'} />
          <circle cx={55 + 36 * r.x} cy={55 - 36 * r.z} r="4" fill={selected === 'a' ? '#a8f9fc' : '#f49bdf'} /></>}
      </svg>
      <p className="plot-note">Bloch x–z projection; y is reported numerically, not hidden depth or probability. These are qubit observables, not personality labels. Selection changes inspection and the observation target, never the evolution.</p>
    </div>
  </section>;
}
