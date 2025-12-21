const connectDB = require('./db');
const Vendor = require('./models/Vendor');

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

    await connectDB();

    // Text search on OCR field
    const vendors = await Vendor.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(limit)
      .select('ocr location createdAt')
      .lean();

    res.json({
      vendors: vendors.map(v => ({
        id: v._id,
        text: v.ocr,
        location: {
          lat: v.location.coordinates[1],
          lng: v.location.coordinates[0]
        },
        createdAt: v.createdAt
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    if (!process.env.MONGODB_URI) {
      return res.json({ vendors: [] });
    }
    res.status(500).json({ error: error.message || 'Search failed' });
  }
};

