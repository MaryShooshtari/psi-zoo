import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SimulationPlayback2D } from './simulation2d';
import { DEFAULT_TERRAIN_SETTINGS } from './TerrainControls';
import { guideWasCompleted, rememberGuideCompletion, GUIDE_PREFERENCE, hasObservedSpreading, prepareMuseumScene, paintGuideBarrier, qualifyingBarrierStroke } from './museumGuide';
import { contextualScience, type MuseumScene } from './museumScience';
import { museumChapters, parseChapter, TOPICS } from './museumNotebook';
import { MuseumDialog, GuideCard } from './Museum';
import { parseNotebook } from './Notebook';
const make = () => new SimulationPlayback2D({ request: () => 1, cancel: () => {} }, () => {}, { worldPreset: 'independent', grid: { nx: 31, ny: 25 } });
const scene = (c: SimulationPlayback2D, knownGaussian = true): MuseumScene => ({ kind: '2d', snapshot: c.snapshot(), knownGaussian, uneditedPreset: false });
describe('museum guide and bundled science', () => {
  it('requires a visitor Play and actual committed width evolution, never time alone', () => {
    const c = make(); prepareMuseumScene(c); const initial = c.snapshot();
    expect(hasObservedSpreading(true, initial, initial)).toBe(false);
    expect(hasObservedSpreading(true, initial, { ...initial, time: 100 })).toBe(false);
    expect(hasObservedSpreading(true, initial, { ...initial, time: .1, sigmaX: initial.sigmaX * 1.01 })).toBe(false);
    const terrain = c.potential; for (let k = 0; k < 120; k++) c.world!.step(terrain, 1 / 120); const evolved = c.snapshot();
    expect(hasObservedSpreading(false, initial, evolved)).toBe(false);
    expect(hasObservedSpreading(true, initial, evolved)).toBe(true);
    expect(hasObservedSpreading(true, null, evolved)).toBe(false);
  });
  it('validates real short positive strokes rather than a timer or a click', () => {
    expect(qualifyingBarrierStroke(20, 0, 2, 2)).toBe(true);
    for (const args of [[0, 0, 2, 2], [20, 2, 2, 2], [20, 0, 2, 0]]) expect(qualifyingBarrierStroke(...args as [number, number, number, number])).toBe(false);
  });
  it('prepares bit-identical normalized one-creature scenes from the existing preset', () => {
    const a = make(), b = make(); prepareMuseumScene(a); prepareMuseumScene(b);
    expect(a.world!.ids).toEqual(['a']); expect(a.snapshot().norm).toBeCloseTo(1, 13);
    expect(a.world!.spatialState('a').values).toEqual(b.world!.spatialState('a').values);
    expect(a.world!.getSnapshot()).toEqual(b.world!.getSnapshot());
    expect(a.snapshot().time).toBe(0); expect(a.snapshot().playing).toBe(false); expect(a.snapshot().potentialL1).toBe(0);
  });
  it('keyboard alternative is an explicit real potential edit, never a spatial/mood measurement', () => {
    const c = make(); prepareMuseumScene(c); const before = c.world!.getSnapshot(), psi = c.world!.spatialState('a').values;
    paintGuideBarrier(c, DEFAULT_TERRAIN_SETTINGS); expect(c.terrainRevision).toBe(0);
    paintGuideBarrier(c, { ...DEFAULT_TERRAIN_SETTINGS, tool: 'barrier' });
    expect(c.snapshot().potentialMax).toBeGreaterThan(0); expect(c.world!.spatialState('a').values).toEqual(psi); expect(c.world!.getSnapshot()).toEqual(before);
  });
  it('stores only a minimal preference and tolerates blocked or unavailable storage', () => {
    const data = new Map<string, string>();
    try {
      vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k), setItem: (k: string, v: string) => data.set(k, v) });
      expect(guideWasCompleted()).toBe(false); rememberGuideCompletion(); expect(guideWasCompleted()).toBe(true);
      expect([...data]).toEqual([[GUIDE_PREFERENCE, 'done']]);
      vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
      expect(guideWasCompleted()).toBe(false); expect(rememberGuideCompletion).not.toThrow();
      vi.stubGlobal('localStorage', undefined); expect(guideWasCompleted()).toBe(false); expect(rememberGuideCompletion).not.toThrow();
    } finally { vi.unstubAllGlobals(); }
  });
  it('loads all ten chapters with contexts and the complete three-level educational structure', () => {
    expect(museumChapters.map(c => c.id)).toEqual(TOPICS);
    for (const c of museumChapters) { expect(c.contexts.length).toBeGreaterThan(0); expect(c.sections.map(s => s.heading)).toEqual(['Observe', 'Understand', 'Explore the mathematics']); expect(c.sections.every(s => s.blocks.length > 0)).toBe(true); }
    const crlf = '---\r\nid: "probability"\r\ntitle: "Test"\r\ncontexts: "density"\r\n---\r\n## Observe\r\n\r\nTry.\r\n## Understand\r\n\r\nLearn.\r\n## Explore the mathematics\r\n\r\nCompute.';
    expect(parseChapter(crlf).id).toBe('probability'); expect(() => parseChapter(crlf.replace('probability', 'unknown'))).toThrow();
  });
  it('emits native accessible mathematical notation and exposes advanced detail and chapter links', () => {
    const html = renderToStaticMarkup(<MuseumDialog panel={{ kind: 'notebook', topic: 'marginals' }} scene={null} view="1d" close={() => {}} chapter={() => {}} replay={() => {}} start={() => {}} />);
    expect(html).toContain('<math '); expect(html).toContain('aria-label="rho x'); expect(html).toContain('<msup>'); expect(html).not.toContain('&lt;math');
    expect(html).toContain('not an exact effective 1D Hamiltonian'); expect(html).toContain('href="#potentials"'); expect(html).toContain('Explore the mathematics');
  });
  it('rejects malformed or active equation markup', () => {
    const base = '---\ntitle: "Test"\n---\n## Math\n\n';
    expect(() => parseNotebook(base+'<math aria-label="bad"><script>x</script></math>')).toThrow();
    expect(() => parseNotebook(base+'<math xmlns="http://www.w3.org/1998/Math/MathML" aria-label="bad" onclick="x"></math>')).toThrow();
  });
  it('recognizes known free spreading and never guesses Gaussian history from empty terrain alone', () => {
    const c = make(); prepareMuseumScene(c);
    expect(contextualScience(scene(c), '2d').some(c => c.topic === 'spreading')).toBe(true);
    expect(contextualScience(scene(c, false), '2d').some(c => c.topic === 'spreading')).toBe(false);
    expect(contextualScience(scene(c), '1d')[0]!.topic).toBe('marginals');
  });
  it('reports signed terrain without inferring tunnelling from an arbitrary shape', () => {
    const c = make(); c.stamp(0, 0, { tool: 'barrier', amplitude: 2, sigma: .7 }); c.stamp(3, 0, { tool: 'well', amplitude: 2, sigma: .7 });
    const cards = contextualScience(scene(c), '2d'); expect(cards.filter(c => c.topic === 'potentials')).toHaveLength(2); expect(cards.some(c => c.topic === 'scattering')).toBe(false);
  });
  it('maps independent spatial states, mean-field, mixed pairs, recorded measurement and release honestly', () => {
    const c = make(), w = c.world!; w.setInteractions({ drives: true, social: true });
    expect(contextualScience(scene(c), '2d').some(c => c.topic === 'mean-field')).toBe(true);
    w.prepareBellPair('p', 'a', 'b'); let cards = contextualScience(scene(c), '2d'); expect(cards.some(c => c.topic === 'entanglement')).toBe(true); expect(cards.some(c => c.explanation.includes('0.5000'))).toBe(true);
    w.measureMood('p', 'a', 'X'); cards = contextualScience(scene(c), '2d'); expect(cards.some(c => c.topic === 'measurement')).toBe(true);
    w.measureAndRelease('p', 'X'); cards = contextualScience(scene(c), '2d'); expect(cards.some(c => c.title.includes('Release'))).toBe(true); expect(cards.some(c => c.topic === 'entanglement')).toBe(false);
  });
  it('requires unedited known preset provenance for the precise scattering context', () => {
    const c = new SimulationPlayback2D({ request: () => 1, cancel: () => {} }, () => {}); c.loadPreset('barrier');
    const s = scene(c); expect(contextualScience(s, '2d').some(c => c.topic === 'scattering')).toBe(false);
    expect(contextualScience({ ...s, uneditedPreset: true } as MuseumScene, '2d').some(c => c.topic === 'scattering')).toBe(true);
  });
  it('discloses destructive replay and keeps guide actions gated and explicit', () => {
    const html = renderToStaticMarkup(<MuseumDialog panel={{ kind: 'confirm' }} scene={null} view="2d" close={() => {}} chapter={() => {}} replay={() => {}} start={() => {}} />);
    expect(html).toContain('no scene save or undo'); expect(html).toContain('Cancel — keep my scene');
    const guide = renderToStaticMarkup(<GuideCard step={1} ready={false} view="2d" setStep={() => {}} finish={() => {}} paint={() => {}} canPaint={false} />);
    expect(guide).toContain('disabled="">Next'); expect(guide).toContain('Skip guide'); expect(guide).toContain('aria-current="step"');
  });
});
