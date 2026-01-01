const { getAllPendingImages, getPendingImage, deletePendingImage, saveVendor } = require('../github-storage');

// Admin API: Handle all pending image operations
// GET /api/admin/pending - list all
// GET /api/admin/pending?id=xxx - get specific
// POST /api/admin/pending?id=xxx - approve
// DELETE /api/admin/pending?id=xxx - delete
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const imageId = req.query.id || null;

  try {
    if (req.method === 'GET') {
      if (imageId) {
        // Get specific pending image
        const pendingImage = await getPendingImage(imageId);
        if (!pendingImage) {
          return res.status(404).json({ error: 'Pending image not found' });
        }
        res.json({ pendingImage });
      } else {
        // Get all pending images
        const pendingImages = await getAllPendingImages();
        res.json({ pendingImages });
      }
    } else if (req.method === 'POST') {
      // Approve and create vendor
      if (!imageId) {
        return res.status(400).json({ error: 'Image ID is required (use ?id=xxx)' });
      }

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
      
      let body = {};
      if (chunks.length > 0) {
        try {
          const bodyText = Buffer.concat(chunks).toString();
          if (bodyText.trim()) {
            body = JSON.parse(bodyText);
          }
        } catch (parseError) {
          console.error('Error parsing request body:', parseError);
          return res.status(400).json({ error: 'Invalid JSON in request body' });
        }
      }
      
      const { heading, description, extractedText, extraInfo } = body;

      // Save as vendor
      let vendor;
      try {
        vendor = await saveVendor({
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
      } catch (saveError) {
        console.error('Error saving vendor:', saveError);
        return res.status(500).json({ 
          error: 'Failed to save vendor: ' + (saveError.message || 'Unknown error')
        });
      }

      // Delete pending image
      try {
        await deletePendingImage(imageId);
      } catch (deleteError) {
        console.error('Error deleting pending image:', deleteError);
        // Continue even if delete fails - vendor is already created
      }

      res.status(200).json({ 
        success: true, 
        message: 'Vendor approved and created',
        vendor 
      });
    } else if (req.method === 'DELETE') {
      // Reject/delete pending image
      if (!imageId) {
        return res.status(400).json({ error: 'Image ID is required (use ?id=xxx)' });
      }
      
      await deletePendingImage(imageId);
      res.json({ success: true, message: 'Pending image deleted' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin pending error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

