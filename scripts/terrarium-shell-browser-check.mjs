// Slice 5E.1 real-Chrome fixed viewport and interaction acceptance; no dependencies.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const profile = await mkdtemp(join(tmpdir(), 'psi-shell-'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'packages/web', '--host', '127.0.0.1', '--port', '5190', '--strictPort'], { stdio: 'pipe' });
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9230', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function retry(fn) { for (let i = 0; i < 250; i++) { try { const v = await fn(); if (v) return v; } catch {} await sleep(100); } throw Error('Timed out waiting for shell browser condition'); }
let socket; let checks = 0; const errors = [];
try {
  await retry(async () => (await fetch('http://127.0.0.1:5190')).ok);
  const pages = await retry(async () => (await (await fetch('http://127.0.0.1:9230/json/list')).json()).filter(p => p.type === 'page'));
  socket = new WebSocket(pages[0].webSocketDebuggerUrl); await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  socket.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params); });
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const check = (name, value) => { assert.ok(value, name); checks++; console.log('PASS', name); };
  const key = async (key, code, modifiers = 0) => { const windowsVirtualKeyCode = { Tab: 9, Escape: 27, Enter: 13, ' ': 32 }[key]; await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode, text: key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode }); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:5190' });
  await retry(() => evaluate(`!!document.querySelector('.world-inspector') && ![...document.querySelectorAll('button')].find(b=>b.textContent==='Play').disabled`));
  await evaluate(`window.button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith(t));window.value=t=>Number([...document.querySelectorAll('.diagnostics span')].find(s=>s.textContent.startsWith(t))?.textContent.split(':')[1]);window.rect=()=>{const r=document.querySelector('canvas').getBoundingClientRect();return [r.x,r.y,r.width,r.height]};window.fits=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};`);
  for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1280,720],[1024,600]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await sleep(160);
    check(`${width}×${height}: stationary document, square domain, visible controls`, await evaluate(`document.scrollingElement.scrollHeight===innerHeight && document.scrollingElement.scrollWidth===innerWidth && Math.abs(rect()[2]-rect()[3])<1 && ['.dimension-controls','.settings-trigger','.playback-bar','.selected-creature','.context-help'].every(s=>fits(document.querySelector(s)))`));
    await evaluate(`window.before=JSON.stringify(rect());window.image=document.querySelector('canvas').toDataURL();button('Menu').click()`); await sleep(80);
    check(`${width}×${height}: floating settings do not resize or redraw playground`, await evaluate(`before===JSON.stringify(rect()) && image===document.querySelector('canvas').toDataURL() && fits(document.querySelector('.settings-popover')) && document.activeElement.getAttribute('aria-label')==='Close settings' && document.scrollingElement.scrollHeight===innerHeight`));
    await key('Tab', 'Tab', 8);
    check(`${width}×${height}: Shift-Tab traps focus and focus ring is visible`, await evaluate(`document.querySelector('.settings-popover').contains(document.activeElement) && document.activeElement.getAttribute('aria-label')!=='Close settings' && getComputedStyle(document.activeElement).outlineStyle!=='none'`));
    await key('Escape', 'Escape');
    check(`${width}×${height}: Escape restores menu focus`, await evaluate(`document.querySelector('.settings-popover').hidden && document.activeElement===document.querySelector('.settings-trigger')`));
  }
  await evaluate(`button('Menu').click()`); await sleep(80);
  const outside = await evaluate(`({x:20,y:innerHeight/2})`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...outside, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...outside, button: 'left', clickCount: 1 });
  check('Outside pointer closes settings and leaves focus on a visible trigger', await evaluate(`document.querySelector('.settings-popover').hidden && document.activeElement===document.querySelector('.settings-trigger')`));
  await key('Enter', 'Enter'); await sleep(80);
  check('Enter opens settings from the focused native button', await evaluate(`!document.querySelector('.settings-popover').hidden && document.activeElement.getAttribute('aria-label')==='Close settings'`));
  await key('Escape', 'Escape');
  await evaluate(`document.querySelector('.context-help').focus()`); await key(' ', 'Space'); await sleep(80);
  check('Help is keyboard-operable with a stable accessible name', await evaluate(`!document.querySelector('.settings-popover').hidden && document.querySelector('.context-help').getAttribute('aria-label')==='Help and settings'`));
  await key('Escape', 'Escape');
  check('Escape from Help returns focus to Help', await evaluate(`document.activeElement===document.querySelector('.context-help')`));
  await evaluate(`window.initial=document.querySelector('canvas').toDataURL();button('Play').click()`); await retry(() => evaluate(`value('Physical time')>.2`));
  await evaluate(`window.openTime=value('Physical time');button('Menu').click()`);
  await retry(() => evaluate(`value('Physical time')>openTime+.1`));
  check('Opening settings during playback neither pauses nor resets physical time', await evaluate(`!button('Pause').disabled && !document.querySelector('.settings-popover').hidden`));
  await key('Escape', 'Escape');
  await evaluate(`button('Pause').click()`); await sleep(150);
  check('Persistent playback advances and pauses the existing world', await evaluate(`value('Physical time')>0 && initial!==document.querySelector('canvas').toDataURL() && button('Pause').disabled`));
  await evaluate(`button('Reset evolution').click()`); await sleep(150);
  check('Reset restores deterministic initial rendering and time', await evaluate(`value('Physical time')===0 && initial===document.querySelector('canvas').toDataURL()`));
  await evaluate(`document.querySelector('input[name="terrain-tool"][value="barrier"]').click()`); await sleep(80);
  const point = await evaluate(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return{x:r.x+r.width*.65,y:r.y+r.height*.35}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x + 20, y: point.y, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x + 20, y: point.y, button: 'left', clickCount: 1 });
  await retry(() => evaluate(`value('V maximum')>1.9`));
  check('Native terrain click/drag still edits only terrain while paused', await evaluate(`value('Terrain revision')>0 && value('Physical time')===0 && Math.abs(value('Selected norm')-1)<1e-10`));
  await evaluate(`document.querySelector('input[aria-label="Show creature decorations"]').click();window.image=document.querySelector('canvas').toDataURL();const s=document.querySelector('[aria-label="Selected creature"]');s.value='b';s.dispatchEvent(new Event('change',{bubbles:true}))`); await sleep(100);
  check('Persistent creature selector inspects B without measuring or changing density', await evaluate(`document.querySelector('[name="world-creature"][value="b"]').checked && image===document.querySelector('canvas').toDataURL()`));
  for (const mode of ['1D simulations', '2D Gaussian demo', '2D creature world']) {
    await evaluate(`button('${mode}').click()`); await sleep(200);
    await evaluate(`button('Play').click()`); await retry(() => evaluate(`value('Physical time')>.1`)); await evaluate(`button('Pause').click()`);
    check(`${mode} retains working simulation and no document overflow`, await evaluate(`value('Physical time')>0 && document.scrollingElement.scrollHeight===innerHeight`));
  }
  // Effective layout at 200% desktop browser zoom (CSS viewport is halved).
  await send('Emulation.setDeviceMetricsOverride', { width: 512, height: 300, deviceScaleFactor: 2, mobile: false }); await sleep(200);
  check('200% equivalent small CSS viewport keeps primary controls reachable', await evaluate(`document.scrollingElement.scrollHeight===innerHeight && fits(document.querySelector('.settings-trigger')) && fits(document.querySelector('.context-help')) && fits(document.querySelector('.playback-bar')) && fits(document.querySelector('.dimension-controls'))`));
  await evaluate(`button('Menu').click();button('Advanced').click()`); await sleep(100);
  check('Zoomed settings scroll internally to final diagnostics', await evaluate(`(()=>{const p=document.querySelector('.settings-popover');p.scrollTop=p.scrollHeight;return fits(p)&&p.scrollTop>0&&p.scrollHeight>p.clientHeight&&document.scrollingElement.scrollTop===0})()`));
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await key('Escape', 'Escape'); await sleep(160);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  check('Reduced-motion mode has no decorative animation and retains a usable menu', await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.querySelector('canvas')).animationName==='none' && fits(document.querySelector('.settings-trigger'))`));
  if (process.argv.includes('--screenshot')) { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(tmpdir(), 'psi-terrarium-shell.png'), Buffer.from(r.data, 'base64')); console.log('Screenshot:', join(tmpdir(), 'psi-terrarium-shell.png')); }
  check('No runtime/console errors', errors.length === 0);
  console.log(`${checks} shell browser checks passed`);
} finally { socket?.close(); chrome.kill(); server.kill(); }
