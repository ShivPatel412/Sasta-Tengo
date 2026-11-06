import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { storedSnapshot } from './control-feed.mjs';
import { HttpError } from './db.mjs';
import { isLocalMaster, isMasterDashboard } from './master-dashboard.mjs';

export function requireMaster(){if(!isMasterDashboard())throw new HttpError(404,'Not found.');}
export function requireLocalMaster(){if(!isLocalMaster())throw new HttpError(404,'Not found.');}
export async function controlSnapshot(env=process.env,read,info){
  if(!isLocalMaster(env)&&isMasterDashboard(env))return storedSnapshot();
  const file=env.CONTROL_ROOM_SNAPSHOT_PATH||resolve('.local/control-room/snapshot.json');
  try{
    const metadata=info?await info(file):await stat(/*turbopackIgnore: true*/ file);
    if(metadata.size>2_000_000)throw new Error('Too large');
    const data=JSON.parse(read?await read(file,'utf8'):await readFile(/*turbopackIgnore: true*/ file,'utf8'));
    if(!Number.isFinite(Date.parse(data.updated_at))||!Array.isArray(data.n8n?.workflows))throw new Error('Invalid snapshot');
    // The collector already exports metadata only; do not return arbitrary state/config files.
    return Object.fromEntries(['updated_at','source_updated_at','n8n','codex','storage','hdd','cloud','services','errors'].filter(key=>key in data).map(key=>[key,data[key]]));
  }catch{throw new HttpError(503,'The control-room collector is not connected to this local dashboard yet. Website tools still use your existing account.');}
}
