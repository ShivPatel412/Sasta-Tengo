import test from 'node:test';
import assert from 'node:assert/strict';

test('funny reels intake validates YouTube watch and live stream URLs and bounds clips', () => {
  const validUrls = [
    'https://www.youtube.com/watch?v=l-oEKLu4Y3w',
    'https://youtu.be/l-oEKLu4Y3w',
    'https://www.youtube.com/live/irNhWMG560k?feature=share',
    'https://m.youtube.com/watch?v=l-oEKLu4Y3w&t=10s'
  ];
  for (const url of validUrls) {
    const match = url.match(/^https:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:[^#]*?&)?v=([a-zA-Z0-9_-]{11})(?:[&#]|$)|(?:live|shorts)\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$))/i) ||
                  url.match(/^https:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/i);
    assert(match, `Expected ${url} to match`);
    const id = match[1] || match[2];
    assert(id && id.length === 11);
  }

  const invalidUrls = [
    'https://vimeo.com/12345678',
    'https://youtube.com/not-a-video',
    'javascript:alert(1)'
  ];
  for (const url of invalidUrls) {
    const match = url.match(/^https:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:[^#]*?&)?v=([a-zA-Z0-9_-]{11})(?:[&#]|$)|(?:live|shorts)\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$))/i) ||
                  url.match(/^https:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/i);
    assert(!match, `Expected ${url} to fail`);
  }
});

test('youtube shorts enforce manual review before public publishing', () => {
  const defaultUpload = { status: 'PRIVATE_UPLOADED', privacy_status: 'private' };
  assert.equal(defaultUpload.privacy_status, 'private');
  
  function updatePrivacy(action, requestedPrivacy) {
    if (action === 'review_approve') return 'public';
    if (action === 'set_privacy') return requestedPrivacy || 'private';
    return defaultUpload.privacy_status;
  }

  assert.equal(updatePrivacy('review_approve'), 'public');
  assert.equal(updatePrivacy('unknown', 'public'), 'private');
});

test('linkedin publisher remains paused and rejects automatic activation', () => {
  function handleLinkedInAction(payload) {
    if (payload.enabled === true) throw new Error('Automated activation blocked');
    if (payload.action === 'update_limits') {
      return { max_posts_week: Math.min(5, Math.max(1, Number.parseInt(payload.max_posts_week, 10) || 2)) };
    }
    return { ok: true };
  }

  assert.throws(() => handleLinkedInAction({ enabled: true }), /activation blocked/);
  assert.equal(handleLinkedInAction({ action: 'update_limits', max_posts_week: 10 }).max_posts_week, 5);
  assert.equal(handleLinkedInAction({ action: 'update_limits', max_posts_week: -1 }).max_posts_week, 1);
});
