import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** Run: node scripts/projection-browser-check.mjs --branding
 * Uses the existing production-browser harness; no shipped instrumentation.
 * Writes only the new Psiways media, never historical recordings. */
export async function captureBranding({ evaluate, send, check, retry, sleep, out }) {
  const directory = 'docs/assets'; await mkdir(directory, { recursive: true });
  const frames = [];
  const screenshot = async () => (await send('Page.captureScreenshot', { format: 'png' })).data;
  check('Psiways browser title, description, social metadata and header are current', await evaluate(`document.title==='Psiways — An interactive quantum playground'&&document.querySelector('.shell-brand').textContent.startsWith('Psiways')&&document.querySelector('meta[name="description"]').content.includes('wavefunctions')&&document.querySelector('meta[property="og:title"]').content.startsWith('Psiways')&&!document.body.textContent.includes('Psi Zoo')`));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await evaluate(`button('Not now')?.click();const f=document.querySelector('input[aria-label="Show creature decorations"]');if(!f.checked)f.click();`);
  frames.push({ png: await screenshot(), wallTime: performance.now(), time: await evaluate('__controller.world.time'), hold: 500 });
  await evaluate(`button('Play').click()`);
  for (let i = 0; i < 18; i++) {
    await sleep(100);
    frames.push({ png: await screenshot(), wallTime: performance.now(), time: await evaluate('__controller.world.time') });
    if (frames.at(-1).time >= 1.6) break;
  }
  await evaluate(`button('Pause').click()`); frames.at(-1).hold = 900;
  const hero = await screenshot(); await writeFile(join(directory, 'psiways-terrarium.png'), Buffer.from(hero, 'base64'));
  const observed = await evaluate(`(()=>{const c=__controller,g=c.psi;window.mediaBefore=capture();return{time:c.world.time,playing:c.playing,creatures:c.world.ids.length,nx:g.nx,ny:g.ny,dx:g.dx,dy:g.dy,dt:c.dt,bounds:{xmin:g.xmin,xmax:g.xmax,ymin:g.ymin,ymax:g.ymax},norms:c.world.getSnapshot().creatures.map(c=>c.norm),positionMeasurements:c.world.getSnapshot().spatialMeasurementCount};})()`);
  check('Media records real fixed-step evolution of two normalized creatures', observed.time > 1 && !observed.playing && observed.creatures === 2 && observed.nx !== observed.ny && observed.norms.every(n => Math.abs(n - 1) < 1e-10) && frames.at(-1).time > frames[0].time);
  await evaluate(`button('1D view').click()`); await retry(() => evaluate('stable()'));
  check('README marginal screenshot is the exact same state, terrain and time', await evaluate('same(mediaBefore)'));
  await writeFile(join(directory, 'psiways-marginal.png'), Buffer.from(await screenshot(), 'base64'));
  await evaluate(`button('2D view').click()`); await retry(() => evaluate('stable()'));
  // Established LZW method from capture-observer-gif.mjs. An adaptive global
  // palette retains pastel gradients better than the old coarse RGB cube.
  // Every frame is a downsampled real screenshot; no interpolation or overlays.
  const width = 960, height = 600, histogram = new Map();
  for (const index of [...new Set([0, Math.floor(frames.length / 2), frames.length - 1])]) {
    const samples = await evaluate(`(async()=>{const image=await createImageBitmap(await(await fetch('data:image/png;base64,${frames[index].png}')).blob());const c=new OffscreenCanvas(${width},${height}),ctx=c.getContext('2d');ctx.drawImage(image,0,0,c.width,c.height);const p=ctx.getImageData(0,0,c.width,c.height).data,h=new Map();for(let i=0;i<p.length;i+=16){const key=(p[i]>>3)*1024+(p[i+1]>>3)*32+(p[i+2]>>3);h.set(key,(h.get(key)||0)+1);}image.close();return [...h];})()`);
    for (const [key, count] of samples) histogram.set(key, (histogram.get(key) ?? 0) + count);
  }
  const colors = [...histogram].map(([key, count]) => ({ rgb: [(key >> 10) * 8 + 4, ((key >> 5) & 31) * 8 + 4, (key & 31) * 8 + 4], count }));
  const bounds = list => [0,1,2].map(axis => Math.max(...list.map(p => p.rgb[axis])) - Math.min(...list.map(p => p.rgb[axis])));
  const boxes = [colors];
  while (boxes.length < 256) {
    let best = -1, score = -1;
    boxes.forEach((box, i) => { if (box.length < 2) return; const s = Math.max(...bounds(box)) * Math.sqrt(box.reduce((n,p) => n+p.count,0)); if (s > score) { score = s; best = i; } });
    if (best < 0) break;
    const box = boxes.splice(best, 1)[0], spans = bounds(box), axis = spans.indexOf(Math.max(...spans)); box.sort((a,b) => a.rgb[axis]-b.rgb[axis]);
    const half = box.reduce((n,p) => n+p.count,0)/2; let accumulated = 0, middle = 1;
    for (; middle < box.length; middle++) { accumulated += box[middle-1].count; if (accumulated >= half) break; }
    middle = Math.min(middle, box.length-1); boxes.push(box.slice(0,middle), box.slice(middle));
  }
  const palette = boxes.flatMap(box => { const total = box.reduce((n,p) => n+p.count,0); return [0,1,2].map(axis => Math.round(box.reduce((n,p) => n+p.rgb[axis]*p.count,0)/total)); });
  while (palette.length < 768) palette.push(0);
  const lookup = new Uint8Array(32768);
  for (let key = 0; key < lookup.length; key++) {
    const rgb = [(key>>10)*8+4,((key>>5)&31)*8+4,(key&31)*8+4]; let distance = Infinity;
    for (let j = 0; j < boxes.length; j++) { const d = rgb.reduce((sum,c,axis) => sum+(c-palette[3*j+axis])**2,0); if(d<distance){distance=d;lookup[key]=j;} }
  }
  const encodedLookup = Buffer.from(lookup).toString('base64');
  const parts = [Buffer.from('GIF89a'), Buffer.from([width & 255, width >> 8, height & 255, height >> 8, 0xf7, 0, 0]), Buffer.from(palette), Buffer.from([0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0])];
  function lzw(pixels) {
    let dict = new Map(), next = 258, bits = 9, acc = 0, n = 0; const output = [];
    const emit = code => { acc |= code << n; n += bits; while (n >= 8) { output.push(acc & 255); acc >>>= 8; n -= 8; } };
    emit(256); let prefix = pixels[0];
    for (let i = 1; i < pixels.length; i++) {
      const k = pixels[i], key = prefix * 256 + k, found = dict.get(key);
      if (found !== undefined) { prefix = found; continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << bits) && bits < 12) bits++; }
      else { emit(256); dict = new Map(); next = 258; bits = 9; }
      prefix = k;
    }
    emit(prefix); emit(257); if (n) output.push(acc & 255);
    const blocks = [Buffer.from([8])];
    for (let i = 0; i < output.length; i += 255) { const block = Buffer.from(output.slice(i, i + 255)); blocks.push(Buffer.from([block.length]), block); }
    blocks.push(Buffer.from([0])); return Buffer.concat(blocks);
  }
  let duration = 0;
  for (let i = 0; i < frames.length; i++) {
    const data = await evaluate(`(async()=>{const image=await createImageBitmap(await(await fetch('data:image/png;base64,${frames[i].png}')).blob());const c=new OffscreenCanvas(${width},${height}),ctx=c.getContext('2d');ctx.drawImage(image,0,0,c.width,c.height);const rgba=ctx.getImageData(0,0,c.width,c.height).data;
      const lut=Uint8Array.from(atob('${encodedLookup}'),c=>c.charCodeAt(0)),p=new Uint8Array(c.width*c.height);
      for(let j=0;j<p.length;j++)p[j]=lut[(rgba[4*j]>>3)*1024+(rgba[4*j+1]>>3)*32+(rgba[4*j+2]>>3)];let binary='';for(let j=0;j<p.length;j+=8192)binary+=String.fromCharCode(...p.subarray(j,j+8192));image.close();return btoa(binary);})()`);
    const delay = Math.max(2, Math.round((frames[i].hold ?? frames[i + 1].wallTime - frames[i].wallTime) / 10)); duration += delay * 10;
    parts.push(Buffer.from([0x21, 0xf9, 4, 4, delay & 255, delay >> 8, 0, 0]), Buffer.from([0x2c, 0, 0, 0, 0, width & 255, width >> 8, height & 255, height >> 8, 0]), lzw(Buffer.from(data, 'base64')));
  }
  parts.push(Buffer.from([0x3b])); const gif = Buffer.concat(parts);
  await writeFile(join(directory, 'psiways-evolution.gif'), gif);
  const decoded = await evaluate(`(async()=>{const data=Uint8Array.from(atob('${gif.toString('base64')}'),c=>c.charCodeAt(0));const d=new ImageDecoder({data,type:'image/gif'});await d.tracks.ready;const count=d.tracks.selectedTrack.frameCount;let duration=0;for(let i=0;i<count;i++){const {image}=await d.decode({frameIndex:i});duration+=image.duration;image.close();}d.close();return{count,durationMs:duration/1000};})()`);
  check('Every GIF frame decodes natively with the recorded frame count and timing', decoded.count === frames.length && decoded.durationMs === duration);
  const manifest = { capturedAt: new Date().toISOString(), browser: (await send('Browser.getVersion')).product, viewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, observed, sameStateMarginal: true, animation: { width, height, bytes: gif.length, frames: frames.length, durationMs: duration, decoded, sampledPhysicalTimes: frames.map(f => f.time), policy: 'Actual browser screenshots, downsampled and palette-quantized. Sampled wall-clock timing plus initial/final holds. No interpolated frames or physics parameter changes.' } };
  await writeFile(join(directory, 'capture.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(out, 'branding-capture.json'), JSON.stringify(manifest, null, 2));
  for (const [width, height] of [[390,844],[512,300]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await sleep(80);
    check(`${width}x${height}: Psiways title fits between navigation and Menu without altering physics`, await evaluate(`(()=>{const a=document.querySelector('.dimension-controls').getBoundingClientRect(),b=document.querySelector('.shell-brand').getBoundingClientRect(),c=document.querySelector('.settings-trigger').getBoundingClientRect();return a.right<=b.left&&b.right<=c.left&&same(mediaBefore)&&document.scrollingElement.scrollWidth===innerWidth;})()`));
    await writeFile(join(out, `branding-${width}x${height}.png`), Buffer.from(await screenshot(), 'base64'));
  }
  assert.ok(gif.length < 8_000_000, 'Keep the README recording bounded in size');
  console.log('Psiways assets captured', JSON.stringify(manifest, null, 2));
}
