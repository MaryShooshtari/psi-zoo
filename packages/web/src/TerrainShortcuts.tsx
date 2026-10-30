import { useSettingsNavigation } from './TerrariumShell';
/** Choose an existing tool; do not stamp, start playback or sample anything. */
export function TerrainShortcuts({ barrier, well }: { barrier: () => void; well: () => void }) {
  const navigation = useSettingsNavigation();
  return <div className="controls" aria-label="Terrain activities">
    <button onClick={() => { barrier(); navigation?.navigate('Terrain'); }}>Create a barrier</button>
    <button onClick={() => { well(); navigation?.navigate('Terrain'); }}>Build a well</button>
  </div>;
}
