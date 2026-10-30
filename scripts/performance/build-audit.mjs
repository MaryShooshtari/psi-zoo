import { build } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
/** Bundle the same audit harness against an explicitly captured source tree.
 * Never check out, modify, or compile into that source tree. */
export async function buildAudit(sourceRoot, out) {
  sourceRoot=resolve(sourceRoot).replaceAll('\\','/');await mkdir(out,{recursive:true});
  const text=(await readFile(new URL('./audit2d.ts',import.meta.url),'utf8')).replaceAll('../../packages/',sourceRoot+'/packages/');
  const entry=join(out,'audit-entry.ts');await writeFile(entry,text);
  await build({configFile:false,logLevel:'error',resolve:{alias:{'@psi-zoo/sim-core':sourceRoot+'/packages/sim-core/src/index.ts'}},build:{outDir:out,emptyOutDir:false,minify:false,sourcemap:true,lib:{entry,formats:['es'],fileName:()=> 'audit.mjs'}}});
  return join(out,'audit.mjs');
}
