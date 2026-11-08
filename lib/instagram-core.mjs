import {z} from 'zod';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {HttpError} from './db.mjs';
export const categories=['Travel','Friends','Events','Portraits','Nature','Lifestyle','Fashion','Favorites'];
export const idSchema=z.uuid();
const ids=z.array(idSchema).max(30).refine(a=>new Set(a).size===a.length,'Duplicate photo IDs.');
export const draftSchema=z.object({
 title:z.string().trim().min(1).max(150),photo_ids:ids,selected:ids,
 overrides:z.record(idSchema,z.enum(['include','exclude','lock'])).default({}),
 max_photos:z.number().int().min(1).max(10).default(5),theme:z.string().max(1500).default(''),
 location:z.string().max(150).default(''),caption:z.string().max(2200).default(''),
 captions:z.array(z.string().max(2200)).max(3).default([]),hashtags:z.array(z.string().regex(/^#[\p{L}\p{N}_]{1,100}$/u)).max(30).default([]),
 music:z.array(z.string().max(200)).max(5).default([]),alt_text:z.record(idSchema,z.string().max(1000)).default({}),
 ai_order:ids.default([]),analysis:z.array(z.object({id:idSchema,score:z.number().min(0).max(100),explanation:z.string().max(1200)}).passthrough()).max(30).default([])
}).strict().superRefine((d,c)=>{
 if(d.selected.some(id=>!d.photo_ids.includes(id))||Object.keys(d.overrides).some(id=>!d.photo_ids.includes(id)))c.addIssue({code:'custom',message:'Selections must belong to this draft.'});
 if(d.ai_order.some(id=>!d.photo_ids.includes(id))||d.analysis.some(p=>!d.photo_ids.includes(p.id)))c.addIssue({code:'custom',message:'Analysis must belong to this draft.'});
 if(d.selected.length>d.max_photos)c.addIssue({code:'custom',message:'Selection exceeds the carousel limit.'});
 if(Object.entries(d.overrides).some(([id,v])=>v==='exclude'?d.selected.includes(id):!d.selected.includes(id)))c.addIssue({code:'custom',message:'Selection conflicts with a manual override.'});
});
const score=z.number().min(0).max(100);
export const analysisSchema=z.object({
 photos:z.array(z.object({id:idSchema,quality:score,lighting:score,sharpness:score,composition:score,subject:score,expression:score,background:score,uniqueness:score,story:score,crop:score,
 explanation:z.string().max(1200),description:z.string().max(1200),category:z.enum(categories),cover_suitability:score,
 suggested_crop:z.enum(['original','4:5','1:1']),alt_text:z.string().max(1000),tags:z.array(z.string().max(50)).max(12)}).strict()).min(1).max(30),
 order:ids,captions:z.array(z.string().max(2200)).length(3),hashtags:z.array(z.string().regex(/^#[\p{L}\p{N}_]{1,100}$/u)).max(30),music:z.array(z.string().max(200)).max(5)
}).strict();
export const defaultWeights={quality:15,lighting:10,sharpness:10,composition:15,subject:10,expression:5,background:5,uniqueness:10,story:10,crop:10};
export const settingsSchema=z.object({weights:z.object(Object.fromEntries(Object.keys(defaultWeights).map(k=>[k,z.number().min(0).max(100)]))).refine(w=>Object.values(w).reduce((a,b)=>a+b,0)>0),retention_days:z.number().int().min(1).max(365)}).strict();
export function similar(a,b){let n=BigInt('0x'+a)^BigInt('0x'+b),bits=0;while(n){bits++;n&=n-1n;}return bits<=6;}
export function weightedScore(photo,weights=defaultWeights){const sum=Object.values(weights).reduce((a,b)=>a+b,0);return Math.round(Object.entries(weights).reduce((total,[key,w])=>total+photo[key]*w,0)/sum);}
export function mergeAnalysis(draft,input,weights=defaultWeights){
 const result=analysisSchema.parse(input),photoIds=result.photos.map(p=>p.id);
 if(new Set(photoIds).size!==photoIds.length||photoIds.length!==draft.photo_ids.length||photoIds.some(id=>!draft.photo_ids.includes(id))||result.order.some(id=>!photoIds.includes(id)))throw new HttpError(422,'Analysis references unexpected photos.');
 const ranked=result.photos.map(p=>({...p,score:weightedScore(p,weights)})).sort((a,b)=>b.score-a.score);
 const recommended=result.order.length?result.order:ranked.map(p=>p.id);
 const pinned=draft.selected.filter(id=>['include','lock'].includes(draft.overrides[id]));
 if(pinned.length>draft.max_photos)throw new HttpError(409,'Locked photos exceed the chosen maximum.');
 const selected=[...pinned,...recommended.filter(id=>!pinned.includes(id)&&draft.overrides[id]!=='exclude')].slice(0,draft.max_photos);
 const lockedLength=Math.max(0,...pinned.filter(id=>draft.overrides[id]==='lock').map(id=>draft.selected.indexOf(id)+1));
 for(const id of draft.selected){if(selected.length>=lockedLength)break;if(!selected.includes(id)&&draft.overrides[id]!=='exclude')selected.push(id);}
 // Locked photos keep their exact saved carousel positions.
 for(const id of pinned.filter(id=>draft.overrides[id]==='lock')){const at=draft.selected.indexOf(id);selected.splice(selected.indexOf(id),1);selected.splice(Math.min(at,selected.length),0,id);}
 return {...draft,selected,ai_order:recommended,analysis:ranked,captions:result.captions,caption:draft.caption||result.captions[0],hashtags:result.hashtags,music:result.music,alt_text:{...Object.fromEntries(ranked.map(p=>[p.id,p.alt_text])),...draft.alt_text}};
}
export function secret(key){const value=process.env[key];if(!value||value.length<32)throw new HttpError(503,'Studio processing credentials are not configured.');return value;}
export function signature(key,value){return createHmac('sha256',secret(key)).update(value).digest('hex');}
export function matches(a,b){return typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function verifyBearer(request,expected){if(!matches(request.headers.get('authorization'),`Bearer ${expected}`))throw new HttpError(401,'Unauthorized.');}
