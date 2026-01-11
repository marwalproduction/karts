const { getAllVendors } = require('./github-storage');

// Get all vendors
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
    const vendors = await getAllVendors();

    res.json({
      vendors: vendors.map(v => ({
        id: v.id,
        heading: v.heading || 'Vendor',
        description: v.description || '',
        extractedText: v.extractedText || '',
        extraInfo: v.extraInfo || {},
        location: v.location,
        createdAt: v.createdAt
      }))
    });
  } catch (error) {
    console.error('Vendors error:', error);
    if (!process.env.GITHUB_TOKEN) {
      return res.json({ vendors: [] });
    }
    res.status(500).json({ 
      error: error.message || 'Failed to fetch vendors',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

