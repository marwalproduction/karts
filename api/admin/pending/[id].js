const { getPendingImage, deletePendingImage, saveVendor } = require('../../github-storage');

// Admin API: Get, approve, or delete specific pending image
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract image ID from URL
  // In Vercel, the path might be in req.url or we need to parse it
  let imageId = null;
  
  // Try to get from query parameter first
  if (req.query && req.query.id) {
    imageId = req.query.id;
  } else {
    // Parse from URL path
    const urlMatch = req.url.match(/\/pending\/([^\/\?]+)/);
    if (urlMatch) {
      imageId = urlMatch[1];
    } else {
      // Fallback: get last part of URL
      const urlParts = req.url.split('/').filter(p => p);
      imageId = urlParts[urlParts.length - 1];
    }
  }
  
  if (!imageId) {
    return res.status(400).json({ error: 'Image ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get specific pending image
      const pendingImage = await getPendingImage(imageId);
      if (!pendingImage) {
        return res.status(404).json({ error: 'Pending image not found' });
      }
      res.json({ pendingImage });
    } else if (req.method === 'POST') {
      // Approve and create vendor
      const pendingImage = await getPendingImage(imageId);
      if (!pendingImage) {
        return res.status(404).json({ error: 'Pending image not found' });
      }

      // Read request body for vendor data
      const chunks = [];
      await new Promise((resolve, reject) => {
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', resolve);
        req.on('error', reject);
      });
      
      const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString()) : {};
      const { heading, description, extractedText, extraInfo } = body;

      // Save as vendor
      const vendor = await saveVendor({
        heading: heading || 'Vendor',
        description: description || '',
        extractedText: extractedText || '',
        extraInfo: extraInfo || {
          items: [],
          prices: [],
          hours: null,
          contact: null,
          features: []
        },
        lat: pendingImage.location.lat,
        lng: pendingImage.location.lng
      });

      // Delete pending image
      await deletePendingImage(imageId);

      res.json({ 
        success: true, 
        message: 'Vendor approved and created',
        vendor 
      });
    } else if (req.method === 'DELETE') {
      // Reject/delete pending image
      await deletePendingImage(imageId);
      res.json({ success: true, message: 'Pending image deleted' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin pending ID error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

