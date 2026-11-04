const pendingReads=new Map();
export function adminApi(path,options={}){
  const read=(options.method||'GET')==='GET'&&!options.signal&&!options.headers;
  if(read&&pendingReads.has(path))return pendingReads.get(path);
  if(!read)pendingReads.clear();
  const request=performRequest(path,options).finally(()=>{if(pendingReads.get(path)===request)pendingReads.delete(path);});
  if(read)pendingReads.set(path,request);
  return request;
}
async function performRequest(path,options){
  const response=await fetch(`/api/admin/${path}`,{cache:'no-store',...options});
  let data;
  try{data=await response.json();}catch{throw new Error('The workspace could not load a response. Please try again.');}
  if(!response.ok){
    if(response.status===401&&path!=='login')window.location.assign('/dashboard/login');
    throw new Error((data.message||'Request failed.')+(data.errors?' '+Object.entries(data.errors).map(([key,value])=>`${key}: ${Array.isArray(value)?value.join(', '):value}`).join('; '):''));
  }
  return data;
}
export const jsonRequest=(method,data)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
