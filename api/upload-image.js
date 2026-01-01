const { savePendingImage } = require('./github-storage');
const Busboy = require('busboy');

// Vercel serverless function handler
// Accepts image file and saves to pending folder for admin review
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
    // Parse multipart form data
    const busboy = Busboy({ headers: req.headers });
    let imageBuffer = null;
    let lat = null;
    let lng = null;

    await new Promise((resolve, reject) => {
      busboy.on('file', (name, file, info) => {
        const { filename, encoding, mimeType } = info;
        if (name === 'image') {
          const chunks = [];
          file.on('data', (chunk) => chunks.push(chunk));
          file.on('end', () => {
            imageBuffer = Buffer.concat(chunks);
          });
        }
      });

      busboy.on('field', (name, value) => {
        if (name === 'lat') {
          lat = parseFloat(value);
        } else if (name === 'lng') {
          lng = parseFloat(value);
        }
      });

      busboy.on('finish', resolve);
      busboy.on('error', reject);
      
      req.pipe(busboy);
    });

    if (!imageBuffer) {
      return res.status(400).json({ error: 'image is required' });
    }

    // Location is optional - use default if not provided
    if (lat === null || lng === null || lat === 0 || lng === 0) {
      lat = lat || 0;
      lng = lng || 0;
      console.log('No location provided, using default:', lat, lng);
    }

    // Save image and metadata to pending folder
    const timestamp = new Date().toISOString();
    const pendingImage = await savePendingImage({
      imageBuffer: imageBuffer,
      lat: lat,
      lng: lng,
      timestamp: timestamp
    });

    console.log('Pending image saved:', {
      id: pendingImage.id,
      size: imageBuffer.length,
      lat: lat,
      lng: lng,
      timestamp: timestamp
    });

    res.json({
      status: 'pending',
      message: 'Image uploaded successfully. Waiting for admin approval.',
      id: pendingImage.id
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// Old processing functions removed - now using admin dashboard for manual processing

