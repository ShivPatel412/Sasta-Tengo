import { isJsonContentType } from './apiResponse.js';
async function request(path, method, body) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!isJsonContentType(response.headers.get('content-type'))) throw new Error('API returned a non-JSON response');
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.response = { status: response.status, data };
    throw error;
  }
  return { data };
}
export default { get: path => request(path, 'GET'), post: (path, body) => request(path, 'POST', body) };
