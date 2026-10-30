import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { Simulation1D } from './App';
import { SettingsPopover, SettingsPage, SETTINGS_SECTIONS } from './TerrariumShell';
import { createPsiGrid2D, initializeGaussian2D, probabilityDensity2D } from '@psi-zoo/sim-core';
import { fillDensityPixels2D, TERRARIUM_SKY_RGB } from './render/density2d';
import { creatureColor2D, fillCreatureDensityPixels2D } from './render/creatures2d';

it('defaults to the 2D world with persistent simulation navigation and playback', () => {
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('aria-pressed="true">2D view');
  expect(html).toContain('aria-pressed="false">1D view');
  expect(html).toContain('Advanced / Legacy demonstrations');
  expect(html).toContain('1D simulations');
  expect(html).toContain('2D Gaussian demo');
  expect(html).toContain('class="playground unified-playground"');
  expect(html).toContain('class="playback-bar"');
  expect(html).toContain('Time');
  expect(html).toContain('Reset evolution');
});
it('keeps advanced controls mounted but hidden behind a labeled dialog trigger', () => {
  const html = renderToStaticMarkup(<SettingsPopover><button>Advanced action</button></SettingsPopover>);
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('role="dialog"');
  expect(html).toContain('aria-label="Terrarium settings and help" hidden=""');
  expect(html).toContain('Advanced action');
  expect(html).toContain('Close settings');
});
it('mounts eight internally navigated sections without a second panel or unmounting controls', () => {
  const html = renderToStaticMarkup(<SettingsPopover navigation>{SETTINGS_SECTIONS.map(section => <SettingsPage key={section} section={section}><button>{section} action</button></SettingsPage>)}</SettingsPopover>);
  expect((html.match(/role="dialog"/g) ?? []).length).toBe(1);
  expect((html.match(/class="settings-page-content" hidden=""/g) ?? []).length).toBe(8);
  for (const section of SETTINGS_SECTIONS) expect(html).toContain(`data-settings-link="${section.replace('&', '&amp;')}"`);
  expect(html).toContain('Back to menu');
});
it('retains the standalone 1D observation, painting, presets and notebook', () => {
  const html = renderToStaticMarkup(<Simulation1D />);
  for (const label of ['Load tunnelling demo', 'Load two-creature demo', 'Observe particle', 'Why did it jump?', 'Potential painting', 'Selected creature']) expect(html).toContain(label);
  expect(html).toContain('not projections of the 2D world');
});
it('pastel recoloring changes only pixels and retains fixed brightness and orientation', () => {
  const g = createPsiGrid2D({ nx: 19, ny: 13 }); initializeGaussian2D(g);
  const before = g.values.slice(), rho = probabilityDensity2D(g), copy = rho.slice();
  const dark = new Uint8ClampedArray(4 * rho.length), pastel = new Uint8ClampedArray(dark.length);
  fillDensityPixels2D(g, dark);
  fillDensityPixels2D(g, pastel, TERRARIUM_SKY_RGB, creatureColor2D('a'));
  expect(pastel).not.toEqual(dark);
  fillCreatureDensityPixels2D(g, [{ density: rho, color: creatureColor2D('a') }], dark);
  fillCreatureDensityPixels2D(g, [{ density: rho, color: creatureColor2D('a') }], pastel, undefined, TERRARIUM_SKY_RGB);
  expect(pastel).not.toEqual(dark);
  expect(g.values).toEqual(before); expect(rho).toEqual(copy);
});
