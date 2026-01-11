const { saveVendor, deletePendingImage } = require('../../github-storage');

// Admin Bulk Upload API
// POST /api/admin/pending/bulk-upload - Bulk approve vendors from processed CSV data
module.exports = async function handler(req, res) {
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
    // Read request body
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    const bodyText = Buffer.concat(chunks).toString();
    if (!bodyText.trim()) {
      return res.status(400).json({ error: 'Request body is required' });
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const { vendors } = body;
    if (!Array.isArray(vendors)) {
      return res.status(400).json({ error: 'vendors must be an array' });
    }

    const results = {
      success: [],
      errors: []
    };

    // Process each vendor
    for (const vendorData of vendors) {
      try {
        // Validate required fields
        if (!vendorData.id || !vendorData.heading || vendorData.lat === undefined || vendorData.lng === undefined) {
          results.errors.push({
            id: vendorData.id || 'unknown',
            error: 'Missing required fields: id, heading, lat, lng'
          });
          continue;
        }

        // Save vendor
        const vendor = await saveVendor({
          heading: vendorData.heading,
          description: vendorData.description || '',
          extractedText: vendorData.extractedText || '',
          extraInfo: vendorData.extraInfo || {
            items: vendorData.items ? (Array.isArray(vendorData.items) ? vendorData.items : vendorData.items.split(',').map(i => i.trim())) : [],
            prices: vendorData.prices ? (Array.isArray(vendorData.prices) ? vendorData.prices : vendorData.prices.split(',').map(p => p.trim())) : [],
            hours: vendorData.hours || null,
            contact: vendorData.contact || null,
            features: vendorData.features ? (Array.isArray(vendorData.features) ? vendorData.features : vendorData.features.split(',').map(f => f.trim())) : []
          },
          lat: parseFloat(vendorData.lat),
          lng: parseFloat(vendorData.lng)
        });

        // Delete pending image if ID matches
        try {
          if (vendorData.id && vendorData.id.startsWith('pending-')) {
            await deletePendingImage(vendorData.id);
          }
        } catch (deleteError) {
          console.warn(`Could not delete pending image ${vendorData.id}:`, deleteError);
          // Continue even if delete fails
        }

        results.success.push({
          id: vendorData.id,
          vendorId: vendor.id
        });
      } catch (error) {
        console.error(`Error processing vendor ${vendorData.id}:`, error);
        results.errors.push({
          id: vendorData.id || 'unknown',
          error: error.message || 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.success.length} vendors successfully, ${results.errors.length} errors`,
      results
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process bulk upload' });
  }
};

