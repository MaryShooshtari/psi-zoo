import { SettingsPage, useSettingsNavigation } from './TerrariumShell';
import type { TerrainPointerSettings } from './terrainBrush';
import type { TerrainPreset2D } from './terrainPresets';
export interface TerrainDisplaySettings extends TerrainPointerSettings { overlay: boolean; opacity: number }
export function terrainInstruction(tool: TerrainPointerSettings['tool']): string {
  return { view: 'Inspect selects creatures without editing.', barrier: 'Drag on the playground to draw a barrier.', well: 'Drag on the playground to draw a well.', erase: 'Drag on the playground to erase terrain.' }[tool];
}
export const DEFAULT_TERRAIN_SETTINGS: TerrainDisplaySettings = { tool: 'view', sigma: 0.7, amplitude: 2, overlay: true, opacity: 0.6 };
export function TerrainControls({ settings: s, disabled, change, clear, preset, canPaint = true, focusCanvas }: {
  settings: TerrainDisplaySettings; disabled: boolean;
  change: (next: TerrainDisplaySettings) => void; clear: () => void; preset?: (p: TerrainPreset2D) => void;
  canPaint?: boolean; focusCanvas?: () => HTMLElement | null;
}) {
  const navigation = useSettingsNavigation();
  return <>
    <SettingsPage section="Terrain"><fieldset className="brush-controls terrain-tools" disabled={disabled}>
      <legend>Shape the environment</legend>
      {(['view', 'barrier', 'well', 'erase'] as const).map(tool => <label key={tool} className="painting-toggle">
        <input type="radio" name="terrain-tool" value={tool} checked={s.tool === tool} disabled={tool !== 'view' && !canPaint}
          onClick={() => { if (tool === s.tool && focusCanvas) navigation?.closeAndHandoff(focusCanvas); }}
          onChange={() => { change({ ...s, tool }); if (focusCanvas) navigation?.closeAndHandoff(focusCanvas); }} />
        {{ view: 'Inspect', barrier: 'Barrier', well: 'Well', erase: 'Eraser' }[tool]}</label>)}
      {!canPaint && <p>Switch to 2D view to draw terrain.</p>}
      <label>Brush size · {s.sigma.toFixed(1)}
        <input aria-label="2D brush radius" type="range" min="0.2" max="2" step="0.1" value={s.sigma}
          onChange={e => change({ ...s, sigma: e.currentTarget.valueAsNumber })} /></label>
      <label>Strength · {s.amplitude.toFixed(1)}
        <input aria-label="2D brush strength" type="range" min="0.2" max="10" step="0.2" value={s.amplitude} disabled={s.tool === 'erase'}
          onChange={e => change({ ...s, amplitude: e.currentTarget.valueAsNumber })} /></label>
      <button onClick={clear}>Clear terrain</button>
      {s.tool !== 'view' && <p role="status">{terrainInstruction(s.tool)}</p>}
    </fieldset></SettingsPage>
    <SettingsPage section="Display"><fieldset className="brush-controls" disabled={disabled}>
      <legend>Potential overlay · independent of density brightness</legend>
      <label className="painting-toggle"><input type="checkbox" aria-label="Show potential overlay" checked={s.overlay} onChange={e => change({ ...s, overlay: e.currentTarget.checked })} /> Show potential</label>
      <label>Overlay opacity {s.opacity.toFixed(2)}<input aria-label="Potential overlay opacity" type="range" min="0" max="1" step="0.05" value={s.opacity}
        disabled={!s.overlay} onChange={e => change({ ...s, opacity: e.currentTarget.valueAsNumber })} /></label>
      <span><strong className="positive-potential">Warm: +V barriers</strong> · <strong className="negative-potential">Blue: −V wells</strong> · zero transparent · scale −20 to +20 energy</span>
    </fieldset></SettingsPage>
    <SettingsPage section="Advanced">{preset && <div className="controls" aria-label="2D experiment presets">
      <button disabled={disabled} onClick={() => preset('free')}>Load free space</button>
      <button disabled={disabled} onClick={() => preset('barrier')}>Load scattering barrier</button>
      <button disabled={disabled} onClick={() => preset('well')}>Load attractive well</button>
    </div>}</SettingsPage>
  </>;
}
