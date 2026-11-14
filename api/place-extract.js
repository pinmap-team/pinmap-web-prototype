const crypto = require('node:crypto');

function equalSecret(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function instagramLink(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname) ||
      url.username || url.password || !/^\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
    throw new Error('Instagram 게시물 또는 릴스 링크가 필요합니다.');
  }
  return `https://www.instagram.com${url.pathname.endsWith('/') ? url.pathname : url.pathname + '/'}`;
}

module.exports = async function placeExtract(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const origin = process.env.PINMAP_EXTRACTOR_ORIGIN;
  const backendToken = process.env.PINMAP_EXTRACTOR_TOKEN;
  const accessCode = process.env.PINMAP_TEST_ACCESS_CODE;
  if (!origin || !backendToken || !accessCode) return res.status(503).json({ error: 'online_test_not_configured' });
  if (!equalSecret(req.headers['x-pinmap-test-code'], accessCode)) return res.status(401).json({ error: 'unauthorized' });
  let target, link;
  try {
    target = new URL(origin);
    if (target.protocol !== 'https:' || target.username || target.password || target.pathname !== '/' || target.search || target.hash) throw new Error('invalid origin');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    link = instagramLink(body?.url);
  } catch {
    return res.status(400).json({ error: 'invalid_request' });
  }
  try {
    const response = await fetch(new URL('/extract-link', target), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${backendToken}` },
      body: JSON.stringify({ url: link }),
      signal: AbortSignal.timeout(270000)
    });
    const result = await response.json();
    return res.status(response.ok ? 200 : 502).json(result);
  } catch {
    return res.status(502).json({ error: 'extractor_unavailable' });
  }
};

module.exports.instagramLink = instagramLink;
