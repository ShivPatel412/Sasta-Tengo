import {build} from 'esbuild';
import {readdir,unlink} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
const result=await build({entryPoints:['game/main.jsx'],bundle:true,format:'esm',splitting:true,outdir:'static/hq',entryNames:'app',chunkNames:'chunk-[hash]',minify:true,jsx:'automatic',target:'es2022',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof',metafile:true});
const keep=new Set(Object.keys(result.metafile.outputs).map(path=>basename(path)));
const directory=resolve('static/hq');
for(const name of await readdir(directory)){
  if(/^(app|chunk-[A-Z0-9]+)\.(js|css)$/.test(name)&&!keep.has(name))await unlink(resolve(directory,name));
}
