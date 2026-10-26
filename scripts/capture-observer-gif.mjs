// Genuine browser recording, not generated simulation frames. No dependencies.
// Run from repo root: node scripts/capture-observer-gif.mjs [--creatures]
// --creatures writes Slice 4 media only; historical recordings are preserved.
// CHROME_PATH can override the Windows default. Ports 5174/9223 must be free.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const creatures = process.argv.includes('--creatures');
const output = creatures ? 'docs/media/creatures.gif' : 'docs/media/observer.gif';
const temporary = await mkdtemp(join(tmpdir(), creatures ? 'psi-creatures-gif-' : 'psi-observer-gif-'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'packages/web', '--host', '127.0.0.1', '--port', '5174', '--strictPort'], { stdio: 'ignore' });
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9223', `--user-data-dir=${join(temporary, 'profile')}`, 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(fn) {
  for (let i = 0; i < 200; i++) {
    try { const value = await fn(); if (value) return value; } catch {}
    await sleep(100);
  }
  throw new Error('Timed out waiting for browser');
}
let socket;
try {
  await wait(async () => (await fetch('http://127.0.0.1:5174')).ok);
  const page = await wait(async () => (await (await fetch('http://127.0.0.1:9223/json/list')).json()).find(p => p.type === 'page'));
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map(), errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id); pending.delete(message.id);
      if (message.error) task.reject(new Error(JSON.stringify(message.error)));
      else task.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args);
    else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5174' });
  await wait(() => evaluate(`document.querySelector('button') && !document.querySelector('button').disabled`));
  if (!creatures) {
    // Keep historical Observer recording on its original single-packet preset.
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Load free exploration').click()`);
    await wait(() => evaluate(`!document.querySelector('.creature-inspector')`));
  }
  // Presentation-only CSS keeps the real plot, action, result and diagnostics
  // together. No controller hook, physics values, canvas pixels or readouts edited.
  await evaluate(`window.button = text => [...document.querySelectorAll('button')].find(b=>b.textContent.startsWith(text));
    document.querySelectorAll('input[name="interaction"]')[1].click();
    [...document.querySelectorAll('fieldset')].find(f=>f.querySelector('legend').textContent==='Position observation').classList.add('capture-observation');
    const style=document.createElement('style');
    style.textContent='main{padding:16px 24px}.heading h1,.heading p,.brush-controls:not(.capture-observation),main>.plot-note,.scattering-readout,footer,.controls[aria-label="Reproducible experiment selection"]{display:none!important}.terrarium{margin-top:12px}.capture-observation{margin-top:12px}.diagnostics{margin-top:12px}';
    document.head.append(style);`);
  if (creatures) await evaluate(`(() => {
    document.querySelector('.creature-inspector').classList.add('capture-inspector');
    const style=document.createElement('style');
    style.textContent='.heading .eyebrow{display:block}.capture-inspector .brush-controls,.capture-inspector .bloch-readout,.capture-observation label,.capture-observation button:last-of-type{display:none!important}.capture-inspector h2{margin:12px 0 0}.capture-inspector .diagnostics{margin-top:8px}.terrarium{height:300px}';
    document.head.append(style);
  })()`);
  const width = 900;
  // Reserve space for the observation result wrapping onto a new line.
  const height = await evaluate(`Math.ceil(document.querySelector('main>.diagnostics').getBoundingClientRect().bottom+80)`);
  const frames = [];
  async function capture(stage, hold) {
    const png = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 } });
    const wallTime = performance.now();
    const file = join(temporary, `${String(frames.length).padStart(3, '0')}.png`);
    await writeFile(file, Buffer.from(png.data, 'base64'));
    const readout = await evaluate(`document.querySelector('main>.diagnostics').innerText`);
    frames.push({ file, stage, hold, wallTime, readout });
  }
  async function record(stage, duration) {
    const start = performance.now();
    for (let next = start; next < start + duration; next += 125) {
      await sleep(Math.max(0, next - performance.now()));
      await capture(stage);
    }
    await evaluate(`button('Pause').click()`);
  }
  await capture('initial', 60);
  await evaluate(`button('Play').click()`);
  await record(creatures ? 'two-creature mood-driven repulsive encounter' : 'initial evolution', creatures ? 3500 : 2000);
  await evaluate(`button('Observe particle').click()`);
  await capture('measurement and localization', 100);
  const observed = await evaluate(`document.querySelector('.capture-observation [role="status"]').textContent`);
  assert.match(observed, /observation #1/);
  await evaluate(`button('Play').click()`);
  await record('post-measurement re-spreading', 4000);
  await capture('final', 150);
  assert.equal(errors.length, 0, JSON.stringify(errors));

  // Fixed 252-color palette + standard GIF LZW, reused from the Slice 2
  // recording approach. No frame interpolation, annotations or invented pixels.
  const levels = [0, 16, 40, 80, 152, 248], green = [0, 16, 40, 80, 128, 184, 248];
  const palette = [];
  for (const r of levels) for (const g of green) for (const b of levels) palette.push(r, g, b);
  while (palette.length < 768) palette.push(0);
  const parts = [Buffer.from('GIF89a'), Buffer.from([width & 255, width >> 8, height & 255, height >> 8, 0xf7, 0, 0]),
    Buffer.from(palette), Buffer.from([0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0])];
  function lzw(pixels) {
    let dict = new Map(), next = 258, bits = 9, acc = 0, n = 0;
    const out = [];
    function emit(code) { acc |= code << n; n += bits; while (n >= 8) { out.push(acc & 255); acc >>>= 8; n -= 8; } }
    emit(256);
    let prefix = pixels[0];
    for (let i = 1; i < pixels.length; i++) {
      const k = pixels[i], key = prefix * 256 + k, found = dict.get(key);
      if (found !== undefined) { prefix = found; continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << bits) && bits < 12) bits++; }
      else { emit(256); dict = new Map(); next = 258; bits = 9; }
      prefix = k;
    }
    emit(prefix); emit(257); if (n) out.push(acc & 255);
    const blocks = [Buffer.from([8])];
    for (let i = 0; i < out.length; i += 255) { const block = Buffer.from(out.slice(i, i + 255)); blocks.push(Buffer.from([block.length]), block); }
    blocks.push(Buffer.from([0])); return Buffer.concat(blocks);
  }
  let duration = 0;
  for (let i = 0; i < frames.length; i++) {
    const png = (await readFile(frames[i].file)).toString('base64');
    const data = await evaluate(`(async()=>{
      const image=await createImageBitmap(await(await fetch('data:image/png;base64,${png}')).blob());
      const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      const lookup=levels=>Array.from({length:256},(_,v)=>levels.reduce((best,x,j)=>Math.abs(x-v)<Math.abs(levels[best]-v)?j:best,0));
      const r=lookup(${JSON.stringify(levels)}),g=lookup(${JSON.stringify(green)}),pixels=new Uint8Array(canvas.width*canvas.height);
      for(let j=0;j<pixels.length;j++)pixels[j]=r[rgba[4*j]]*42+g[rgba[4*j+1]]*6+r[rgba[4*j+2]];
      let binary='';for(let j=0;j<pixels.length;j+=8192)binary+=String.fromCharCode(...pixels.subarray(j,j+8192));
      image.close();return btoa(binary);
    })()`);
    // Preserve sampled wall-clock pacing. Explicit initial/measurement/final
    // holds make the observed transition readable without inventing frames.
    const delay = frames[i].hold ?? Math.max(2, Math.round(((frames[i + 1]?.wallTime ?? frames[i].wallTime + 125) - frames[i].wallTime) / 10));
    duration += delay * 10;
    parts.push(Buffer.from([0x21, 0xf9, 4, 4, delay & 255, delay >> 8, 0, 0]),
      Buffer.from([0x2c, 0, 0, 0, 0, width & 255, width >> 8, height & 255, height >> 8, 0]), lzw(Buffer.from(data, 'base64')));
  }
  parts.push(Buffer.from([0x3b]));
  const gif = Buffer.concat(parts);
  await writeFile(output, gif);
  // Verify every encoded frame with Chrome's native decoder, and export sample
  // decoded frames to the temporary directory for independent visual inspection.
  const decoded = await evaluate(`(async()=>{
    const bytes=Uint8Array.from(atob('${gif.toString('base64')}'),c=>c.charCodeAt(0));
    const decoder=new ImageDecoder({data:bytes,type:'image/gif'});await decoder.tracks.ready;
    const count=decoder.tracks.selectedTrack.frameCount;let total=0;const samples=[];
    for(let i=0;i<count;i++){
      const {image}=await decoder.decode({frameIndex:i});total+=image.duration;
      if([0,17,count-1].includes(i)){
        const c=new OffscreenCanvas(image.displayWidth,image.displayHeight);c.getContext('2d').drawImage(image,0,0);
        const blob=await c.convertToBlob({type:'image/png'}),bytes=new Uint8Array(await blob.arrayBuffer());
        let binary='';for(let j=0;j<bytes.length;j+=8192)binary+=String.fromCharCode(...bytes.subarray(j,j+8192));
        samples.push({index:i,png:btoa(binary)});
      }
      image.close();
    }
    decoder.close();return {count,durationMs:total/1000,samples};
  })()`);
  assert.equal(decoded.count, frames.length); assert.equal(decoded.durationMs, duration);
  for (const sample of decoded.samples) await writeFile(join(temporary, `decoded-${sample.index}.png`), Buffer.from(sample.png, 'base64'));
  const manifest = { browser: (await send('Browser.getVersion')).product, width, height, frameCount: frames.length,
    output, bytes: (await stat(output)).size, durationMs: duration, observed, errors,
    decoded: { count: decoded.count, durationMs: decoded.durationMs }, frames };
  await writeFile(join(temporary, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ...manifest, frames: undefined, temporary }, null, 2));
  await send('Browser.close');
} finally { socket?.close(); chrome.kill(); server.kill(); }
