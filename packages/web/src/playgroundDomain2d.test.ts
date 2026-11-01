import { expect, it } from 'vitest';
import { CayleyStepper2D, createPsiGrid2D, initializeGaussian2D, normSquared2D, positionMoments2D,
  energyExpectation2D, projectDensityX, measurePosition2D, stampPotential2D } from '@psi-zoo/sim-core';
import { playgroundGrid2D, PLAYGROUND_SPACING_2D } from './playgroundDomain2d';
import { canvasToPhysical2D, densityViewport2D, physicalToCanvas2D } from './render/density2d';

it('uses the actual viewport aspect with unchanged sample spacing and a bounded cell budget', () => {
  for (const [width,height] of [[1366,640],[1920,920],[390,610],[512,180]]) {
    const g = createPsiGrid2D(playgroundGrid2D(width!,height!));
    expect(g.dx).toBeCloseTo(PLAYGROUND_SPACING_2D,14); expect(g.dy).toBeCloseTo(g.dx,14);
    expect(g.nx*g.ny).toBeLessThan(16800); expect(g.nx*g.ny).toBeGreaterThan(15800);
    const v = densityViewport2D(g,width!,height!);
    expect(v.width/width!).toBeGreaterThan(.985); expect(v.height/height!).toBeGreaterThan(.985);
    if (width!>height!) { expect(g.xmax).toBeGreaterThan(10); expect(g.ymax).toBeLessThan(10); }
  }
  expect(playgroundGrid2D(600,600)).toEqual({nx:128,ny:128,xmin:-10,xmax:10,ymin:-10,ymax:10});
  expect(() => playgroundGrid2D(0,600)).toThrow(); expect(() => playgroundGrid2D(Infinity,600)).toThrow();
});

it('maps terrain and detector coordinates into genuinely playable space beyond the old square', () => {
  const g = createPsiGrid2D(playgroundGrid2D(1400,600)), point = physicalToCanvas2D(g,12,1,1400,600);
  const physical = canvasToPhysical2D(g,point.x,point.y,1400,600)!;
  expect(physical.x).toBeCloseTo(12,13); expect(physical.y).toBeCloseTo(1,13);
  const field = new Float64Array(g.nx*g.ny);
  stampPotential2D(g,field,physical.x,physical.y,{tool:'barrier',amplitude:4,sigma:.5},20);
  const peak = field.indexOf(Math.max(...field));
  expect(Math.abs(g.xmin+(peak%g.nx+1)*g.dx-12)).toBeLessThan(g.dx/2);
  initializeGaussian2D(g,{x0:12,y0:1,sigmaX:.7,sigmaY:.7});
  const before = g.values.slice();
  const measured = measurePosition2D(g,.4,'xy',()=>.6);
  expect(measured.x).toBeGreaterThan(10); expect(measured.x).toBeLessThan(g.xmax);
  if (measured.axes !== 'xy') throw Error('Expected joint detector result');
  expect(Math.abs(measured.y-1)).toBeLessThan(1); expect(normSquared2D(measured.state)).toBeCloseTo(1,13);
  expect(g.values).toEqual(before);
  const xOnly = measurePosition2D(g,.4,'x',()=>.6), marginal = projectDensityX(xOnly.state);
  expect('y' in xOnly).toBe(false);
  expect(marginal.reduce((a,b)=>a+b,0)*g.dx).toBeCloseTo(normSquared2D(xOnly.state),13);
});

it('matches the independent free Gaussian width convention before rectangular boundary returns', () => {
  const g = createPsiGrid2D(playgroundGrid2D(1400,600)), sx = .8, sy = 1;
  initializeGaussian2D(g,{x0:0,y0:0,sigmaX:sx,sigmaY:sy});
  const stepper = new CayleyStepper2D(g), v = new Float64Array(g.nx*g.ny), t = 1.5;
  for (let n=0;n<180;n++) stepper.step(g,v,1/120);
  const m = positionMoments2D(g), analytic = (s: number) => Math.sqrt(s*s+t*t/(4*s*s));
  // |psi|² initially has variance sigma²; hbar=m=1. At h=20/129,
  // permit 1% finite-difference/time error, not a roundoff continuum claim.
  expect(Math.abs(m.sigmaX/analytic(sx)-1)).toBeLessThan(.01);
  expect(Math.abs(m.sigmaY/analytic(sy)-1)).toBeLessThan(.01);
});

it('evolves real amplitudes past x=10 while preserving norm, free energy and the exact marginal sum', () => {
  const g = createPsiGrid2D(playgroundGrid2D(1400,600));
  initializeGaussian2D(g,{x0:5,y0:0,sigmaX:.7,sigmaY:1,px:2});
  const v = new Float64Array(g.nx*g.ny), stepper = new CayleyStepper2D(g), energy = energyExpectation2D(g,v);
  const massBeyondOldEdge = () => projectDensityX(g).reduce((sum,rho,i)=>sum+(g.xmin+(i+1)*g.dx>10?rho*g.dx:0),0);
  expect(massBeyondOldEdge()).toBeLessThan(1e-10);
  for (let n=0;n<360;n++) stepper.step(g,v,1/120);
  expect(massBeyondOldEdge()).toBeGreaterThan(.55);
  // Roundoff-scale bounds for this unchanged free separable discrete Hamiltonian,
  // not continuum accuracy or conservation under terrain edits/measurement.
  expect(Math.abs(normSquared2D(g)-1)).toBeLessThan(2e-12);
  expect(Math.abs(energyExpectation2D(g,v)-energy)).toBeLessThan(2e-11);
  expect(positionMoments2D(g).x).toBeGreaterThan(10);
  expect(projectDensityX(g).reduce((a,b)=>a+b,0)*g.dx).toBeCloseTo(normSquared2D(g),13);
});
