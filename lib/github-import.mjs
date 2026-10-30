import { HttpError } from './db.mjs';

export function githubRepository(value) {
  let url;
  try { url = new URL(value); } catch { throw new HttpError(422, 'Paste a GitHub repository URL.'); }
  const parts = url.pathname.replace(/\/$/, '').split('/').slice(1);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || parts.length !== 2 || !/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(parts[0]) || !/^[\w.-]{1,100}$/.test(parts[1])) throw new HttpError(422, 'Use https://github.com/owner/repository.');
  const repository = parts[1].replace(/\.git$/, '');
  if (!repository || ['.', '..'].includes(repository)) throw new HttpError(422, 'Choose a valid GitHub repository.');
  return { owner: parts[0], repository, url: `https://github.com/${parts[0]}/${repository}` };
}

async function limitedText(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('Response too large'); }
  const reader = response.body?.getReader(); if (!reader) return '';
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error('Response too large'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function readmeText(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_`]/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

export async function importGithub(value, fetcher = fetch) {
  const repo = githubRepository(value), base = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repository)}`;
  const signal = AbortSignal.timeout(12000), warnings = [];
  async function request(path, raw = false) {
    const response = await fetcher(base + path, { signal, redirect: 'error', cache: 'no-store', headers: { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'User-Agent': 'Shiv-Portfolio-Importer' } });
    if (!response.ok) throw new HttpError(response.status === 404 ? 422 : 503, response.status === 404 ? 'Repository not found. Use a public GitHub repository.' : 'GitHub is unavailable or its request limit was reached. Try again later.');
    const text = await limitedText(response, raw ? 100000 : 256000);
    return raw ? text : JSON.parse(text);
  }
  let metadata;
  try { metadata = await request(''); } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(503, 'Could not reach GitHub. Please try again.'); }
  if (metadata.private || typeof metadata.name !== 'string') throw new HttpError(422, 'Only public repositories can be imported.');
  const [languages, readme] = await Promise.all([
    request('/languages').catch(() => { warnings.push('Languages could not be loaded.'); return {}; }),
    request('/readme', true).catch(() => { warnings.push('README unavailable; the repository description was used.'); return ''; })
  ]);
  const summary = typeof metadata.description === 'string' ? metadata.description.trim() : '';
  const notes = readmeText(readme);
  const description = [summary, notes].filter(Boolean).join('\n\n').slice(0, 10000);
  if (!description) warnings.push('This repository has no description or README. Add a description before saving.');
  let homepage = null;
  try { const url = new URL(metadata.homepage); if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) homepage = url.href; } catch {}
  return { project: {
    title: metadata.name.slice(0, 255), description,
    technologies: [...new Set([...Object.keys(languages), ...(Array.isArray(metadata.topics) ? metadata.topics.filter(t => typeof t === 'string') : []), ...(metadata.language ? [metadata.language] : [])])].slice(0, 30).map(t => t.slice(0, 1000)),
    github_url: repo.url, live_url: homepage,
    poster: `https://opengraph.githubassets.com/1/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repository)}`
  }, warnings };
}
