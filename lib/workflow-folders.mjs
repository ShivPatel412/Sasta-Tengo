export function workflowFolderView(workflows=[],folders=[],folderId=null,search=''){
  const byId=new Map(folders.map(folder=>[String(folder.id),folder]));
  function trail(id){
    const rows=[],seen=new Set();
    while(id!=null&&byId.has(String(id))&&!seen.has(String(id))){
      const folder=byId.get(String(id));seen.add(String(id));rows.unshift(folder);id=folder.parent_id;
    }
    return rows;
  }
  const current=byId.has(String(folderId))?String(folderId):null,query=search.trim().toLowerCase();
  const parent=id=>id!=null&&byId.has(String(id))?String(id):null;
  const path=workflow=>trail(workflow.folder_id).map(folder=>folder.name).join(' / ')||'Personal';
  return {
    current,trail:trail(current),
    folders:query?[]:folders.filter(folder=>parent(folder.parent_id)===current).map(folder=>({...folder,
      workflow_count:workflows.filter(workflow=>trail(workflow.folder_id).some(item=>String(item.id)===String(folder.id))).length,
      folder_count:folders.filter(candidate=>String(candidate.parent_id)===String(folder.id)).length
    })).sort((a,b)=>a.name.localeCompare(b.name)),
    workflows:workflows.filter(workflow=>query?(workflow.name+' '+path(workflow)).toLowerCase().includes(query):parent(workflow.folder_id)===current)
      .map(workflow=>({...workflow,folder_path:path(workflow)})).sort((a,b)=>a.name.localeCompare(b.name))
  };
}
