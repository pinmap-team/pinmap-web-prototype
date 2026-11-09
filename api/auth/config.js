// Only browser-safe credentials may leave this endpoint. Never expose service_role.
function projectUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    if (!['', '/', '/rest/v1', '/rest/v1/'].includes(url.pathname)) return null;
    return url.origin;
  } catch { return null; }
}
function publicKey(value) {
  const key = String(value || '').trim();
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return key;
  // Legacy anon keys are supported, but privileged JWT keys are rejected.
  try {
    const parts = key.split('.');
    if (parts.length === 3 && JSON.parse(Buffer.from(parts[1], 'base64url')).role === 'anon') return key;
  } catch {}
  return null;
}
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({error:'GET only'});
  const url = projectUrl(process.env.SUPABASE_URL);
  const key = publicKey(process.env.SUPABASE_PUBLISHABLE_KEY);
  if (!url || !key) return res.status(503).json({error:'로그인 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.'});
  res.status(200).json({url, publishableKey:key});
};
module.exports.projectUrl = projectUrl;
module.exports.publicKey = publicKey;
