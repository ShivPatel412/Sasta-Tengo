export function newStudioDraft(ids=[]){return {title:'Untitled Instagram post',photo_ids:ids.slice(0,30),selected:ids.slice(0,5),overrides:{},max_photos:5,theme:'',location:'',caption:'',captions:[],hashtags:[],music:[],alt_text:{},ai_order:[],analysis:[]};}
export function movePhoto(draft,id,to){const selected=[...draft.selected],from=selected.indexOf(id);if(from<0||to<0||to>=selected.length)return draft;selected.splice(from,1);selected.splice(to,0,id);return {...draft,selected};}
export function choosePhoto(draft,id,mode){
 const overrides={...draft.overrides};if(mode==='auto')delete overrides[id];else overrides[id]=mode;
 const selected=mode==='exclude'?draft.selected.filter(x=>x!==id):draft.selected.includes(id)?draft.selected:[...draft.selected,id];
 if(selected.length>draft.max_photos)throw Error('Increase the carousel maximum or remove another photo first.');
 return {...draft,selected,overrides};
}
export function restoreRecommendations(draft){
 const pinned=draft.selected.filter(id=>['include','lock'].includes(draft.overrides[id]));
 const selected=[...pinned,...draft.ai_order.filter(id=>!pinned.includes(id)&&draft.overrides[id]!=='exclude')].slice(0,draft.max_photos);
 const lockedLength=Math.max(0,...pinned.filter(id=>draft.overrides[id]==='lock').map(id=>draft.selected.indexOf(id)+1));
 for(const id of draft.selected){if(selected.length>=lockedLength)break;if(!selected.includes(id)&&draft.overrides[id]!=='exclude')selected.push(id);}
 for(const id of pinned.filter(id=>draft.overrides[id]==='lock')){const at=draft.selected.indexOf(id);selected.splice(selected.indexOf(id),1);selected.splice(Math.min(at,selected.length),0,id);}
 return {...draft,selected};
}
export function similarPhotos(photos){return photos.map((p,i)=>{const similar=[];for(let j=0;j<i;j++){let diff=BigInt('0x'+p.dhash)^BigInt('0x'+photos[j].dhash),bits=0;while(diff){bits++;diff&=diff-1n;}if(bits<=6)similar.push(photos[j].id);}return {id:p.id,similar};}).filter(g=>g.similar.length);}
// A dependency-free stored ZIP. The browser downloads authenticated JPEG copies;
// originals/GPS are never reintroduced during export.
export async function exportStudioImages(draft){
 const encoder=new TextEncoder(),parts=[],central=[];let offset=0;
 const write=(n,size)=>{const b=new Uint8Array(size);const v=new DataView(b.buffer);if(size===2)v.setUint16(0,n,true);else v.setUint32(0,n,true);return b;};
 const join=arr=>{const out=new Uint8Array(arr.reduce((n,a)=>n+a.length,0));let at=0;for(const b of arr){out.set(b,at);at+=b.length;}return out;};
 const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
 for(let i=0;i<draft.selected.length;i++){
  const response=await fetch('/api/admin/instagram/media/'+draft.selected[i],{cache:'no-store'});if(!response.ok)throw Error('One photo could not be exported.');
  const bytes=new Uint8Array(await response.arrayBuffer()),name=encoder.encode(String(i+1).padStart(2,'0')+'.jpg'),checksum=crc(bytes),header=join([write(0x04034b50,4),write(20,2),write(0,2),write(0,2),write(0,2),write(0,2),write(checksum,4),write(bytes.length,4),write(bytes.length,4),write(name.length,2),write(0,2),name]);
  central.push(join([write(0x02014b50,4),write(20,2),write(20,2),write(0,2),write(0,2),write(0,2),write(0,2),write(checksum,4),write(bytes.length,4),write(bytes.length,4),write(name.length,2),write(0,2),write(0,2),write(0,2),write(0,2),write(0,4),write(offset,4),name]));parts.push(header,bytes);offset+=header.length+bytes.length;
 }
 const directory=join(central),end=join([write(0x06054b50,4),write(0,2),write(0,2),write(central.length,2),write(central.length,2),write(directory.length,4),write(offset,4),write(0,2)]);
 return new Blob([...parts,directory,end],{type:'application/zip'});
}
