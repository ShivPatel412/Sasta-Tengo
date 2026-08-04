import { isJsonContentType } from './apiResponse';

test('accepts JSON and rejects the Vercel HTML fallback', () => {
  expect(isJsonContentType('application/json; charset=UTF-8')).toBe(true);
  expect(isJsonContentType('text/html; charset=utf-8')).toBe(false);
});
