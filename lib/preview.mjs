export function isLocalPreview(env = process.env) {
  return env.NODE_ENV === 'development' && env.LOCAL_PREVIEW === '1'
    && ![env.DB_HOST, env.DB_NAME, env.DB_USER].some(Boolean);
}
