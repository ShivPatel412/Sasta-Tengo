export const workflowUrl=id=>'https://n8n.shivpatel.in/workflow/'+encodeURIComponent(id);
export function worldData(snapshot,now=Date.now()){
  const recent=value=>Number.isFinite(Date.parse(value))&&now-Date.parse(value)>=-30000&&now-Date.parse(value)<120000;
  const fresh=recent(snapshot.updated_at),errors=snapshot.errors||{};
  const n8nConnected=fresh&&!errors.n8n&&recent(snapshot.source_updated_at?.n8n);
  const workflows=snapshot.n8n?.workflows||[],executions=snapshot.n8n?.executions||[];
  const agents=workflows.filter(w=>Number(w.agent_count)>0).map(w=>({...w,last:executions.find(e=>e.workflow_id===w.id)}));
  return {...snapshot,workflows,executions,agents,fresh,n8nConnected,
    counts:{workflows:workflows.length,agents:agents.length,services:snapshot.services?.length??0,
      running:n8nConnected?snapshot.n8n?.today?.running??null:null,
      failures:n8nConnected?snapshot.n8n?.today?.errors??null:null},
    agent:agents[0]||null};
}
export function agentState(data){
  if(!data?.n8nConnected)return 'disconnected';
  if(!data.agent)return 'unassigned';
  // Publication is not execution progress. Only a real running execution types.
  return data.agent.last?.status==='running'?'running':data.agent.last?.status||'no executions';
}
