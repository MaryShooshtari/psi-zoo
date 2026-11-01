import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Full mounted production UI with audit-only setup/readback. No shipped hooks. */
export async function checkPlayground({ evaluate, send, check, retry, sleep, out }) {
  const click = text => evaluate(`(()=>{const b=button(${JSON.stringify(text)})||document.querySelector('button[aria-label=${JSON.stringify(text)}]');b.focus();b.click();})()`);
  const init = async () => {
    await retry(() => evaluate(`!!window.__actions&&!!document.querySelector('.world-inspector')`));
    await evaluate(`window.button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent===t);
      window.domainCapture=()=>{const c=__controller,w=c.world;return{controller:c,world:w,geometry:c.psi,values:w.ids.map(id=>w.spatialState(id).values),potential:c.potential,time:w.time,snapshot:JSON.stringify(w.getSnapshot())};};
      window.domainSame=s=>{const n=domainCapture();return n.controller===s.controller&&n.world===s.world&&n.geometry===s.geometry&&n.time===s.time&&n.snapshot===s.snapshot&&n.values.every((v,j)=>v.every((a,i)=>Object.is(a,s.values[j][i])))&&n.potential.every((v,i)=>Object.is(v,s.potential[i]));};
      button('Not now')?.click();
      const faces=document.querySelector('input[aria-label="Show creature decorations"]');if(faces&&!faces.checked)faces.click();
      window.worldViewport=()=>{const r=document.querySelector('.density-2d').getBoundingClientRect(),g=__controller.psi,lx=g.xmax-g.xmin,ly=g.ymax-g.ymin,scale=Math.min(r.width/lx,r.height/ly);return{x:r.x+(r.width-lx*scale)/2,y:r.y+(r.height-ly*scale)/2,width:lx*scale,height:ly*scale,scale};};`);
  };
  const page = async name => {
    if (await evaluate(`document.querySelector('.settings-popover').hidden`)) await click('Menu ☰');
    await evaluate(`(()=>{const back=button('← Back to menu');if(back.getClientRects().length)back.click();document.querySelector('[data-settings-link=${JSON.stringify(name)}]').click();})()`);
  };
  const shot = async name => { const image = await send('Page.captureScreenshot',{format:'png'}); await writeFile(join(out,name),Buffer.from(image.data,'base64')); };
  await init();
  check('Desktop actual physical domain covers at least 98% of both playground axes', await evaluate(`(()=>{const r=document.querySelector('.density-2d').getBoundingClientRect(),v=worldViewport(),g=__controller.psi;return v.width/r.width>.98&&v.height/r.height>.98&&g.xmax>10&&g.xmin< -10&&g.nx!==g.ny&&Math.abs(g.dx-20/129)<1e-14&&Math.abs(g.dy-g.dx)<1e-14&&g.nx*g.ny<16800;})()`));
  check('No permanent instruction banner or full-width result strip', await evaluate(`!document.querySelector('.view-explanation')&&document.querySelector('.action-result-region').parentElement.classList.contains('playground')&&document.querySelector('[data-action-sequence]').classList.contains('visually-hidden')`));
  check('Help sits inside bottom playback controls with matching button styling', await evaluate(`(()=>{const b=document.querySelector('.museum-trigger'),p=button('Reset evolution'),s=getComputedStyle(b),t=getComputedStyle(p);return !!b.closest('.playback-bar')&&!b.closest('.shell-header')&&s.fontSize===t.fontSize&&s.backgroundColor===t.backgroundColor&&s.borderRadius===t.borderRadius;})()`));
  await shot('playground-desktop.png');
  await evaluate(`window.savedDomain=domainCapture();button('1D view').click()`); await retry(() => evaluate(`document.querySelector('main').dataset.morphing==='false'`));
  check('1D switch preserves geometry, every spatial/mood value, terrain and time',await evaluate(`domainSame(savedDomain)`));
  await shot('playground-projection.png');
  await click('What am I seeing?');
  check('On-demand help retains marginal/terrain distinction and Gaussian measurement science', await evaluate(`document.querySelector('dialog[open]').textContent.includes('not an exact effective 1D Hamiltonian')&&document.querySelector('dialog[open]').textContent.includes('finite-resolution Gaussian')`));
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await retry(() => evaluate(`!document.querySelector('dialog[open]')`));
  await retry(() => evaluate(`document.activeElement===document.querySelector('.museum-trigger')`));
  check('Science Escape returns focus to the bottom help trigger',await evaluate(`document.activeElement===document.querySelector('.museum-trigger')`));
  await click('2D view'); await retry(() => evaluate(`document.querySelector('main').dataset.morphing==='false'`));
  await page('Terrain');
  await evaluate(`document.querySelector('[name="terrain-tool"][value="barrier"]').click()`); await retry(() => evaluate(`document.querySelector('.settings-popover').hidden`));
  const p = await evaluate(`(()=>{const v=worldViewport();return{x:v.x+.93*v.width,y:v.y+.5*v.height};})()`);
  await evaluate(`window.terrainBefore=domainCapture()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
  await retry(() => evaluate(`__controller.potential.some(v=>v>0)`));
  check('Pointer terrain editing reaches expanded horizontal coordinates beyond x=10',await evaluate(`(()=>{const g=__controller.psi,v=__controller.potential,k=v.indexOf(Math.max(...v)),x=g.xmin+(k%g.nx+1)*g.dx,next=domainCapture();return x>10&&terrainBefore.values.every((v,j)=>v.every((a,i)=>a===next.values[j][i]))&&__controller.world.time===terrainBefore.time;})()`));
  await click('Clear terrain'); await evaluate(`button('Cancel terrain tool')?.click()`);
  // Independently specified Gaussian fixture, staged in a replacement world via
  // test-only object access. Evolution below uses the unchanged authoritative solver.
  const fixture = async (x0, px) => evaluate(`(()=>{const c=__controller,g=c.psi,old=c.world,s=old.state('a');let norm=0;for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const k=2*(j*g.nx+i),x=g.xmin+(i+1)*g.dx,y=g.ymin+(j+1)*g.dy,a=Math.exp(-((x-${x0})**2)/(4*.7**2)-y*y/4);s.psi.values[k]=a*Math.cos(${px}*x);s.psi.values[k+1]=a*Math.sin(${px}*x);norm+=a*a*g.dx*g.dy;}for(let k=0;k<s.psi.values.length;k++)s.psi.values[k]/=Math.sqrt(norm);c.worldModel=new old.constructor(g,{creatures:[s],interactions:{drives:false,social:false,strength:3,range:2}});__actions.refresh();})()`);
  await fixture(5,2);
  await evaluate(`(()=>{const c=__controller,g=c.psi,v=new Float64Array(g.nx*g.ny);for(let n=0;n<360;n++)c.world.step(v,c.dt);__actions.refresh();window.marginal=new Float64Array(g.nx);c.world.copyProjectedDensityX('a',marginal);window.outerMass=marginal.reduce((sum,rho,i)=>sum+(g.xmin+(i+1)*g.dx>10?rho*g.dx:0),0);})()`);
  check('Actual evolved packet propagates into formerly unused horizontal space',await evaluate(`outerMass>.55&&__controller.world.getSnapshot().creatures[0].x>10&&Math.abs(__controller.world.getSnapshot().creatures[0].norm-1)<2e-12`));
  check('Rectangular 1D marginal integrates to the same full 2D norm',await evaluate(`Math.abs(marginal.reduce((a,b)=>a+b,0)*__controller.psi.dx-__controller.world.getSnapshot().creatures[0].norm)<1e-13`));
  await shot('playground-propagation.png');
  await fixture(12,0);
  await page('Experiments'); await evaluate(`document.querySelector('[data-settings-link="Measure position"]').click()`);
  await retry(() => evaluate(`!!document.querySelector('select[aria-label="Position target"]')`));
  await evaluate(`const e=document.querySelector('select[aria-label="Position target"]');e.value='a';e.dispatchEvent(new Event('change',{bubbles:true}));`);
  await click('Apply x/y position measurement'); await sleep(100);
  check('Mounted Gaussian detector reports real expanded-domain coordinates',await evaluate(`__controller.world.lastAction?.kind==='spatial-measurement'&&__controller.world.lastAction.x>10&&__controller.world.lastAction.axes==='xy'`));
  check('Confirmation is short and receipt remains an accessible stable announcement',await evaluate(`document.querySelector('.action-toast').textContent.length<60&&document.querySelector('[data-action-sequence]').getAttribute('role')==='status'&&document.querySelector('[data-action-sequence]').textContent.includes('detector')`));
  check('Compact confirmation has no spurious scrollbars', await evaluate(`(()=>{const r=document.querySelector('.action-result-region');return r.scrollHeight<=r.clientHeight&&r.scrollWidth<=r.clientWidth;})()`));
  await shot('playground-confirmation.png'); await sleep(3300);
  check('Informational confirmation dismisses without discarding the receipt or leaving a strip',await evaluate(`!document.querySelector('.action-toast')&&document.querySelector('.action-result-region').clientHeight===0&&!!document.querySelector('[data-action-sequence]').dataset.actionSequence&&__controller.world.lastAction.kind==='spatial-measurement'`));
  await shot('playground-after-confirmation.png');
  await page('Experiments'); await evaluate(`document.querySelector('.action-details').open=true`);
  check('Detailed result remains available on demand in Experiments',await evaluate(`document.querySelector('.action-details').textContent.includes('detector')&&document.querySelector('.action-details').getClientRects().length>0`));
  await click('Close settings');
  await click('World: independent');
  await evaluate(`window.runStart=performance.now();window.physicalStart=__controller.world.time;window.frames=0;window.counting=true;window.countFrame=()=>{if(counting){frames++;requestAnimationFrame(countFrame);}};requestAnimationFrame(countFrame);button('Play').click()`);
  await sleep(5000);
  const runtime = await evaluate(`(()=>{button('Pause').click();counting=false;const g=__controller.psi;return{wallSeconds:(performance.now()-runStart)/1000,physicalSeconds:__controller.world.time-physicalStart,frames,nx:g.nx,ny:g.ny,creatures:__controller.world.ids.length,norms:__controller.world.getSnapshot().creatures.map(c=>c.norm)};})()`);
  check('Bounded two-creature browser playback stays finite on the rectangular domain',runtime.creatures===2&&runtime.physicalSeconds>0&&runtime.norms.every(n=>Math.abs(n-1)<1e-10));
  await writeFile(join(out,'bounded-domain-runtime.json'),JSON.stringify(runtime,null,2)); console.log('Bounded two-creature runtime (not sustained acceptance)',runtime);
  await evaluate(`window.resizeBefore=domainCapture()`);
  await send('Emulation.setDeviceMetricsOverride',{width:1100,height:700,deviceScaleFactor:1,mobile:false}); await sleep(120);
  check('Ordinary browser resizing never reconstructs or resets the world',await evaluate(`domainSame(resizeBefore)`));
  // Fresh experiments use the real aspect of each device; resizing an existing
  // experiment above deliberately preserved its geometry instead of resampling.
  for (const [width,height] of [[390,844],[512,300]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await send('Page.reload'); await init(); await sleep(180);
    check(`${width}x${height}: fresh physical world fills the responsive playground`,await evaluate(`(()=>{const r=document.querySelector('.density-2d').getBoundingClientRect(),v=worldViewport();return v.width/r.width>.98&&v.height/r.height>.98&&document.scrollingElement.scrollWidth===innerWidth&&document.scrollingElement.scrollHeight===innerHeight;})()`));
    check(`${width}x${height}: essential controls, title and bottom help remain usable`,await evaluate(`(()=>{const b=document.querySelector('.museum-trigger'),r=b.getBoundingClientRect(),title=document.querySelector('.shell-brand').getBoundingClientRect();return r.bottom<=innerHeight&&r.right<=innerWidth&&r.width>0&&title.width>0&&title.height>0&&getComputedStyle(document.querySelector('.shell-brand')).display!=='none'&&!!b.closest('.playback-bar');})()`));
    await evaluate(`window.switchBefore=domainCapture();button('1D view').click()`); await retry(() => evaluate(`document.querySelector('main').dataset.morphing==='false'`));
    check(`${width}x${height}: switching keeps physical state and control positions`,await evaluate(`domainSame(switchBefore)`));
    await click('2D view'); await retry(() => evaluate(`document.querySelector('main').dataset.morphing==='false'`));
    await shot(`playground-${width}x${height}.png`);
  }
}
