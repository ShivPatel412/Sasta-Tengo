export function safePublicUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const url = value.trim();
  if (/[\u0000-\u001f\u007f\\]/.test(url)) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : null;
  } catch { return null; }
}

export function projectImage(project) {
  if (project.poster_url) return safePublicUrl(project.poster_url);
  if (typeof project.image !== 'string' || !project.image.trim()) return null;
  const image = project.image.trim();
  return safePublicUrl(/^(https?:|\/)/i.test(image) ? image : `/${image}`);
}
