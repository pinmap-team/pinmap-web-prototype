// Browser map credentials are public identifiers. Keep server-only map secrets out of this response.
module.exports = function mapConfig(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  const googleBrowserKey = process.env.GOOGLE_MAPS_BROWSER_KEY || '';
  const requested = (process.env.PINMAP_MAP_PROVIDER || '').toLowerCase();
  const available = {
    openfree: true,
    google: Boolean(googleBrowserKey)
  };
  const defaultProvider = available[requested] ? requested : 'openfree';
  return res.status(200).json({ defaultProvider, available, googleBrowserKey });
};
