const connectDB = require('./db');
const Vendor = require('./models/Vendor');

// Vercel serverless function handler
// Now receives OCR text from client instead of processing images
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log request details for debugging
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    // Parse JSON body (OCR is now done client-side)
    // Read the request body stream
    const chunks = [];
    
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    const body = Buffer.concat(chunks).toString();
    
    let data;
    try {
      data = body ? JSON.parse(body) : {};
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const { ocr, lat, lng } = data;

    if (!ocr || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'ocr, lat, and lng are required' });
    }

    // Connect to database and save vendor
    try {
      await connectDB();
      
      const vendor = new Vendor({
        ocr: ocr.trim(),
        location: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)] // MongoDB uses [lng, lat]
        }
      });

      await vendor.save();
      console.log('Vendor saved successfully:', vendor._id);

      res.json({
        message: 'Vendor info saved successfully',
        coords: { lat, lng },
        id: vendor._id
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // If no MongoDB URI is set, still return success (for development)
      if (process.env.MONGODB_URI) {
        res.status(500).json({ error: 'Failed to save vendor data' });
      } else {
        res.json({
          message: 'Vendor info received (database not configured)',
          coords: { lat, lng }
        });
      }
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

