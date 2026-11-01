/** Closed <details> descendants can retain client rects in browsers. Exclude
 * them from focus traps without excluding the closed disclosure's own summary. */
export function visibleControl(element: HTMLElement): boolean {
  if (!element.getClientRects().length || getComputedStyle(element).visibility !== 'visible') return false;
  let closed = element.closest<HTMLDetailsElement>('details:not([open])');
  while (closed) {
    if (!closed.querySelector(':scope > summary')?.contains(element)) return false;
    closed = closed.parentElement?.closest<HTMLDetailsElement>('details:not([open])') ?? null;
  }
  return true;
}
