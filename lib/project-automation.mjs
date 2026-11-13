import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { HttpError, query, transaction, insert } from './db.mjs';
import { projectSchema, storageData, serialize } from './validation.mjs';
import { githubRepository } from './github-import.mjs';
import {isLocalMaster} from './master-dashboard.mjs';

export function automationAuth(request) {
  const key = process.env.PROJECT_AUTOMATION_KEY;
  if (!key || key.length < 32) throw new HttpError(503, 'Project automation is not configured.');
  const supplied = request.headers.get('authorization') || '';
  const expected = `Bearer ${key}`;
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new HttpError(401, 'Unauthorized.');
}

export const automationDraft = z.object({
  repository: z.string().max(150), revision: z.string().regex(/^[a-f0-9]{64}$/),
  project: projectSchema,
  recovery: z.literal(true).optional(),
  manual_approval: z.literal(true).optional(),
  provenance: z.object({
    generated_at: z.iso.datetime(), text_model: z.string().max(100), image_model: z.string().max(100),
    screenshot_url: z.url().max(2048).nullable(), captured_at: z.iso.datetime().nullable(),
    cover_status:z.enum(['generated','unavailable']).default('generated'),
    warnings: z.array(z.string().max(500)).max(20)
  }).strict()
}).strict().superRefine((data,ctx) => {
  const repo = githubRepository(data.project.github_url);
  const owner = process.env.PROJECT_GITHUB_OWNER;
  if (!owner || repo.owner.toLowerCase() !== owner.toLowerCase() || data.repository.toLowerCase() !== `${repo.owner}/${repo.repository}`.toLowerCase()) ctx.addIssue({code:'custom',message:'Repository owner is not configured or allowed.'});
  const localCover=isLocalMaster()&&/^\/api\/admin\/project-media\/[a-f0-9]{64}\.(jpg|png|gif|webp)$/.test(data.project.poster||'');
  if (!data.project.poster || (!/^https:\/\//.test(data.project.poster)&&!localCover)) ctx.addIssue({code:'custom',message:'A durable generated cover is required.'});
  if (data.provenance.screenshot_url && (!data.provenance.captured_at || data.provenance.screenshot_url !== data.project.live_url || !data.project.gallery?.length)) ctx.addIssue({code:'custom',message:'Screenshot evidence does not match the project.'});
});

export async function ingestDraft(input, run = transaction) {
  const data = automationDraft.parse(input);
  return run(async connection => {
    // Lock by repository, including first creation; the unique key serializes simultaneous callbacks.
    await query("INSERT IGNORE INTO project_automation_drafts (repository,revision,payload,provenance,status,created_at,updated_at) VALUES (?,? ,?,?,'new',UTC_TIMESTAMP(),UTC_TIMESTAMP())", [data.repository.toLowerCase(),data.revision,JSON.stringify(data.project),JSON.stringify(data.provenance)],connection);
    const [row] = await query('SELECT * FROM project_automation_drafts WHERE repository=? FOR UPDATE',[data.repository.toLowerCase()],connection);
    if(data.recovery && (row.status!=='pending' || row.revision!==data.revision))throw new HttpError(409,'The draft changed or was reviewed. Reload before recovering media.');
    if (row.status !== 'new' && row.revision === data.revision) {
      const previous=decoded(row.provenance||{});
      const coverRecovered=previous.cover_status==='unavailable' && data.provenance.cover_status==='generated';
      if(row.status==='pending' && (data.provenance.screenshot_url || coverRecovered)) {
        const original=decoded(row.payload);
        if(original.live_url!==data.project.live_url)throw new HttpError(409,'The draft live URL changed. Review it before publishing.');
        const gallery=[...new Set([...(original.gallery||[]),...(data.provenance.screenshot_url?[data.project.gallery[0]]:[])])];
        if(gallery.length>20)throw new HttpError(409,'The draft gallery is full. Free a slot before adding a screenshot.');
        original.gallery=gallery;
        if(coverRecovered)original.poster=data.project.poster;
        const provenance={...previous};
        if(coverRecovered)Object.assign(provenance,{cover_status:'generated',image_model:data.provenance.image_model,generated_at:data.provenance.generated_at,warnings:data.provenance.warnings});
        if(data.provenance.screenshot_url)Object.assign(provenance,{screenshot_url:data.provenance.screenshot_url,captured_at:data.provenance.captured_at});
        if(provenance.screenshot_url)provenance.warnings=(provenance.warnings||[]).filter(w=>!w.startsWith('Screenshot capture is not configured;')&&!w.startsWith('No live website URL in GitHub metadata;'));
        await query('UPDATE project_automation_drafts SET payload=?,provenance=?,updated_at=UTC_TIMESTAMP() WHERE id=?',[JSON.stringify(original),JSON.stringify(provenance),row.id],connection);
      }
      return {id:String(row.id),status:row.status,unchanged:true};
    }
    let projectId=row.project_id, baseline=null;
    if (!projectId) {
      const matches=await query('SELECT id,updated_at FROM projects WHERE LOWER(github_url)=LOWER(?) ORDER BY id LIMIT 2',[data.project.github_url],connection);
      if(matches.length>1) throw new HttpError(409,'Multiple existing projects use this repository. Resolve duplicates first.');
      projectId=matches[0]?.id || null;
    }
    if(projectId) baseline=(await query('SELECT updated_at FROM projects WHERE id=?',[projectId],connection))[0]?.updated_at || null;
    await query("UPDATE project_automation_drafts SET revision=?,payload=?,provenance=?,status='pending',project_id=?,project_updated_at=?,reviewed_by=NULL,updated_at=UTC_TIMESTAMP() WHERE id=?",[data.revision,JSON.stringify(data.project),JSON.stringify(data.provenance),projectId,baseline,row.id],connection);
    return {id:String(row.id),status:'pending',unchanged:false};
  });
}

export async function ingestAutomation(input, {ingest=ingestDraft,review=reviewDraft,lookup=query,env=process.env}={}) {
  const draft=await ingest(input);
  if(input.manual_approval || env.PROJECT_AUTOMATION_AUTO_PUBLISH!=='1' || ['published','rejected'].includes(draft.status)) return draft;
  // A failed real capture stays reviewable and is retried by the worker next hour.
  if(!input.provenance.screenshot_url || !input.project.gallery?.length) return {...draft,waiting_for_screenshot:true};
  if(!env.ADMIN_EMAIL)throw new HttpError(503,'An automation publishing administrator is required.');
  const [owner]=await lookup('SELECT id FROM users WHERE email=? LIMIT 1',[env.ADMIN_EMAIL]);
  if(!owner)throw new HttpError(503,'The automation publishing administrator does not exist.');
  const published=await review(draft.id,{action:'publish',revision:input.revision},owner);
  return {...draft,...published,status:'published'};
}

const decoded = value => typeof value === 'string' ? JSON.parse(value) : value;
export async function listDrafts() {
  return (await query('SELECT * FROM project_automation_drafts ORDER BY updated_at DESC,id DESC LIMIT 100')).map(row=>({...row,payload:decoded(row.payload),provenance:decoded(row.provenance)}));
}

export const reviewSchema=z.object({revision:z.string().regex(/^[a-f0-9]{64}$/),action:z.enum(['save','publish','reject']),project:projectSchema.optional()}).strict();
export async function reviewDraft(id,input,owner,run=transaction) {
  const review=reviewSchema.parse(input);
  return run(async connection=>{
    const [row]=await query('SELECT * FROM project_automation_drafts WHERE id=? FOR UPDATE',[id],connection);
    if(!row)throw new HttpError(404,'Draft not found.');
    if(row.revision!==review.revision)throw new HttpError(409,'A newer repository revision arrived. Reload before reviewing.');
    if(row.status!=='pending') {
      if(row.status==='published'&&review.action==='publish')return {ok:true,project_id:row.project_id,unchanged:true};
      throw new HttpError(409,'This draft has already been reviewed.');
    }
    const original=decoded(row.payload), project=review.project || original;
    if(project.github_url!==original.github_url)throw new HttpError(422,'The repository link cannot change during review.');
    if(review.action==='reject') {
      await query("UPDATE project_automation_drafts SET status='rejected',reviewed_by=?,updated_at=UTC_TIMESTAMP() WHERE id=?",[owner.id,id],connection);
      return {ok:true};
    }
    if(review.action==='save') {
      await query('UPDATE project_automation_drafts SET payload=?,updated_at=UTC_TIMESTAMP() WHERE id=?',[JSON.stringify(project),id],connection);
      return {ok:true};
    }
    if(decoded(row.provenance||{}).cover_status==='unavailable')throw new HttpError(409,'AI cover generation is pending. Generate the cover before approving this project.');
    const categories=await query('SELECT id FROM project_types WHERE category=? FOR UPDATE',[project.category],connection);
    const legacy=await query('SELECT id FROM projects WHERE category=? LIMIT 1',[project.category],connection);
    if(!categories.length&&!legacy.length)throw new HttpError(422,'Choose an existing project type.');
    let projectId=row.project_id;
    if(projectId) {
      const [existing]=await query('SELECT * FROM projects WHERE id=? FOR UPDATE',[projectId],connection);
      if(!existing || String(existing.updated_at)!==String(row.project_updated_at))throw new HttpError(409,'The live project changed after this draft was created. Review it in the website dashboard first.');
      // Preserve editorial placement and manually added gallery media on automated updates.
      project.is_featured=Boolean(existing.is_featured);project.order=existing.order;
      project.gallery=[...new Set([...(project.gallery||[]),...(serialize(existing,'projects').gallery||[])])].slice(0,20);
      const data=storageData(project);
      await query(`UPDATE projects SET ${Object.keys(data).map(k=>`\`${k}\`=?`).join(',')},updated_at=UTC_TIMESTAMP() WHERE id=?`,[...Object.values(data),projectId],connection);
    } else projectId=await insert('projects',storageData(project),connection);
    await query("UPDATE project_automation_drafts SET payload=?,status='published',project_id=?,reviewed_by=?,updated_at=UTC_TIMESTAMP() WHERE id=?",[JSON.stringify(project),projectId,owner.id,id],connection);
    return {ok:true,project_id:String(projectId)};
  });
}
