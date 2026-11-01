import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LEARNING_STEPS, learningObservation } from './learningPath';
import { LearningJourney } from './LearningJourney';
import { MuseumDialog } from './Museum';
import { SimulationPlayback2D } from './simulation2d';
import type { MuseumScene } from './museumScience';
import { museumChapters } from './museumNotebook';
import { TerrainControls, DEFAULT_TERRAIN_SETTINGS, terrainInstruction } from './TerrainControls';
import { WorldControls2D } from './WorldControls2D';
const noop = () => {};
const make = () => new SimulationPlayback2D({ request: () => 1, cancel: noop }, noop, { worldPreset: 'independent', grid: { nx: 31, ny: 25 } });
const scene = (c: SimulationPlayback2D): MuseumScene => ({ kind: '2d', snapshot: c.snapshot(), knownGaussian: false, uneditedPreset: false });
describe('seven-step learning path', () => {
  it('has the requested progression, linked to existing deeper chapters', () => {
    expect(LEARNING_STEPS.map(s => s.topic)).toEqual(['probability', 'spreading', 'measurement', 'scattering', 'mean-field', 'qubits', 'entanglement']);
    for (const s of LEARNING_STEPS) expect(museumChapters.some(c => c.id === s.topic)).toBe(true);
  });
  it('renders every learning level, progress, bounded navigation and Exit without gating on timers', () => {
    for (let step = 0; step < 7; step++) {
      const html = renderToStaticMarkup(<LearningJourney step={step} scene={null} baseline={null} move={noop} exit={noop} tryAction={noop} openChapter={noop} />);
      for (const level of ['What you are seeing', 'Try this', 'What happened?', 'Learn more']) expect(html).toContain(level);
      expect(html).toContain(`Step ${step + 1} of 7`); expect(html).toContain('aria-label="Exit learning path"');
      expect(html).toContain(step === 6 ? '>Finish</button>' : '>Next</button>');
      if (step === 0) expect(html).toContain('disabled="">Back');
      expect(html).toContain('tabindex="-1"'); expect(html).toContain('aria-label="Learning path progress"');
    }
  });
  it('offers non-destructive learning and contextual help independently', () => {
    const html = renderToStaticMarkup(<MuseumDialog panel={{ kind: 'help' }} scene={null} view="2d" close={noop} chapter={noop} replay={noop} start={noop} learn={noop} />);
    expect(html).toContain('Start learning path'); expect(html).toContain('Help with the current scene');
    expect(html).toContain('entry, Back, Next and Exit never reset'); expect(html).toContain('Legacy three-step demonstration');
    expect(html).toContain('Open full physics notebook');
  });
  it('never treats elapsed wall time, a Try click or a painted patch as proof of physics', () => {
    const c = make(), baseline = scene(c);
    expect(learningObservation(1, baseline, baseline)).toContain('No later evolution');
    expect(learningObservation(2, baseline, baseline)).toContain('No new position result');
    expect(learningObservation(3, baseline, baseline)).toContain('No positive barrier');
    c.stamp(0, 0, { tool: 'barrier', sigma: .7, amplitude: 2 });
    expect(learningObservation(3, scene(c), baseline)).toContain('not automatically proof of tunnelling');
    expect(LEARNING_STEPS[3]!.seeing).toContain('above-barrier transmission is not');
  });
  it('reads actual evolution and finite-resolution action receipts', () => {
    const c = make(), baseline = scene(c);
    for (let i = 0; i < 20; i++) c.world!.step(c.potential, 1 / 120);
    expect(learningObservation(1, scene(c), baseline)).toMatch(/width|evolved/);
    c.world!.measureSpatial('a', 'x', .4);
    expect(learningObservation(2, scene(c), baseline)).toContain('new x-only Gaussian detector result');
    expect(learningObservation(2, scene(c), baseline)).toContain('historical');
    expect(LEARNING_STEPS[2]!.seeing).toContain('not a perfect position eigenstate projection');
  });
  it('distinguishes joint mood entanglement from registration and records, never spatial entanglement or signalling', () => {
    const c = make(), baseline = scene(c);
    expect(learningObservation(6, baseline, baseline)).toContain('No shared mood pair');
    c.world!.prepareBellPair('p', 'a', 'b');
    expect(learningObservation(6, scene(c), baseline)).toContain('currently entangled');
    c.world!.measureMood('p', 'a', 'Z');
    expect(learningObservation(6, scene(c), baseline)).toContain('not a message');
    const after = scene(c);
    expect(learningObservation(6, after, after)).toContain('registration alone');
    expect(learningObservation(4, after, baseline)).toContain('independent spatial');
    expect(LEARNING_STEPS[5]!.seeing).toContain('not a literal emotion');
  });
  it('interpretation and rendering do not mutate amplitudes, terrain, moods, time, RNG counters or records', () => {
    const c = make(); c.world!.prepareBellPair('p', 'a', 'b');
    const snapshot = c.world!.getSnapshot(), states = c.world!.ids.map(id => c.world!.spatialState(id).values), terrain = c.potential.slice();
    const s = scene(c);
    for (let i = 0; i < 7; i++) {
      learningObservation(i, s, s);
      renderToStaticMarkup(<LearningJourney step={i} scene={s} baseline={s} move={noop} exit={noop} tryAction={noop} openChapter={noop} />);
    }
    expect(c.world!.getSnapshot()).toEqual(snapshot); expect(c.potential).toEqual(terrain);
    c.world!.ids.forEach((id, i) => expect(c.world!.spatialState(id).values).toEqual(states[i]));
  });
  it('handles absent and legacy scenes without fabricating current-world observations', () => {
    expect(learningObservation(0, null, null)).toContain('Waiting');
    const c = new SimulationPlayback2D({ request: () => 1, cancel: noop }, noop);
    expect(learningObservation(0, scene(c), null)).toContain('separate legacy');
  });
});
describe('focused menu organization', () => {
  it('has only four direct terrain tools, adjustable brush settings and no drawing shortcut', () => {
    const html = renderToStaticMarkup(<TerrainControls settings={DEFAULT_TERRAIN_SETTINGS} disabled={false} change={noop} clear={noop} />);
    for (const tool of ['Inspect', 'Barrier', 'Well', 'Eraser']) expect(html).toContain(tool);
    expect(html.match(/type="radio"/g)).toHaveLength(4);
    expect(html).toContain('Brush size'); expect(html).toContain('Strength'); expect(html).toContain('Clear terrain');
    expect(html).not.toContain('Draw terrain'); expect(html).not.toContain('Paint on canvas');
    expect(terrainInstruction('barrier')).toBe('Drag on the playground to draw a barrier.');
    expect(terrainInstruction('well')).toContain('draw a well'); expect(terrainInstruction('erase')).toContain('erase terrain');
  });
  it('keeps Hamiltonian settings and scene-replacing world presets under collapsed Advanced simulation settings', () => {
    const c = make();
    const html = renderToStaticMarkup(<WorldControls2D snapshot={c.world!.getSnapshot()} selectedOnly={false} disabled={false} changeView={noop} select={noop} add={noop} remove={noop} interactions={noop} preset={noop} />);
    expect(html).toContain('<details class="advanced-simulation"><summary>Advanced simulation settings</summary>');
    expect(html).toContain('Approximate interactions'); expect(html).toContain('Replace the creature setup…');
    expect(html).toContain('Your painted terrain is preserved');
  });
});
