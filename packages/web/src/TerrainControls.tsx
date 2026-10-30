import { SettingsPage } from './TerrariumShell';
import type { TerrainPointerSettings } from './terrainBrush';
import type { TerrainPreset2D } from './terrainPresets';
export interface TerrainDisplaySettings extends TerrainPointerSettings { overlay: boolean; opacity: number }
export const DEFAULT_TERRAIN_SETTINGS: TerrainDisplaySettings = { tool: 'view', sigma: 0.7, amplitude: 2, overlay: true, opacity: 0.6 };
export function TerrainControls({ settings: s, disabled, change, clear, preset }: {
  settings: TerrainDisplaySettings; disabled: boolean;
  change: (next: TerrainDisplaySettings) => void; clear: () => void; preset?: (p: TerrainPreset2D) => void;
}) {
  return <>
    <SettingsPage section="Terrain"><fieldset className="brush-controls" disabled={disabled}>
      <legend>2D terrain tools · energy units, not probability</legend>
      {(['view', 'barrier', 'well', 'erase'] as const).map(tool => <label key={tool} className="painting-toggle">
        <input type="radio" name="terrain-tool" value={tool} checked={s.tool === tool} onChange={() => change({ ...s, tool })} />
        {{ view: 'View / inspect', barrier: 'Barrier (+)', well: 'Well (−)', erase: 'Eraser' }[tool]}</label>)}
      <label>Brush radius σ = {s.sigma.toFixed(1)}
        <input aria-label="2D brush radius" type="range" min="0.2" max="2" step="0.1" value={s.sigma} disabled={s.tool === 'view'}
          onChange={e => change({ ...s, sigma: e.currentTarget.valueAsNumber })} /></label>
      <label>Brush strength A = {s.amplitude.toFixed(1)}
        <input aria-label="2D brush strength" type="range" min="0.2" max="10" step="0.2" value={s.amplitude} disabled={s.tool === 'view' || s.tool === 'erase'}
          onChange={e => change({ ...s, amplitude: e.currentTarget.valueAsNumber })} /></label>
      <button onClick={clear}>Clear terrain</button>
    </fieldset></SettingsPage>
    <SettingsPage section="Display"><fieldset className="brush-controls" disabled={disabled}>
      <legend>Potential overlay · independent of density brightness</legend>
      <label className="painting-toggle"><input type="checkbox" aria-label="Show potential overlay" checked={s.overlay} onChange={e => change({ ...s, overlay: e.currentTarget.checked })} /> Show potential</label>
      <label>Overlay opacity {s.opacity.toFixed(2)}<input aria-label="Potential overlay opacity" type="range" min="0" max="1" step="0.05" value={s.opacity}
        disabled={!s.overlay} onChange={e => change({ ...s, opacity: e.currentTarget.valueAsNumber })} /></label>
      <span><strong className="positive-potential">Warm: +V barriers</strong> · <strong className="negative-potential">Blue: −V wells</strong> · zero transparent · scale −20 to +20 energy</span>
    </fieldset></SettingsPage>
    <SettingsPage section="Experiments">{preset && <div className="controls" aria-label="2D experiment presets">
      <button disabled={disabled} onClick={() => preset('free')}>Load free space</button>
      <button disabled={disabled} onClick={() => preset('barrier')}>Load scattering barrier</button>
      <button disabled={disabled} onClick={() => preset('well')}>Load attractive well</button>
    </div>}</SettingsPage>
  </>;
}
