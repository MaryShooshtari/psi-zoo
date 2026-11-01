// Audit-only static comparison. No preset, sampling, globals or palette switch is
// added to the shipped application. Outputs are external and self-contained.
import { build } from 'vite';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname, relative, isAbsolute, sep } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1])) throw Error('Usage: node scripts/cloud-action-visual-fixtures.mjs [--out NEW_EXTERNAL_DIRECTORY]');
const out = args.length ? resolve(args[1]) : await mkdtemp(join(tmpdir(), 'psi-cloud-visual-'));
const relativeOut = relative(resolve('.'), out);
if (!isAbsolute(relativeOut) && relativeOut !== '..' && !relativeOut.startsWith(`..${sep}`)) throw Error('Visual audit output must be outside the repository.');
if (args.length) await mkdir(out); // Refuse an existing directory; never delete prior evidence.
const seen = new Set();
function once(code, needle, replacement) {
  assert.equal(code.split(needle).length, 2, `Missing/nonunique fixture anchor: ${needle}`);
  return code.replace(needle, replacement);
}
const entry = String.raw`
import { useEffect } from 'react';
import { createPsiGrid2D, initializeGaussian2D, normalize2D, normSquared2D, stampPotential2D } from '@psi-zoo/sim-core';
import { initialCreature2D, QuantumWorld2D } from './world/world2d';
import { fillCreatureDensityPixels2D, CREATURE_COLORS_2D, WORLD_SKY_RGB } from './render/creatures2d';
import { interiorViewport2D, TERRARIUM_SKY_RGB } from './render/density2d';
import { createCreatureDecoration } from './render/creatureDecoration';
import { createPotentialRenderer2D } from './render/potential2d';
import { createProjectionRenderer } from './render/projection1d';
const palettes = [
  { id: 'P0', title: 'Previous sky / pastel', sky: TERRARIUM_SKY_RGB, colors: [[120,185,176],[228,133,174],[227,179,100],[163,137,207]] },
  { id: 'P1', title: 'Selected twilight / bright pastel', sky: WORLD_SKY_RGB, colors: CREATURE_COLORS_2D },
  { id: 'P2', title: 'Parchment / ink clouds', sky: [238,234,223], colors: [[47,123,124],[171,77,119],[155,109,38],[106,79,163]] },
];
export default function App() {
  useEffect(() => {
    const g = createPsiGrid2D({ nx:128, ny:128, xmin:-10, xmax:10, ymin:-10, ymax:10 });
    const p = { driveStrength:0, preferredDirection:{x:0,y:1}, moodFrequency:0 };
    const definitions = [
      { name:'Compact', a:{x0:-3,y0:0,sigmaX:.7,sigmaY:.7}, b:{x0:3,y0:0,sigmaX:.7,sigmaY:.7} },
      { name:'Diffuse', a:{x0:-3,y0:0,sigmaX:2.5,sigmaY:2.5}, b:{x0:3,y0:0,sigmaX:2.5,sigmaY:2.5} },
      { name:'Split coherent lobes', a:{x0:-3,y0:0,sigmaX:.8,sigmaY:.8}, b:{x0:0,y0:5,sigmaX:.9,sigmaY:.9}, split:true },
      { name:'Overlap (independent densities)', a:{x0:-.3,y0:0,sigmaX:1.2,sigmaY:1.2}, b:{x0:.3,y0:0,sigmaX:1.2,sigmaY:1.2} },
      { name:'Wall adjacent / clipping', a:{x0:-8.8,y0:7.8,sigmaX:.7,sigmaY:.7}, b:{x0:7.8,y0:-8.8,sigmaX:1.1,sigmaY:1.1} },
    ];
    const scenes = definitions.map(d => {
      const a = initialCreature2D(g,'a',d.a,0,p), b = initialCreature2D(g,'b',d.b,1,p);
      const overlap=d.name.startsWith('Overlap'), diffuse=d.name==='Diffuse', wall=d.name.startsWith('Wall');
      const sigma=diffuse?2.5:.9;
      const c=initialCreature2D(g,'c',{x0:overlap?0:wall?-8:diffuse?0:-5,y0:overlap?-.3:wall?-7.8:-4,sigmaX:sigma,sigmaY:sigma},0,p);
      const d4=initialCreature2D(g,'d',{x0:overlap?0:wall?8:diffuse?0:5,y0:overlap?.3:wall?7.8:diffuse?4:-4,sigmaX:sigma,sigmaY:sigma},1,p);
      if(d.split) {
        const other = createPsiGrid2D(g); initializeGaussian2D(other,{...d.a,x0:3});
        for(let i=0;i<a.psi.values.length;i++)a.psi.values[i]+=other.values[i]; normalize2D(a.psi);
      }
      const w = new QuantumWorld2D(g,{creatures:[a,b,c,d4],interactions:{drives:false,social:false,strength:0,range:1}});
      const layers = w.ids.map(id=>{const density=new Float64Array(g.nx*g.ny);w.copyDensity(id,density);return{id,density};});
      const before = w.ids.map(id=>w.spatialState(id).values);
      return { name:d.name,w,layers,before,norms:w.ids.map(id=>normSquared2D(w.spatialState(id))) };
    });
    const terrain = new Float64Array(g.nx*g.ny);
    stampPotential2D(g,terrain,1.8,-1.2,{tool:'barrier',sigma:.8,amplitude:4},20);
    stampPotential2D(g,terrain,-3,-2,{tool:'well',sigma:1.1,amplitude:3},20);
    const field = {terrainRevision:1,potentialLimit:20,copyPotential(out){out.set(terrain);}};
    const root = document.getElementById('fixture-grid');
    const render = ({face,terrain:showTerrain,view}) => {
      globalThis.__cloudVisualFace=face; root.replaceChildren();
      for(const scene of scenes)for(const palette of palettes) {
        const figure=document.createElement('figure'), title=document.createElement('figcaption'), canvas=document.createElement('canvas');
        globalThis.__cloudVisualPalette=palette;
        title.textContent=scene.name+' · '+palette.id+' · '+view; canvas.width=canvas.height=320; canvas.setAttribute('aria-label',title.textContent);
        const ctx=canvas.getContext('2d');
        if(view==='1d') {
          const projection=createProjectionRenderer(g,scene.w,field);projection(ctx,320,320,'a',false,showTerrain,.6);
          if(face!==-1)createCreatureDecoration(g)(ctx,320,320,projection.layers,scene.w.getSnapshot(),'a',true,true,0,false,projection.scale);
        } else {
          const surface=document.createElement('canvas');surface.width=g.nx;surface.height=g.ny;
          const staging=surface.getContext('2d'), image=staging.createImageData(g.nx,g.ny);
          fillCreatureDensityPixels2D(g,scene.layers.map((l,i)=>({...l,color:palette.colors[i]})),image.data,undefined,palette.sky);
          staging.putImageData(image,0,0);ctx.fillStyle='rgb('+palette.sky.join(',')+')';ctx.fillRect(0,0,320,320);ctx.imageSmoothingEnabled=false;
          const v=interiorViewport2D(g,320,320);ctx.drawImage(surface,v.x,v.y,v.width,v.height);
          if(showTerrain)createPotentialRenderer2D(g,field).draw(ctx,320,320,true,.6);
          if(face!==-1)createCreatureDecoration(g)(ctx,320,320,scene.layers,scene.w.getSnapshot(),'a',false,true,0,false);
        }
        figure.append(title,canvas);root.append(figure);
      }
      const invariant=scenes.every(scene=>scene.w.time===0&&scene.w.lastAction===null&&scene.w.getSnapshot().spatialDrawCount===0
        &&scene.w.ids.every((id,i)=>scene.w.spatialState(id).values.every((value,k)=>Object.is(value,scene.before[i][k]))));
      if(!invariant)throw Error('Visual fixture changed physics');
      return { palettes, scenes:scenes.map(s=>({name:s.name,norms:s.norms})), invariant, samples:root.querySelectorAll('canvas').length };
    };
    globalThis.__cloudVisual={render};render({face:1,terrain:false,view:'2d'});
  },[]);
  return <div id="visual-audit"><style>{'#visual-audit{position:absolute;inset:0;overflow:visible;background:#faf7fc;color:#302a45;width:1080px;min-height:100vh;padding:16px;font:15px system-ui}#visual-audit h1{font-size:22px}#fixture-grid{display:grid;grid-template-columns:repeat(3,340px);gap:14px}#fixture-grid figure{margin:0}#fixture-grid figcaption{font-weight:600;padding:8px 0}#fixture-grid canvas{display:block;width:320px;height:320px;border-radius:0}html,body,#root{overflow:visible;height:auto;min-height:100%;margin:0}'}</style>
    <h1>Static cloud comparison — not evolved dynamics or a measured position</h1>
    <p id="fixture-caption">P0 previous · P1 selected twilight · P2 parchment. Same densities, linear additions, fixed f(ρ)=1−exp(−ρ/0.08), geometry and face anchors. Faces/terrain independently toggled.</p>
    <div id="fixture-grid" />
  </div>;
}`;
await build({ root: resolve('packages/web'), configFile: resolve('packages/web/vite.config.ts'), plugins: [{
  name: 'cloud-visual-audit-only', enforce: 'pre', transform(code, id) {
    const path = id.replaceAll('\\','/');
    if (path.endsWith('/src/App.tsx')) {
      assert.ok(code.includes('export default function App() {')); seen.add('app'); return { code: entry, map: null };
    }
    if (path.endsWith('/src/render/creatures2d.ts')) {
      seen.add('palette');
      return {code:once(code, 'return CREATURE_COLORS_2D[index >= 0 ?', 'return (globalThis.__cloudVisualPalette?.colors ?? CREATURE_COLORS_2D)[index >= 0 ?'),map:null};
    }
    if (!path.endsWith('/src/render/creatureDecoration.ts')) return;
    seen.add('decoration');
    const bracket = `if (id === selected) {
        context.strokeStyle = '#493d60'; context.lineWidth = 2; context.beginPath();
        context.moveTo(-18, -7); context.lineTo(-18, -15); context.lineTo(-10, -15);
        context.moveTo(10, 15); context.lineTo(18, 15); context.lineTo(18, 7); context.stroke();
      }`;
    code = once(code, bracket, `if(globalThis.__cloudVisualFace===0){
      if(id===selected){context.strokeStyle='#6a428d';context.lineWidth=2;context.beginPath();context.arc(0,0,18,0,2*Math.PI);context.stroke();}
      context.fillStyle='#fff7f7b8';context.beginPath();context.ellipse(0,0,14,11,0,0,Math.PI*2);context.fill();
    }else{${bracket.replace("context.strokeStyle = '#493d60'", "context.strokeStyle = globalThis.__cloudVisualFace === 2 ? '#fff9ed' : '#493d60'")}}`);
    code = once(code, "context.strokeStyle = '#493d60'; context.fillStyle = '#493d60'; context.lineWidth = 1.6;",
      "context.strokeStyle = globalThis.__cloudVisualFace === 2 ? '#fff9ed' : '#493d60'; context.fillStyle = context.strokeStyle; context.lineWidth = globalThis.__cloudVisualFace === 2 ? 2 : 1.6;");
    code = once(code, 'context.ellipse(x, -2, 1.4, c.sz < -.25 ? 1.2 : 2.2, 0, 0, Math.PI * 2);',
      'context.ellipse(x, -2, globalThis.__cloudVisualFace === 2 ? 1.6 : 1.4, c.sz < -.25 ? 1.2 : globalThis.__cloudVisualFace === 2 ? 2.4 : 2.2, 0, 0, Math.PI * 2);');
    code = once(code, '${creatureLabel(id)}', "${globalThis.__cloudVisualFace === 0 ? ({a:'Mochi · A',b:'Pip · B',c:'Lumi · C',d:'Nori · D'}[id] ?? creatureLabel(id)) : creatureLabel(id)}");
    return { code, map: null };
  },
}], build: { outDir: join(out,'ui'), emptyOutDir: true } });
assert.deepEqual([...seen].sort(), ['app','decoration','palette']);
const server = createServer(async (req,res) => {
  try { const path=join(out,'ui', req.url==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path)); }
  catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(5191,'127.0.0.1',r));
const chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9231',`--user-data-dir=${join(out,'profile')}`,'--window-size=1120,2080','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function retry(fn){for(let i=0;i<250;i++){try{const value=await fn();if(value)return value;}catch{}await sleep(100);}throw Error('Cloud visual browser readiness timeout');}
let socket;
try {
  const page=await retry(async()=> (await(await fetch('http://127.0.0.1:9231/json/list')).json()).find(p=>p.type==='page'));
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let id=0;const pending=new Map(), errors=[];
  socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1120,height:2080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:5191'});await retry(()=>evaluate('!!globalThis.__cloudVisual'));
  const samples=[];let manifest;
  for(const view of ['2d','1d'])for(const terrain of [false,true])for(const [face,name] of [[0,'F0-previous-head'],[1,'F1-direct-dark'],[2,'F2-direct-light'],[-1,'faces-off']]){
    manifest=await evaluate(`__cloudVisual.render(${JSON.stringify({face,terrain,view})})`);assert.equal(manifest.samples,15);assert.equal(manifest.invariant,true);
    const caption=`${view} · ${name} · terrain ${terrain?'on':'off'} · static audit fixtures`;
    await evaluate(`document.querySelector('#fixture-caption').textContent=${JSON.stringify(caption+' | P0 previous sky/pastel; P1 selected twilight/bright pastel; P2 parchment/ink clouds. Fixed transfer function; no evolved-dynamics claim.')}`);
    const height=await evaluate('Math.ceil(document.querySelector("#visual-audit").getBoundingClientRect().height)');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1080,height,scale:1}});
    const file=`${view}-${name}-terrain-${terrain?'on':'off'}.png`;await writeFile(join(out,file),Buffer.from(shot.data,'base64'));
    samples.push({view,face,name,terrain,caption,file,data:shot.data});
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  const sourceHashes=[];
  for(const path of ['scripts/cloud-action-visual-fixtures.mjs','packages/web/src/App.tsx','packages/web/src/render/creatureDecoration.ts','packages/web/src/creatureIdentity.ts','packages/web/src/render/creatures2d.ts','packages/web/src/render/density2d.ts','packages/web/src/render/projection1d.ts','packages/web/src/render/potential2d.ts','packages/web/src/world/world2d.ts','packages/sim-core/src/gaussian2d.ts','packages/sim-core/src/observables2d.ts']) {
    const bytes=await readFile(path);sourceHashes.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  const details={node:process.version,sourceHashes,ownerSelection:{face:'F1',palette:'P1'},note:'Owner selected F1/P1; broader visual acceptance remains open. Static hand-prepared states, not evolved dynamics. No measurement/scheduling/whole-UI acceptance claim.',browser:(await send('Browser.getVersion')).product,viewport:{width:1120,height:2080,dpr:1,actualBrowserZoom:'not measured'},...manifest,samples:samples.map(({data,...s})=>s),errors};
  await writeFile(join(out,'manifest.json'),JSON.stringify(details,null,2));
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const html=`<!doctype html><meta charset="utf-8"><title>Psi Zoo palette and face review</title><style>body{max-width:1120px;margin:auto;padding:24px;background:#faf7fc;color:#302a45;font:17px system-ui}img{max-width:100%;height:auto}a{color:#563674}section{margin:40px 0}nav{display:flex;flex-wrap:wrap;gap:16px}pre{white-space:pre-wrap}</style><h1>Palette / face selection — owner review</h1><p>This self-contained file opens locally. The owner selected <b>P1 twilight + F1 direct dark ink</b>. P0 previous, P2 parchment, F2 light ink and F0 previous head/ring are retained comparisons, not switches in the shipped UI. The density transfer function is unchanged. Diffuse-face contrast and crowded overlap labels remain open visual limitations.</p><p>Every sheet uses the same compact, diffuse, coherent split, independent overlap and wall-adjacent states, fixed brightness f(ρ)=1−exp(−ρ/0.08), additive layer order and zero-boundary geometry. Face anchors are density features, not measured locations. Terrain and faces toggle independently. The marginal keeps its existing shared linear scale, average-terrain band and background; only identity colors and audit face proposals vary. Wall clipping deliberately suppresses unsafe anchors. No animation, measurement or evolution ran.</p><nav>${samples.map(s=>`<a href="#${s.file}">${escape(s.caption)}</a>`).join('')}</nav><h2>Palette RGB definitions</h2><pre>${escape(JSON.stringify(manifest.palettes,null,2))}</pre>${samples.map(s=>`<section id="${s.file}"><h2>${escape(s.caption)}</h2><img alt="${escape(s.caption)}; three palette columns and five state rows" src="data:image/png;base64,${s.data}"></section>`).join('')}<p>Generated by scripts/cloud-action-visual-fixtures.mjs. Browser: ${escape(details.browser)}. Screenshot viewport emulation is not real-device or browser-zoom evidence.</p>`;
  await writeFile(join(out,'REVIEW.html'),html);
  console.log(`VISUAL REVIEW: ${join(out,'REVIEW.html')}`);console.log(`MANIFEST: ${join(out,'manifest.json')}`);console.log('PASS: 240 static comparison cells across both views; all amplitudes/time/receipts/draws preserved; no browser errors. Owner selection: F1/P1; broader visual acceptance remains open.');
} finally {socket?.close();chrome.kill();await new Promise(r=>server.close(r));}
