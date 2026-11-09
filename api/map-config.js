// Browser map credentials are public identifiers. Keep server-only map secrets out of this response.
module.exports = function mapConfig(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  const googleBrowserKey = process.env.GOOGLE_MAPS_BROWSER_KEY || '';
  const kakaoJavaScriptKey = process.env.KAKAO_MAP_JAVASCRIPT_KEY || '';
  const naverClientId = process.env.NAVER_MAP_CLIENT_ID || '';
  const requested = (process.env.PINMAP_MAP_PROVIDER || '').toLowerCase();
  const available = {
    openfree: true,
    google: Boolean(googleBrowserKey),
    kakao: Boolean(kakaoJavaScriptKey),
    naver: Boolean(naverClientId)
  };
  const defaultProvider = available[requested] ? requested : 'openfree';
  return res.status(200).json({ defaultProvider, available, googleBrowserKey, kakaoJavaScriptKey, naverClientId });
};
