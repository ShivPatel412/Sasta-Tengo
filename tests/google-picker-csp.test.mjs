import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import config from '../next.config.mjs';

test('Studio Google scripts, Identity connections and Picker frames pass the narrow CSP',async()=>{
  const rule=(await config.headers()).find(rule=>rule.source==='/:path*');
  const value=rule.headers.find(header=>header.key==='Content-Security-Policy').value;
  const directives=Object.fromEntries(value.split(';').map(part=>part.trim().split(/\s+/)).map(([name,...sources])=>[name,sources]));
  const script=await readFile(new URL('../app/dashboard/[[...path]]/instagram-google.js',import.meta.url),'utf8');
  const scriptURLs=[...script.matchAll(/https:\/\/[^'\s]+/g)].map(match=>match[0]).filter(url=>url.includes('/gsi/client')||url.includes('/js/api.js'));
  assert.equal(scriptURLs.length,2);
  const allows=(directive,address)=>directives[directive].some(source=>{
    if(!source.startsWith('https://'))return false;
    const allowed=new URL(source),url=new URL(address);
    return allowed.origin===url.origin&&(allowed.pathname==='/'||allowed.pathname.endsWith('/')?url.pathname.startsWith(allowed.pathname):url.pathname===allowed.pathname);
  });
  for(const address of scriptURLs)assert(allows('script-src',address),address);
  assert(allows('style-src','https://accounts.google.com/gsi/style'));
  assert(allows('connect-src','https://accounts.google.com/gsi/status'));
  assert(allows('connect-src','https://apis.google.com/js/api.js'));
  assert(allows('frame-src','https://accounts.google.com/gsi/iframe/select'));
  assert(allows('frame-src','https://docs.google.com/picker?origin=https%3A%2F%2Fwww.shivpatel.in'));
  assert(!allows('script-src','https://accounts.google.com/unrelated-script.js'));
  assert(!allows('frame-src','https://docs.google.com/document/unrelated'));
  assert(!allows('frame-src','https://evil.example/picker'));
  assert.deepEqual(directives['default-src'],["'self'"]);
  assert.deepEqual(directives['frame-ancestors'],["'none'"]);
  assert.deepEqual(directives['object-src'],["'none'"]);
});
