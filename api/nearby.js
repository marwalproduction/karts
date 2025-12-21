const connectDB = require('./db');
const Vendor = require('./models/Vendor');

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

    await connectDB();

    // Find vendors within radius, sorted by distance and date
    const vendors = await Vendor.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat] // MongoDB uses [lng, lat]
          },
          $maxDistance: radius // in meters
        }
      }
    })
      .sort({ createdAt: -1 }) // Latest first
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
    console.error('Nearby vendors error:', error);
    if (!process.env.MONGODB_URI) {
      return res.json({ vendors: [] });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch nearby vendors' });
  }
};

