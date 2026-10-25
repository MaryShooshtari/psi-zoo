import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Notebook, ObservationExample, observerNotebook, parseNotebook } from './Notebook';
import App from './App';

const observation = { index: 150, position: -5, resolution: 0.4, probability: 0.037125, time: 1.25 };

describe('Born-rule notebook content and view', () => {
  it('loads bundled frontmatter and progressive sections from the actual Markdown entry', () => {
    expect(observerNotebook.title).toBe('The Observer — Why does the wavefunction collapse?');
    expect(observerNotebook.sections.map(s => s.heading)).toEqual([
      'Start with what you saw', 'The mathematics of this detector',
      'Why it evolves again — and why energy can jump', 'What Lean proves — and what it does not',
    ]);
    const html = renderToStaticMarkup(<Notebook observation={null} onClose={() => {}} />);
    expect(html).toContain('Close notebook');
    expect(html).toContain('Playback is paused for reading');
    expect(html.match(/<details>/g)).toHaveLength(3);
    expect(html).toContain('No observation yet');
    expect(html).toContain('not a moving particle');
    expect(html).toContain('posterior need not be Gaussian');
    expect(html).toContain('not a completed companion proof');
  });

  it('emits native MathML, not escaped markup, with accessible labels and balanced equation roots', () => {
    const html = renderToStaticMarkup(<Notebook observation={null} onClose={() => {}} />);
    const equations = observerNotebook.sections.flatMap(s => s.blocks).filter(b => b.kind === 'math');
    expect(equations).toHaveLength(6);
    expect(html.match(/<math /g)).toHaveLength(6);
    expect(html.match(/<\/math>/g)).toHaveLength(6);
    expect(html).not.toContain('&lt;math');
    for (const equation of equations) {
      expect(equation.text).toContain('xmlns="http://www.w3.org/1998/Math/MathML"');
      expect(equation.text).toContain('aria-label=');
      expect(equation.text).not.toMatch(/<script|on\w+=/);
    }
    expect(html).toContain('<mfrac>'); expect(html).toContain('<msqrt>');
  });

  it('distinguishes live example masses from densities and does not substitute them into general equations', () => {
    const html = renderToStaticMarkup(<ObservationExample observation={observation} />);
    expect(html).toContain('example, not a general equation');
    expect(html).toContain('1.25'); expect(html).toContain('−5.00'.replace('−', '-'));
    expect(html).toContain('0.4'); expect(html).toContain('0.03712');
    expect(html).toContain('not a probability density');
    const full = renderToStaticMarkup(<Notebook observation={observation} onClose={() => {}} />);
    expect(full).toContain('psi prime i equals');
    expect(full).toContain('94a75c8f71448482434f9d76a667c53cf4d8853e/PsiZooProofs/CoordinateProjection.lean');
  });

  it('exposes a notebook dialog action next to observation controls without rendering side effects', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Why did it jump?');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Observe particle');
    expect(html).not.toContain('<dialog');
    expect(html).toContain('No position observed yet');
  });

  it('rejects missing metadata or malformed equation blocks', () => {
    expect(() => parseNotebook('## Missing title')).toThrow(/title/);
    expect(() => parseNotebook('---\ntitle: "test"\n---\n## Math\n\n<math display="block">')).toThrow(/equation/);
  });
});
