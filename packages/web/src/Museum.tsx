import { useEffect, useRef } from 'react';
import { museumChapters, TOPICS } from './museumNotebook';
import { containDialogFocus } from './Notebook';
import { contextualScience, type MuseumScene, type Topic } from './museumScience';
import type { TerrariumViewMode } from './terrariumView';
export type MuseumPanel = { kind: 'help' } | { kind: 'notebook'; topic: Topic } | { kind: 'confirm' };
function Paragraph({ text, chapter }: { text: string; chapter: (topic: Topic) => void }) {
  return <p>{text.split(/(\[[^\]]+\]\((?:https:\/\/[^)]+|#[a-z-]+)\))/g).map((part, i) => {
    const link = /^\[([^\]]+)\]\((https:\/\/[^)]+|#[a-z-]+)\)$/.exec(part);
    if (!link) return part;
    return link[2]!.startsWith('#') ? <a key={i} href={link[2]} onClick={e => { e.preventDefault(); chapter(link[2]!.slice(1) as Topic); }}>{link[1]}</a>
      : <a key={i} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
  })}</p>;
}
export function MuseumDialog({ panel, scene, view, close, chapter, replay, start }: {
  panel: MuseumPanel; scene: MuseumScene | null; view: TerrariumViewMode; close: () => void;
  chapter: (id: Topic) => void; replay: () => void; start: (skip: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null), body = useRef<HTMLDivElement>(null);
  useEffect(() => { const d = dialog.current!; d.showModal(); return () => { if (d.open) d.close(); }; }, []);
  useEffect(() => { if (body.current) body.current.scrollTop = 0; heading.current?.focus(); }, [panel]);
  const current = panel.kind === 'notebook' ? museumChapters.find(c => c.id === panel.topic)! : null;
  return <dialog className={`museum-dialog ${panel.kind === 'notebook' ? '' : 'museum-compact'}`} ref={dialog} aria-labelledby="museum-title" onCancel={e => { e.preventDefault(); close(); }} onKeyDown={containDialogFocus}>
    <header className="museum-heading"><h2 id="museum-title" ref={heading} tabIndex={-1}>{current?.title ?? (panel.kind === 'confirm' ? 'Start a clean guided experiment?' : 'What am I seeing?')}</h2><button onClick={close}>Close science help</button></header>
    <div className="museum-body" ref={body}>
      {panel.kind === 'confirm' ? <section>
        <p>The guide replaces the active experiment, including its amplitudes, moods, measurements, terrain, time and playback. This browser has no scene save or undo. Cancel keeps your current scene unchanged.</p>
        <p>Start with one normalized creature in clean 2D. Finish or Skip also returns to that same deterministic, paused one-creature scene at time zero. Only the completion preference is stored locally.</p>
        <div className="controls"><button onClick={() => start(false)}>Replace scene and start guide</button><button onClick={() => start(true)}>Replace scene and skip guide</button><button onClick={close}>Cancel — keep my scene</button></div>
      </section> : panel.kind === 'help' ? <>
        <p className="plot-note">Based on the published experiment at time {scene?.snapshot.time.toFixed(2) ?? '—'}. Playback is not paused by reading; reopen for updated context.</p>
        {contextualScience(scene, view).map((card, i) => <section key={i}><h3>{card.title}</h3><p>{card.explanation}</p><button onClick={() => chapter(card.topic)}>Read chapter: {museumChapters.find(c => c.id === card.topic)!.title}</button></section>)}
        <div className="controls"><button onClick={() => chapter('probability')}>Open full physics notebook</button><button onClick={replay}>Replay three-step guide…</button></div>
      </> : <>
        <nav className="chapter-list" aria-label="Physics notebook chapters">{museumChapters.map(c => <button key={c.id} aria-current={current?.id === c.id ? 'page' : undefined} onClick={() => chapter(c.id)}>{c.title}</button>)}</nav>
        <p className="plot-note">Locally bundled Markdown and native MathML: no service or downloaded equation fonts. Proof links concern specific exact models, not formal verification of the TypeScript or the entire game.</p>
        <article>{current!.sections.map((s, index) => {
          const blocks = s.blocks.map((b, i) => b.kind === 'math' ? <div key={i} className="notebook-equation" dangerouslySetInnerHTML={{ __html: b.text }} /> : <Paragraph key={i} text={b.text} chapter={chapter} />);
          return index === 0 ? <section key={s.heading}><h3>{s.heading}</h3>{blocks}</section> : <details key={`${current!.id}-${s.heading}`} open={index === 1}><summary>{s.heading}</summary>{blocks}</details>;
        })}</article>
        <p><button onClick={replay}>Replay guide (confirmation required)…</button></p>
      </>}
    </div>
  </dialog>;
}
export function NotebookLauncher({ open }: { open: (id: Topic) => void }) {
  return <section aria-label="Complete physics notebook"><h3>Observe → Understand → Explore the mathematics</h3><p>Begin with what you can try, then follow the explanations, equations, assumptions and specific proof sources.</p><div className="chapter-list">{TOPICS.map(id => <button key={id} onClick={() => open(id)}>{museumChapters.find(c => c.id === id)!.title}</button>)}</div></section>;
}
export function GuideCard({ step, ready, view, setStep, finish, paint, canPaint }: {
  step: number; ready: boolean; view: TerrariumViewMode; setStep: (n: number) => void; finish: () => void; paint: () => void; canPaint: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const titles = ['Watch the cloud spread', 'See its quantum shadow', 'Shape the landscape'];
  const target = step === 1 ? (view === '2d' ? 'play' : 'return') : step === 2 ? 'shadow' : view === '1d' ? 'return' : 'menu';
  return <section className="guide-panel" data-target={target} aria-label="First-visit guide">
    <ol aria-label="Guide progress">{titles.map((title, i) => <li key={title} aria-current={step === i + 1 ? 'step' : undefined}>{i + 1}. {title}</li>)}</ol>
    <h2 ref={heading} tabIndex={-1}>Step {step} of 3 · {titles[step - 1]}</h2>
    {step === 1 ? <p>In 2D, activate Play. Watch the actual cloud widen: brighter density means more position probability per unit area. Its total probability stays near one. Next unlocks after a real Play action and at least 20% growth in a computed width, not elapsed wall time.</p>
      : step === 2 ? <p>Activate the top-left 1D view. The mirror reveals probability summed along y: a quantum shadow of this same 2D world, not a physical conversion to a one-dimensional system. Reduced motion uses an immediate view change.</p>
      : <><p>Use 2D view to return. Open the top-right Menu → Terrain, choose Barrier (+), then drag a short stroke in the cloud's field. You are changing potential energy in the Hamiltonian—the rule for subsequent evolution—not measuring or moving probability.</p><button disabled={!canPaint} onClick={paint}>Paint a short central barrier (keyboard alternative)</button><p className="plot-note">This explicit action applies the same positive brush at five nearby points. It unlocks after you choose Barrier (+) in clean 2D; it never runs automatically.</p></>}
    <p role="status">{ready ? 'Interaction observed. You can continue.' : 'Waiting for your interaction with the simulation.'}</p>
    <div className="controls">{step > 1 && <button onClick={() => setStep(step - 1)}>Back</button>}{step < 3 ? <button disabled={!ready} onClick={() => setStep(step + 1)}>Next</button> : <button disabled={!ready} onClick={finish}>Finish guide</button>}<button onClick={finish}>Skip guide</button></div>
    <p className="plot-note">Finish or Skip restores one initial creature, clean terrain, 2D and time zero.</p>
  </section>;
}
