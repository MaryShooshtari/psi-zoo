import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { Observation } from './simulation';
import source from './content/notebook/observer.md?raw';

/** Small authored-content format: flat frontmatter, ## sections, paragraphs,
 * HTTPS links and native MathML blocks. Not a general Markdown/HTML renderer.
 * Only bundled, trusted content is accepted; never use this for user input.
 */
export function parseNotebook(markdown: string) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  const title = frontmatter?.[1]?.match(/^title: "(.+)"\r?$/m)?.[1];
  if (!frontmatter || !title) throw new Error('Notebook needs a quoted title in frontmatter');
  const sections = markdown.slice(frontmatter[0].length).trim().split(/^## /m).filter(Boolean).map(section => {
    const [heading, ...lines] = section.split('\n');
    const blocks = lines.join('\n').trim().split(/\r?\n\s*\r?\n/).map(text => {
      if (text.startsWith('<math ')) {
        if (!text.endsWith('</math>') || !text.includes('aria-label=') || !text.includes('xmlns="http://www.w3.org/1998/Math/MathML"') || (text.match(/<math\b/g)?.length !== 1) || /on\w+\s*=|<(?:script|style|iframe|foreignObject)\b|(?:href|src)\s*=/i.test(text)) throw new Error('Malformed notebook equation');
        return { kind: 'math' as const, text };
      }
      return { kind: 'paragraph' as const, text };
    });
    return { heading: heading!.trim(), blocks };
  });
  return { title, sections };
}

export const observerNotebook = parseNotebook(source);

function Paragraph({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\(https:\/\/[^)]+\))/g);
  return <p>{parts.map((part, i) => {
    const link = /^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/.exec(part);
    return link ? <a key={i} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a> : part;
  })}</p>;
}

export function ObservationExample({ observation }: { observation: Observation | null }) {
  return <aside className="notebook-example" aria-label="Your last observation">
    <strong>Your last observation · example, not a general equation</strong>
    {observation ? <p>At t = {observation.time.toFixed(2)}, the detector reported x = {observation.position.toFixed(2)} with
      response σ = {observation.resolution.toFixed(1)}. Its discrete outcome probability P(j) was{' '}
      {observation.probability.toPrecision(4)}. This is not a probability density. The marker records this past result.</p>
      : <p>No observation yet. Close the notebook, select Observe, and measure the packet to create an example.</p>}
  </aside>;
}

export function containDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
  const first = controls[0], last = controls[controls.length - 1], active = document.activeElement;
  if (event.shiftKey && (active === first || !controls.includes(active as HTMLElement))) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && (active === last || !controls.includes(active as HTMLElement))) { event.preventDefault(); first?.focus(); }
}

export function Notebook({ observation, onClose }: { observation: Observation | null; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  return <dialog id="observer-notebook" className="notebook" ref={dialog} onClose={onClose}
    aria-labelledby="notebook-title" aria-describedby="notebook-playback-help" onKeyDown={containDialogFocus}>
    <div className="notebook-heading">
      <h2 id="notebook-title">{observerNotebook.title}</h2>
      <button autoFocus onClick={() => dialog.current?.close()}>Close notebook</button>
    </div>
    <p id="notebook-playback-help" className="plot-note">Playback is paused for reading. Close with the button or Escape, then use Play to resume.</p>
    <ObservationExample observation={observation} />
    <article>
      {observerNotebook.sections.map((section, index) => {
        const blocks = section.blocks.map((block, i) => block.kind === 'math'
          ? <div key={i} className="notebook-equation" dangerouslySetInnerHTML={{ __html: block.text }} />
          : <Paragraph key={i} text={block.text} />);
        return index === 0 ? <section key={section.heading}><h3>{section.heading}</h3>{blocks}</section>
          : <details key={section.heading}><summary>{section.heading}</summary>{blocks}</details>;
      })}
    </article>
  </dialog>;
}
