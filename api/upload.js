const { saveVendor } = require('./github-storage');

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

    // Save vendor to GitHub
    try {
      const vendor = await saveVendor({ ocr, lat, lng });
      console.log('Vendor saved successfully to GitHub:', vendor.id);

      res.json({
        message: 'Vendor info saved successfully',
        coords: { lat, lng },
        id: vendor.id
      });
    } catch (storageError) {
      console.error('Storage error:', storageError);
      if (!process.env.GITHUB_TOKEN) {
        res.status(500).json({ 
          error: 'GitHub storage not configured. Please set GITHUB_TOKEN environment variable.' 
        });
      } else {
        res.status(500).json({ error: 'Failed to save vendor data: ' + storageError.message });
      }
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

