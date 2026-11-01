import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
/** Run through the existing Chrome harness:
 * node scripts/projection-browser-check.mjs --readme
 * GitHub's real Markdown API parses the actual file. Local MathJax SVG and
 * Mermaid then verify readable output; this is not the live published README.
 * Renderer downloads go only to temporary audit output, not dependencies. */
export async function checkReadme({ evaluate, send, check, retry, sleep, out }) {
  const md = await readFile('README.md', 'utf8');
  const slug = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/ /g, '-');
  const headingIds = Object.fromEntries([...md.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => [m[1], slug(m[1])]));
  const anchors = new Set(Object.values(headingIds));
  const links = [...md.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)].map(m => m[1]);
  for (const link of links) {
    if (/^https?:/.test(link)) continue;
    const [path, fragment] = link.split('#');
    if (path) await stat(resolve(path));
    else assert.ok(anchors.has(fragment), `Missing README anchor: ${fragment}`);
  }
  check('Every relative README link, image and local navigation target exists', true);
  const packages = JSON.parse(await readFile('package.json', 'utf8'));
  for (const match of md.matchAll(/^npm run (\S+)/gm)) assert.ok(packages.scripts[match[1]], `Unknown npm script: ${match[1]}`);
  check('README run/test/typecheck/build commands match real root scripts', true);
  assert.equal((md.match(/^\$\$$/gm) ?? []).length, 6);
  assert.ok(!md.includes('\\\\') && !md.includes('\\$'), 'Do not double-escape TeX or dollar delimiters');
  const request = { text: md, mode: 'gfm' };
  const response = await fetch('https://api.github.com/markdown', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Psiways-README-validation' }, body: JSON.stringify(request) });
  assert.equal(response.status, 200, `GitHub Markdown API: ${response.status}`);
  const html = await response.text();
  // Check the parsed links too, including outer links around badge images.
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const link = match[1]; if (/^https?:/.test(link)) continue;
    const [path, fragment] = link.split('#');
    if (path) await stat(resolve(path));
    else assert.ok(anchors.has(fragment), `Missing rendered anchor: ${fragment}`);
  }
  await writeFile(join(out, 'github-markdown-response.html'), html);
  const mathCount = (html.match(/class="js-display-math"/g) ?? []).length;
  const inlineCount = (html.match(/class="js-inline-math"/g) ?? []).length;
  check('GitHub Markdown API recognizes all three display equations and inline units as math', mathCount === 3 && inlineCount === 1 && html.includes('\\hbar') && html.includes('\\Phi'));
  const download = async (url, file) => { const r = await fetch(url); assert.ok(r.ok, `${url}: ${r.status}`); await writeFile(file, Buffer.from(await r.arrayBuffer())); };
  const ui = join(out, 'ui');
  await download('https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js', join(ui, 'mathjax.js'));
  await download('https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-light.css', join(ui, 'markdown.css'));
  await mkdir(join(ui, 'docs/assets'), { recursive: true });
  for (const asset of ['psiways-terrarium.png', 'psiways-marginal.png', 'psiways-evolution.gif']) await copyFile(join('docs/assets', asset), join(ui, 'docs/assets', asset));
  // Resolve the actual badge SVGs locally so Camo/network availability does not
  // turn a browser preview into an unrelated console-resource error.
  let preview = html, badge = 0;
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = match[0], canonical = /data-canonical-src="([^"]+)"/.exec(tag)?.[1], src = /src="([^"]+)"/.exec(tag)?.[1];
    const url = (canonical ?? src)?.replaceAll('&amp;', '&');
    if (url?.startsWith('https://img.shields.io/')) {
      const file = `badge-${badge++}.svg`; await download(url, join(ui, file)); preview = preview.replace(tag, tag.replace(/src="[^"]+"/, `src="${file}"`));
    }
  }
  await writeFile(join(ui, 'readme-preview.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Psiways README preview</title><link rel="stylesheet" href="markdown.css"><style>body{margin:0;background:#fff}.markdown-body{box-sizing:border-box;max-width:980px;margin:36px auto;padding:28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.markdown-body img{height:auto}.markdown-body .mermaid{overflow:auto}.markdown-body .js-display-math{overflow-x:auto;max-width:100%}@media(max-width:700px){.markdown-body{margin:0;padding:20px 16px}}</style><article class="markdown-body">${preview}</article><script>for(const h of document.querySelectorAll('h1,h2,h3'))h.id=${JSON.stringify(headingIds)}[h.textContent]||'';window.MathJax={tex:{inlineMath:[['$','$']],displayMath:[['$$','$$']]},svg:{fontCache:'none'},options:{skipHtmlTags:['script','noscript','style','textarea','pre','code']}};</script><script src="mathjax.js"></script><script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.12.2/dist/mermaid.esm.min.mjs';mermaid.initialize({startOnLoad:false,theme:'base',themeVariables:{primaryColor:'#eee7fa',primaryTextColor:'#574b76',primaryBorderColor:'#bda9eb',lineColor:'#574b76',secondaryColor:'#e1f2ec',tertiaryColor:'#f8e6ef'}});for(const pre of document.querySelectorAll('pre')){if(pre.textContent.trim().startsWith('flowchart LR')){const d=document.createElement('div');d.className='mermaid';d.textContent=pre.textContent;pre.replaceWith(d);}}await mermaid.run();window.__diagramReady=true;</script></html>`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5191/readme-preview.html' });
  await retry(() => evaluate(`!!window.MathJax?.startup?.document&&!!window.__diagramReady&&document.querySelectorAll('math-renderer mjx-container svg').length===4`));
  await sleep(250);
  check('All equations produce nonempty SVG output without TeX errors', await evaluate(`document.querySelectorAll('math-renderer mjx-container svg').length===4&&!document.querySelector('[data-mjx-error],mjx-merror,[data-mml-node="merror"]')&&[...document.querySelectorAll('math-renderer svg')].every(e=>e.getBoundingClientRect().width>20&&e.getBoundingClientRect().height>10)`));
  check('Mermaid architecture renders a real diagram with all six layers', await evaluate(`!!document.querySelector('.mermaid svg')&&['React playground','World and creatures','TypeScript numerical core','Canvas2D','Numerical tests','Lean 4'].every(t=>document.querySelector('.mermaid').textContent.includes(t))`));
  check('Hero, marginal screenshot and three badges decode without broken image paths', await evaluate(`Array.from(document.querySelectorAll('img')).filter(e=>!e.closest('details')).every(i=>i.complete&&i.naturalWidth>0)&&document.querySelectorAll('img').length===6`));
  const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(out, name), Buffer.from(r.data, 'base64')); };
  await shot('readme-hero-desktop.png');
  await evaluate(`document.querySelector('a[href="#run-it-locally"]').click()`);
  check('README hero navigation reaches the intended heading with GitHub-style anchors', await evaluate(`location.hash==='#run-it-locally'&&Math.abs(document.querySelector('#run-it-locally').getBoundingClientRect().top)<2`));
  await evaluate(`document.querySelectorAll('h2')[1].scrollIntoView()`); await shot('readme-physics-desktop.png');
  await evaluate(`document.querySelector('.mermaid').scrollIntoView({block:'center'})`); await shot('readme-architecture-desktop.png');
  await evaluate(`document.querySelector('details').open=true;document.querySelector('details img').scrollIntoView({block:'center'})`); await sleep(150);
  check('The current-app GIF decodes in the rendered README disclosure', await evaluate(`const i=document.querySelector('details img');i.complete&&i.naturalWidth===960&&i.naturalHeight===600`));
  await shot('readme-demo-desktop.png');
  for (const width of [390, 768]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false }); await evaluate('scrollTo(0,0)'); await sleep(80);
    await shot(`readme-hero-${width}.png`);
    check(`${width}px: README hero and equations remain readable without page overflow`, await evaluate(`document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('math-renderer')].every(e=>e.getBoundingClientRect().right<=innerWidth)&&document.querySelector('img[src="docs/assets/psiways-terrarium.png"]').getBoundingClientRect().right<=innerWidth`));
  }
  await writeFile(join(out, 'readme-verification.json'), JSON.stringify({ githubMarkdownStatus: response.status, displayEquations: mathCount, inlineEquations: inlineCount, mathRenderer: 'MathJax 3.2.2 SVG', mermaid: '11.12.2', githubStyle: 'github-markdown-css 5.8.1 light', localLinks: links.filter(l => !l.startsWith('http')).length, note: 'Actual README parsed by GitHub Markdown API; SVG/layout inspected in a local compatible preview. Live repository README was not published or inspected.' }, null, 2));
}
