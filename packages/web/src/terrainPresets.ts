import { verticalBarrier2D, gaussianWell2D, type Gaussian2DOptions, type PsiGrid2D } from '@psi-zoo/sim-core';
export type TerrainPreset2D = 'free' | 'barrier' | 'well';
export const BARRIER_2D = { height: 6, left: -0.4, right: 0.4, smoothing: 0.22 } as const;
/** Reproducible experiment replacement, independent of the integrator and DOM.
 * Barrier spans all y. Outgoing density is scattering evidence, not a calibrated
 * sub-barrier transmission coefficient (the packet has an above-barrier tail).
 */
export function createTerrainPreset2D(g: PsiGrid2D, preset: TerrainPreset2D): { potential: Float64Array; gaussian: Gaussian2DOptions; description: string } {
  switch (preset) {
    case 'free': return { potential: new Float64Array(g.nx * g.ny), gaussian: {}, description: 'Free: center (0,0), σ=(0.8,0.8), p=(0,0).' };
    case 'barrier': return { potential: verticalBarrier2D(g, BARRIER_2D.height, BARRIER_2D.left, BARRIER_2D.right, BARRIER_2D.smoothing),
      gaussian: { x0: -4, y0: 0, sigmaX: 0.8, sigmaY: 1, px: 3, py: 0 },
      description: 'Scattering: center (−4,0), σ=(0.8,1), p=(3,0). Full-height barrier: Vb=6, x edges ±0.4, tanh smoothing 0.22. Inspect around t=2.4; outgoing density is not a calibrated tunnelling fraction.' };
    case 'well': return { potential: gaussianWell2D(g, 5, 0, 0, 1.5), gaussian: { x0: -2, sigmaX: 0.8, sigmaY: 0.8, px: 0.7 },
      description: 'Well: depth 5, center (0,0), width 1.5. Packet center (−2,0), σ=(0.8,0.8), p=(0.7,0). Attraction changes the dynamics; this is not preparation of a single bound eigenstate.' };
    default: throw new RangeError('Unknown 2D preset');
  }
}
