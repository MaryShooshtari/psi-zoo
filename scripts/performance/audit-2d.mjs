// Production-bundled, dependency-free Chrome/CDP + Node performance audit.
// node --expose-gc scripts/performance/audit-2d.mjs --out /absolute/results --seconds 60
// --components-only skips sustained runs; --skip-components runs playback/UI only.
import { buildAudit } from './build-audit.mjs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { tmpdir, cpus, platform, release, totalmem, freemem } from 'node:os';
import { pathToFileURL } from 'node:url';
const arg=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const out=resolve(arg('--out',join(tmpdir(),'psi-audit-'+Date.now()))), seconds=Number(arg('--seconds','60'));
if(!Number.isFinite(seconds)||seconds<=0)throw new RangeError('--seconds must be positive and finite');
await mkdir(out,{recursive:true});
const bundle=join(out,'bundle');
await buildAudit(arg('--source-root','.'),bundle);
if(process.argv.includes('--bundle-only')){console.log(bundle);process.exit(0);}
const audit=await import(pathToFileURL(join(bundle,'audit.mjs')));
const environment={date:new Date().toISOString(),node:process.version,versions:process.versions,os:{platform:platform(),release:release(),cpus:cpus(),totalmem:totalmem(),freemem:freemem()},build:'Vite production bundle, minify=false for audit; standard minified production UI',seconds,chromeFlags:['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--window-size=1280,1000'],note:'CPU throttling set to 1 via CDP; OS power/thermal throttling not controlled'};
if(!process.argv.includes('--skip-components')&&!process.argv.includes('--memory-only')){
 global.gc?.();const before=process.memoryUsage();const results={};
 for(const name of await audit.benchmarks(false,'list')){const isolated=await import(pathToFileURL(join(bundle,'audit.mjs')).href+'?case='+encodeURIComponent(name));Object.assign(results,await isolated.benchmarks(false,name));}
 global.gc?.();await writeFile(join(out,'node.json'),JSON.stringify({environment,before,after:process.memoryUsage(),results},null,2));
}
const server=createServer(async(req,res)=>{try{let file=req.url.split('?')[0]==='/audit.mjs'?join(bundle,'audit.mjs'):join(resolve(arg('--ui-root','packages/web/dist')),decodeURIComponent(req.url.split('?')[0]));if((await stat(file)).isDirectory())file=join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(5195,'127.0.0.1',r));
const profile=await mkdtemp(join(tmpdir(),'psi-audit-chrome-'));
const chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',[...environment.chromeFlags,'--remote-debugging-port=9235',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let socket;const errors=[];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function retry(fn){for(let k=0;k<200;k++){try{const v=await fn();if(v)return v;}catch{}await sleep(100);}throw Error('Readiness timeout');}
try{
 const page=await retry(async()=> (await (await fetch('http://127.0.0.1:9235/json/list')).json()).find(p=>p.type==='page'));
 socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');await send('Performance.enable');await send('Emulation.setCPUThrottlingRate',{rate:1});await send('Page.bringToFront');
 environment.chrome=await send('Browser.getVersion');
 await send('Page.navigate',{url:'http://127.0.0.1:5195/'});await retry(()=>evaluate(`!!document.querySelector('button')`));
 await evaluate(`import('/audit.mjs').then(m=>{window.audit=m;})`);
 environment.browser=await evaluate(`({visibility:document.visibilityState,hardwareConcurrency:navigator.hardwareConcurrency,dpr:devicePixelRatio,userAgent:navigator.userAgent})`);
 if(!process.argv.includes('--skip-components')&&!process.argv.includes('--memory-only')){
  const results={};for(const name of await evaluate(`audit.benchmarks(true,'list')`))Object.assign(results,await evaluate(`import('/audit.mjs?case='+${JSON.stringify(name)}).then(m=>m.benchmarks(true,${JSON.stringify(name)}))`));await writeFile(join(out,'chrome.json'),JSON.stringify({environment,results},null,2));
  await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:1000});await send('Profiler.start');await evaluate('audit.profileWork()');const p=await send('Profiler.stop');await writeFile(join(out,'cpu-profile.json'),JSON.stringify(p));await send('Profiler.disable');
 }
 if(process.argv.includes('--memory-only')){
  // Actual UI without timing arrays/counters: retained heap of a live world.
  await evaluate(`window.button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith(t));button('2D creature world').click()`);await retry(()=>evaluate(`!!document.querySelector('.world-inspector')`));
  const memory=[];
  for(const name of audit.scenarios){
   await evaluate(`button(${JSON.stringify(name==='bell'||name==='two-pairs'?'World: entangled friendship':'World: independent')}).click()`);await sleep(200);
   if(name==='two-interacting')await evaluate(`document.querySelector('[aria-label="Mood drives"]').click();document.querySelector('[aria-label="Social interactions"]').click()`);
   if(name.includes('four')||name==='two-pairs'){await evaluate(`button('Add creature').click()`);await sleep(100);await evaluate(`button('Add creature').click()`);await sleep(100);if(name==='two-pairs')await evaluate(`button('Entangle moods').click()`);}
   await evaluate(`button('Play').click()`);await sleep(5000);
   const marks=[];for(let k=0;k<3;k++){if(k)await sleep(seconds*500);await send('HeapProfiler.collectGarbage');marks.push({atSeconds:k*seconds/2,heap:await send('Runtime.getHeapUsage'),dom:await send('Memory.getDOMCounters')});}
   await evaluate(`button('Pause').click()`);memory.push({name,marks});await writeFile(join(out,'memory.json'),JSON.stringify({environment,memory,errors},null,2));console.log('Memory',name);
  }
 }
 if(!process.argv.includes('--components-only')&&!process.argv.includes('--memory-only')){
  const sessions=[];
  for(const name of audit.scenarios){await send('HeapProfiler.collectGarbage');const heapBefore=await send('Runtime.getHeapUsage'),domBefore=await send('Memory.getDOMCounters');
   const result=await evaluate(`audit.playback(${JSON.stringify(name)},${seconds})`),heapAfter=await send('Runtime.getHeapUsage');await send('HeapProfiler.collectGarbage');const heapAfterGC=await send('Runtime.getHeapUsage'),domAfter=await send('Memory.getDOMCounters');sessions.push({...result,heapBefore,heapAfter,heapAfterGC,domBefore,domAfter});
   await writeFile(join(out,'playback.json'),JSON.stringify({environment,sessions,errors},null,2));console.log(name,result.ratio.toFixed(3),result.fps.toFixed(1),'fps');
  }
  // Actual production React UI: rAF callbacks, Canvas calls, commits (MutationObserver),
  // input event-loop latency and CDP task/layout durations. No hooks in app source.
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.auditCounters={raf:0,draws:0,rafMs:[],commits:0,longTasks:[]};const request=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>request(t=>{const a=performance.now();cb(t);auditCounters.raf++;auditCounters.rafMs.push(performance.now()-a);});const put=CanvasRenderingContext2D.prototype.putImageData;CanvasRenderingContext2D.prototype.putImageData=function(...args){auditCounters.draws++;return put.apply(this,args);};new PerformanceObserver(list=>auditCounters.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});`});
  await send('Page.reload');await retry(()=>evaluate(`!!document.querySelector('.creature-inspector')`));await evaluate(`window.button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith(t));button('2D creature world').click()`);await retry(()=>evaluate(`!!document.querySelector('.world-inspector')`));
  const ui=[];
  for(const name of audit.scenarios){
   await evaluate(`button(${JSON.stringify(name==='bell'||name==='two-pairs'?'World: entangled friendship':'World: independent')}).click()`);await sleep(200);
   if(name==='two-interacting')await evaluate(`document.querySelector('[aria-label="Mood drives"]').click();document.querySelector('[aria-label="Social interactions"]').click()`);
   if(name.includes('four')||name==='two-pairs'){await evaluate(`button('Add creature').click()`);await sleep(100);await evaluate(`button('Add creature').click()`);await sleep(100);if(name==='two-pairs')await evaluate(`button('Entangle moods').click()`);}
   await evaluate(`button('Play').click()`);await sleep(5000);
   // Drop previous scene's instrumentation before the warm live-heap baseline.
   await evaluate(`auditCounters={raf:0,draws:0,rafMs:[],commits:0,longTasks:[]};window.latencies=[];`);
   await send('HeapProfiler.collectGarbage');const heapBefore=await send('Runtime.getHeapUsage'),metricsBefore=await send('Performance.getMetrics');
   await evaluate(`window.physical=()=>Number([...document.querySelectorAll('.diagnostics span')].find(e=>e.textContent.startsWith('Physical time:')).textContent.split(':')[1]);window.t0=performance.now();window.p0=physical();auditCounters={raf:0,draws:0,rafMs:[],commits:0,longTasks:[]};window.mo=new MutationObserver(()=>auditCounters.commits++);mo.observe(document.querySelector('main'),{subtree:true,childList:true,characterData:true});window.latencies=[];window.nextTick=performance.now()+100;window.tick=setInterval(()=>{const now=performance.now();latencies.push(Math.max(0,now-nextTick));nextTick=now+100;},100);`);
   await sleep(seconds*1000);
   const result=await evaluate(`(()=>{const r={name:${JSON.stringify(name)},wallSeconds:(performance.now()-t0)/1000,physicalSeconds:physical()-p0,...auditCounters,latencies};button('Pause').click();mo.disconnect();clearInterval(tick);return r;})()`);
   const metricsAfter=await send('Performance.getMetrics'),heapAfter=await send('Runtime.getHeapUsage');await send('HeapProfiler.collectGarbage');const heapAfterGC=await send('Runtime.getHeapUsage');
   ui.push({...result,heapBefore,heapAfter,heapAfterGC,metricsBefore,metricsAfter});await writeFile(join(out,'ui.json'),JSON.stringify({environment,ui,errors},null,2));console.log('UI',name,(result.physicalSeconds/result.wallSeconds).toFixed(3));
  }
 }
 await writeFile(join(out,'environment.json'),JSON.stringify({environment,errors},null,2));if(errors.length)throw Error('Browser runtime errors');console.log('Results:',out);
}finally{socket?.close();chrome.kill();await new Promise(r=>server.close(r));}
