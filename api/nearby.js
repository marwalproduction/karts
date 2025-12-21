const { getNearbyVendors } = require('./github-storage');

// Get nearby vendors based on user location
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
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 5000; // Default 5km radius
    const limit = parseInt(req.query.limit) || 20;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }

    const vendors = await getNearbyVendors(lat, lng, radius);
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
    console.error('Nearby vendors error:', error);
    if (!process.env.GITHUB_TOKEN) {
      return res.json({ vendors: [] });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch nearby vendors' });
  }
};

