import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('unsupported social dashboard actions remain gated until the API reports a real backend',async()=>{
  for(const file of ['youtube-studio.jsx']){
    const source=await readFile(new URL('../app/dashboard/[[...path]]/'+file,import.meta.url),'utf8');
    assert(source.includes('data.actions_available !== true'),file);
    for(const control of source.matchAll(/disabled=\{[^}]*readOnly[^}]*\}/g))assert(control[0].includes('data.actions_available !== true'),file+': '+control[0]);
    assert(source.includes('data.action_message'),file);
    assert(!source.includes('if (readOnly || busy) return;'),file);
  }
});

test('social panels do not invent verified accounts or manual-publishing enforcement',async()=>{
  const funny=await readFile(new URL('../app/dashboard/[[...path]]/funny-reels-studio.jsx',import.meta.url),'utf8');
  const youtube=await readFile(new URL('../app/dashboard/[[...path]]/youtube-studio.jsx',import.meta.url),'utf8');
  assert(!funny.includes('>VERIFIED</span>'));
  assert(!funny.includes('>60FPS RENDERED</span>'));
  for(const identity of ['17841467420993171','UCjixoELED6wc8keo98Txa8w','shiv__412__','@its.tango69'])assert(!funny.includes(identity),identity);
  assert(funny.includes('Verified publishing destinations'));
  assert(funny.includes('checks this exact account again before creating a Reel'));
  assert(youtube.includes("status || 'NOT_VERIFIED'"));
  assert(!youtube.includes('no video is set to public automatically'));
});

test('reels submission retains an explicit permission checkbox and readiness gate',async()=>{
 const source=await readFile(new URL('../app/dashboard/[[...path]]/reel-job-panels.jsx',import.meta.url),'utf8');
 assert(source.includes('rights_confirmed: rights'));
 assert(source.includes('if (!ready || readOnly || busy || uncertain) return;'));
 assert(source.includes('Generate and auto-publish'));
});
