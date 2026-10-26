import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreatureInspector } from './CreatureInspector';

it('labels selected physical observables and the Bloch projection without personality claims', () => {
  const inspection = { position: -1.25, norm: 1, moodNorm: 1, bloch: { x: 0.6, y: 0, z: 0.8 } };
  const a = renderToStaticMarkup(<CreatureInspector selected="a" inspection={inspection} onSelect={() => {}} />);
  const b = renderToStaticMarkup(<CreatureInspector selected="b" inspection={{ ...inspection, position: 2 }} onSelect={() => {}} />);
  expect(a).toContain('Creature A'); expect(b).toContain('Creature B');
  expect(a).toContain('-1.2500'); expect(b).toContain('2.0000');
  expect(a).toContain('0.6000'); expect(a).toContain('Mood norm');
  expect(a).toContain('Bloch x–z projection'); expect(a).toContain('<svg');
  expect(a).toContain('not personality');
});
