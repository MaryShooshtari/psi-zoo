export type TerrariumViewMode = '2d' | '1d';
export const MIRROR_DURATION_MS = 450;

/** Presentation-only transition state. No world/controller/state-array/RNG
 * reference is accepted here. CSS interpolates from the current visible pose;
 * one cancellable timer bounds pointer suppression and the visual morph, even
 * under rapid reversal. The destination is live; outgoing pixels are decorative.
 */
export class TerrariumViewTransition {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  transitioning = false;
  constructor(public mode: TerrariumViewMode, private readonly changed: () => void) {}
  setMode(mode: TerrariumViewMode, reducedMotion: boolean): void {
    if (this.disposed) return;
    const different = mode !== this.mode;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.mode = mode;
    this.transitioning = different && !reducedMotion;
    if (this.transitioning) this.timer = setTimeout(() => this.finish(), MIRROR_DURATION_MS);
    this.changed();
  }
  finish(): void {
    if (this.disposed) return;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.transitioning = false;
    this.changed();
  }
  dispose(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.disposed = true;
  }
}
