const { searchVendors } = require('./github-storage');

// Search vendors by text
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 20;

    if (!query.trim()) {
      return res.json({ vendors: [] });
    }

    const vendors = await searchVendors(query);
    const limitedVendors = vendors.slice(0, limit);

    res.json({
      vendors: limitedVendors.map(v => ({
        id: v.id,
        text: v.ocr,
        location: v.location,
        createdAt: v.createdAt
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    if (!process.env.GITHUB_TOKEN) {
      return res.json({ vendors: [] });
    }
    res.status(500).json({ error: error.message || 'Search failed' });
  }
};

