import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safePublicUrl, projectImage } from '../lib/landing.mjs';

test('project links allow web destinations and local images', () => {
  assert.equal(safePublicUrl('https://example.com/work'), 'https://example.com/work');
  assert.equal(safePublicUrl('/models/robot.png'), '/models/robot.png');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//example.com', '/\\example.com', 'https://name:secret@example.com', 'java\nscript:test', '', null]) assert.equal(safePublicUrl(value), null);
});

test('project previews preserve local filenames and remote images', () => {
  assert.equal(projectImage({ image: 'download (2).png' }), '/download (2).png');
  assert.equal(projectImage({ image: 'https://example.com/image.png' }), 'https://example.com/image.png');
  assert.equal(projectImage({ poster_url: '/storage/poster.png', image: 'old.png' }), '/storage/poster.png');
  assert.equal(projectImage({}), null);
});
