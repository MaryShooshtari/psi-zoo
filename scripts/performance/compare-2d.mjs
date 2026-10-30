// Controlled AB/BA comparison of captured pre-optimization source and current
// source. The same production-bundled harness runs in one Node/Chrome environment.
// node --expose-gc scripts/performance/compare-2d.mjs --before C:/capture --out D:/results
import { buildAudit } from './build-audit.mjs';
import { mkdir,writeFile,readFile,mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { resolve,join } from 'node:path';
import { tmpdir,cpus,release } from 'node:os';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const arg=(n,d)=>process.argv.includes(n)?process.argv[process.argv.indexOf(n)+1]:d;
if(!arg('--before'))throw Error('--before must name an unmodified captured source tree');
const out=resolve(arg('--out',join(tmpdir(),'psi-comparison-'+Date.now())));await mkdir(out,{recursive:true});
const paths={before:await buildAudit(arg('--before'),join(out,'before')),after:await buildAudit('.',join(out,'after'))};
const modules={};for(const [key,path]of Object.entries(paths))modules[key]=await import(pathToFileURL(path));
const names=['world.two-independent','world.two-interacting','world.bell','world.four-independent','world.two-pairs','world.pair-plus-two','snapshot.two-interacting','snapshot.bell','potential.prepare.interacting','potential.prepare.bell','pixels.two','pixels.four'];
const env={date:new Date().toISOString(),node:process.version,cpu:cpus()[0],logicalProcessors:cpus().length,os:release(),sourceBefore:resolve(arg('--before')),sourceAfter:process.cwd(),configuration:'same production ES bundle, minify false; five AB/BA batches per case, 100 warmups + 40 samples per source/batch; no source initialization timed'};
function merge(reports){const samples=reports.flatMap(r=>r.batches);return {...modules.after.summary(reports.flatMap(r=>r.samples)),batches:samples,samplesPerBatch:40,warmupsPerBatch:100,batchCount:5};}
async function measure(run,list){const results={};for(const name of list){const batches={before:[],after:[]};for(let k=0;k<5;k++){for(const key of k%2?['after','before']:['before','after'])batches[key].push((await run(key,name,k))[name]);}results[name]={before:merge(batches.before),after:merge(batches.after)};}return results;}
if(!process.argv.includes('--browser-only')&&!process.argv.includes('--equivalence-only')){const node=await measure(async(key,name,k)=>{const m=await import(pathToFileURL(paths[key]).href+`?case=${name}&batch=${k}`);return m.benchmarks(false,name,1);},names);await writeFile(join(out,'comparison-node.json'),JSON.stringify({env,results:node},null,2));}
// Full-state equivalence is intentionally outside timed samples.
const checks=[];for(const scenario of ['two-independent','two-interacting','bell','four-independent','two-pairs','pair-plus-two']){
 const a=modules.before.makeWorld(scenario),b=modules.after.makeWorld(scenario),g=modules.after.core.createPsiGrid2D(),v=modules.after.core.verticalBarrier2D(g,6,-.4,.4,.22);
 for(let k=0;k<100;k++){if(k===50)v[0]+=.25;a.step(v,1/120);b.step(v,1/120);if(k%10===0){assert.deepEqual(b.getSnapshot(),a.getSnapshot());for(const id of a.ids)assert.deepEqual(b.spatialState(id).values,a.spatialState(id).values);}}
 for(const id of a.ids)assert.deepEqual(b.spatialState(id).values,a.spatialState(id).values);
 for(const p of a.getSnapshot().pairs){assert.deepEqual(b.measureMood(p.id,p.creatureAId,'X'),a.measureMood(p.id,p.creatureAId,'X'));assert.deepEqual(b.measureMood(p.id,p.creatureBId,'Z'),a.measureMood(p.id,p.creatureBId,'Z'));a.measureAndRelease(p.id,'X');b.measureAndRelease(p.id,'X');}
 assert.deepEqual(b.getSnapshot(),a.getSnapshot());a.resetEvolution();b.resetEvolution();assert.deepEqual(b.getSnapshot(),a.getSnapshot());checks.push(scenario+': spatial arrays and diagnostic snapshots bit-identical, measurements/release/reset identical; mid-run terrain edit included');
}
const g=modules.after.core.createPsiGrid2D(),pixelsA=new Uint8ClampedArray(4*g.nx*g.ny),pixelsB=pixelsA.slice();for(let count=1;count<=4;count++){const w=modules.before.makeWorld('four-independent'),layers=w.ids.slice(0,count).map(id=>({density:modules.before.core.probabilityDensity2D(w.spatialState(id)),color:modules.before.creatureColor2D(id)}));modules.before.fillCreatureDensityPixels2D(g,layers,pixelsA);modules.after.fillCreatureDensityPixels2D(g,layers,pixelsB);assert.deepEqual(pixelsA,pixelsB);}checks.push('1–4 density layers: identical Uint8 image bytes');await writeFile(join(out,'equivalence.json'),JSON.stringify({checks},null,2));
if(process.argv.includes('--equivalence-only')){console.log('Equivalence passed:',out);process.exit(0);}
const server=createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body>2D audit</body></html>');return;}const key=req.url.split('/')[1],file=paths[key];res.setHeader('Content-Type','text/javascript');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(5196,'127.0.0.1',r));
const chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9236',`--user-data-dir=${await mkdtemp(join(tmpdir(),'psi-compare-'))}`,'--window-size=1280,1000','about:blank'],{stdio:'ignore'});
let socket;const errors=[];try{
 let pages;for(let k=0;k<200;k++){try{pages=await(await fetch('http://127.0.0.1:9236/json/list')).json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:'http://127.0.0.1:5196/'});for(let k=0;k<100;k++){if(await evaluate(`location.origin==='http://127.0.0.1:5196' && document.readyState==='complete'`))break;await new Promise(r=>setTimeout(r,50));}await send('Emulation.setCPUThrottlingRate',{rate:1});await send('Page.bringToFront');env.chrome=await send('Browser.getVersion');
 const browser=await measure((key,name,k)=>evaluate(`import('/${key}/audit.mjs?case=${name}&batch=${k}').then(m=>m.benchmarks(true,${JSON.stringify(name)},1))`),[...names,'render.two-interacting','render.bell','render.four-independent','render.two-pairs']);
 const phases={};for(const key of ['before','after'])phases[key]=await evaluate(`import('/${key}/audit.mjs?phases').then(m=>['two-interacting','bell','four-independent'].map(m.phaseBreakdown))`);await writeFile(join(out,'phase-breakdown.json'),JSON.stringify(phases,null,2));
 await writeFile(join(out,'comparison-chrome.json'),JSON.stringify({env,results:browser,errors},null,2));assert.equal(errors.length,0);console.log(out);
}finally{socket?.close();chrome.kill();server.close();}
