export const controlSections={
  workflows:{label:'Workflows',description:'Your existing n8n workflows and recent runs.'},
  agents:{label:'AI agents',description:'Your configured n8n agents and Codex chat history.'},
  cloud:{label:'My cloud',description:'Your existing Nextcloud account and storage.'},
  services:{label:'Services',description:'The services behind your personal workspace.'}
};
export function isLocalMaster(env=process.env){return env.NODE_ENV==='development'&&env.MASTER_DASHBOARD_LOCAL==='1';}
export function snapshotFresh(value,now=Date.now()){
  const updated=Date.parse(value?.updated_at);
  return Number.isFinite(updated)&&now-updated>=-30000&&now-updated<120000;
}
export function sourceFresh(snapshot,source,now=Date.now()){
  return snapshotFresh(snapshot,now)&&!snapshot?.errors?.[source]&&snapshotFresh({updated_at:snapshot.source_updated_at?snapshot.source_updated_at[source]:snapshot.updated_at},now);
}
export function webLink(value){
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}

export function isMasterDashboard(env=process.env){return isLocalMaster(env)||env.MASTER_DASHBOARD_ENABLED==='1';}
