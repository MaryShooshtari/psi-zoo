import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** Bounded product-polish checks through mounted production controls. */
export async function checkRedesign({ evaluate, send, check, retry, sleep, out }) {
  const click = text => evaluate(`(button(${JSON.stringify(text)})||document.querySelector('button[aria-label=${JSON.stringify(text)}]')).click()`);
  const page = async name => {
    if (!await evaluate(`document.querySelector('.settings-trigger').getAttribute('aria-expanded')==='true'`)) await click('Menu ☰');
    await evaluate(`(()=>{const b=button('← Back to menu');if(b.getClientRects().length)b.click();document.querySelector('[data-settings-link=${JSON.stringify(name)}]').click();})()`);
    await sleep(80);
  };
  const shot = async name => { const image = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(out, name), Buffer.from(image.data, 'base64')); };
  await evaluate(`button('2D view').click();button('World: independent').click();document.querySelector('input[aria-label="Show creature decorations"]').click();[...document.querySelectorAll('button')].find(b=>b.textContent==='Not now')?.click();`);
  await retry(() => evaluate('stable()')); await sleep(150);
  await page('Creatures');
  check('Five distinct intention-based sections only', await evaluate(`JSON.stringify([...document.querySelectorAll('.settings-navigation > button')].map(b=>b.dataset.settingsLink))===JSON.stringify(['Creatures','Terrain','Experiments','Appearance','Science notebook'])`));
  check('Creatures page exposes native add/select/remove without random names', await evaluate(`document.querySelector('.settings-popover').textContent.includes('Creature A')&&!/Mochi|Pip|Lumi|Nori/.test(document.querySelector('.settings-popover').textContent)`));
  await evaluate(`(()=>{const controls=[...document.querySelector('.settings-popover').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],summary,[tabindex="0"]')].filter(e=>e.checkVisibility());controls.at(-1).focus();})()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  check('Keyboard Tab wraps inside the open menu', await evaluate(`document.activeElement===document.querySelector('button[aria-label="Close settings"]')`));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(60);
  check('Escape closes menu and restores trigger focus', await evaluate(`document.activeElement===document.querySelector('.settings-trigger')&&document.querySelector('.settings-popover').hidden`));
  await page('Experiments');
  check('Experiments contains explicit position and ordered Bell actions, not terrain tools', await evaluate(`(()=>{const visible=[...document.querySelectorAll('.settings-home-actions button')].filter(b=>b.getClientRects().length).map(b=>b.dataset.settingsLink);return JSON.stringify(visible)===JSON.stringify(['Measure position','Entangle moods','Measure mood']);})()`));
  await page('Terrain');
  check('Terrain has four direct tools with no redundant drawing entry', await evaluate(`document.querySelectorAll('[name="terrain-tool"]').length===4&&!document.querySelector('[data-settings-link="Draw terrain"]')&&!button('Paint on canvas')`));
  await click('Close settings');
  await evaluate(`button('World: entangled friendship').click();document.querySelector('[name="terrain-tool"][value="barrier"]').click()`);
  const p = await evaluate(`(()=>{const r=document.querySelector('.density-2d').getBoundingClientRect();return{x:r.x+r.width*.5+Math.min(r.width,r.height)*.2,y:r.y+r.height*.5};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
  await retry(() => evaluate('__controller.potential.some(v=>v>0)'));
  await evaluate(`window.clearBefore=capture();button('Clear terrain').click()`); await sleep(100);
  check('Clear terrain removes external potential without changing creatures, states, time or entanglement', await evaluate(`(()=>{const n=capture(),s=clearBefore;return n.terrain.every(v=>v===0)&&n.controller===s.controller&&n.time===s.time&&n.owners===s.owners&&n.pairs.length===1&&n.spatial.every((a,i)=>bytesEqual(a,s.spatial[i]))&&JSON.stringify(n.pairs)===JSON.stringify(s.pairs);})()`));
  await click('What am I seeing?'); await sleep(100);
  check('Dedicated compact science dialog explains Gaussian measurement and independent spatial states', await evaluate(`(()=>{const d=document.querySelector('.museum-dialog');return d.open&&d.classList.contains('museum-compact')&&d.textContent.includes('finite-resolution Gaussian')&&d.textContent.includes('not spatial entanglement')&&document.querySelector('.settings-popover').hidden;})()`));
  await shot('redesign-science.png');
  await evaluate(`window.scienceBefore=document.querySelector('.museum-body > .plot-note').textContent;button('Play').click()`);
  await sleep(900);
  check('Open contextual help updates from published state without pausing evolution', await evaluate(`__controller.playing&&document.querySelector('.museum-body > .plot-note').textContent!==scienceBefore`));
  await evaluate(`button('Pause').click()`); await click('Close science help');
  await page('Appearance'); await shot('redesign-menu.png'); await click('Close settings');
  // Restore a simple two-cloud portrait, then check visual-only continuity.
  await evaluate(`button('World: independent').click();button('Cancel terrain tool')?.click();window.layoutBefore=capture()`);
  for (const [width,height] of [[1366,768],[390,844],[512,300]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await sleep(120);
    const rect = await evaluate(`(()=>{const r=document.querySelector('.shared-world-square').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};})()`);
    await click('1D view'); await retry(() => evaluate('stable()'));
    check(`${width}×${height}: view switch preserves rectangle, state and no page scroll`, await evaluate(`(()=>{const r=document.querySelector('.shared-world-square').getBoundingClientRect(),s=${JSON.stringify(rect)};return r.x===s.x&&r.y===s.y&&r.width===s.w&&r.height===s.h&&same(layoutBefore)&&document.scrollingElement.scrollHeight===innerHeight&&document.scrollingElement.scrollWidth===innerWidth;})()`));
    await click('2D view'); await retry(() => evaluate('stable()'));
    await shot(`redesign-${width}x${height}.png`);
    console.log('Header geometry', width, await evaluate(`[...document.querySelectorAll('.dimension-controls,.museum-trigger,.settings-trigger')].map(e=>({class:e.className,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right}))`));
    check(`${width}×${height}: clear header and help in bottom controls`, await evaluate(`(()=>{const a=document.querySelector('.dimension-controls').getBoundingClientRect(),b=document.querySelector('.museum-trigger').getBoundingClientRect(),c=document.querySelector('.settings-trigger').getBoundingClientRect();return a.right<=c.left&&!!document.querySelector('.museum-trigger').closest('.playback-bar')&&b.bottom<=innerHeight;})()`));
  }
}
