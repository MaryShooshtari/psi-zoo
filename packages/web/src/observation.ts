import type { PotentialGrid } from '@psi-zoo/sim-core';
import { pointerToPosition } from './painting';

interface ObservationOptions {
  enabled(): boolean;
  grid(): PotentialGrid;
  viewport(): { width: number; height: number };
  observe(): void;
  onError(error: unknown): void;
}

/** Listen only to click, not both pointerdown and click. Browser-synthesized
 * mouse/touch/pen clicks therefore trigger once. Coordinates are hit testing
 * only, never an outcome request. Keyboard users have a native Observe button.
 */
export function bindObservation(
  canvas: EventTarget & Pick<HTMLCanvasElement, 'getBoundingClientRect'>,
  options: ObservationOptions,
): { dispose(): void } {
  const click: EventListener = event => {
    const input = event as MouseEvent;
    // Chrome's synthesized click PointerEvent can have isPrimary=false even
    // for its primary mouse. That field filters pointerdown, not click events.
    if (!options.enabled() || input.button !== 0) return;
    try {
      const hit = pointerToPosition(input.clientX, input.clientY, canvas.getBoundingClientRect(),
        options.viewport(), options.grid(), true);
      if (hit === null) return;
      event.preventDefault();
      options.observe();
    } catch (error) { options.onError(error); }
  };
  canvas.addEventListener('click', click);
  return { dispose: () => canvas.removeEventListener('click', click) };
}
