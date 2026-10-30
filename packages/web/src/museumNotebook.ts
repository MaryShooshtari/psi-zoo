import { parseNotebook } from './Notebook';
import type { Topic } from './museumScience';
export const TOPICS: readonly Topic[] = ['probability', 'spreading', 'marginals', 'potentials', 'scattering', 'qubits', 'mean-field', 'entanglement', 'measurement', 'no-signalling'];
export function parseChapter(source: string) {
  const book = parseNotebook(source);
  const id = /^id: "([a-z-]+)"\r?$/m.exec(source)?.[1];
  const contexts = /^contexts: "([^"]+)"\r?$/m.exec(source)?.[1]?.split(',');
  if (!TOPICS.includes(id as Topic) || !contexts?.length) throw new Error('Chapter needs a known ID and contexts');
  if (book.sections.map(s => s.heading.trim()).join('|') !== 'Observe|Understand|Explore the mathematics') throw new Error('Chapter needs Observe / Understand / Explore the mathematics');
  return { ...book, id: id as Topic, contexts };
}
const bundled = import.meta.glob('./content/notebook/museum/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const parsedChapters = Object.values(bundled).map(parseChapter);
export const museumChapters = TOPICS.map(id => {
  const matches = parsedChapters.filter(c => c.id === id);
  if (matches.length !== 1) throw new Error(`Missing or duplicate chapter: ${id}`);
  return matches[0]!;
});
for (const source of Object.values(bundled)) for (const link of source.matchAll(/\]\(#([a-z-]+)\)/g)) if (!TOPICS.includes(link[1] as Topic)) throw new Error('Unknown chapter link: '+link[1]);
