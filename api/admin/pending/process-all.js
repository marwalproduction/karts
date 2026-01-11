const { getAllPendingImages, getPendingImage, deletePendingImage, saveVendor } = require('../../github-storage');
const fetch = require('node-fetch');

// Process all pending images automatically
// POST /api/admin/pending/process-all
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
    console.log('🔄 Starting batch processing of pending images...');
    
    // Get all pending images
    const pendingImages = await getAllPendingImages();
    
    if (pendingImages.length === 0) {
      return res.json({
        success: true,
        message: 'No pending images to process',
        processed: 0,
        results: []
      });
    }

    console.log(`Found ${pendingImages.length} pending images to process`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each image
    for (const pendingImage of pendingImages) {
      try {
        // Skip images with invalid locations
        if (pendingImage.location.lat === 0 && pendingImage.location.lng === 0) {
          console.log(`⚠️ Skipping ${pendingImage.id} - invalid location (0,0)`);
          results.push({
            id: pendingImage.id,
            status: 'skipped',
            reason: 'Invalid location (0,0)'
          });
          errorCount++;
          continue;
        }

        // Extract basic info from image ID (timestamp-based)
        const timestamp = pendingImage.id.split('-')[1];
        const date = new Date(parseInt(timestamp));
        
        // Create vendor with basic information
        // In a real scenario, you'd use AI to extract this, but for now we'll use defaults
        const vendor = await saveVendor({
          heading: `Vendor ${pendingImage.id.substring(0, 20)}`,
          description: `Vendor processed from pending image on ${date.toLocaleDateString()}`,
          extractedText: '',
          extraInfo: {
            items: [],
            prices: '',
            hours: '',
            contact: '',
            features: []
          },
          lat: pendingImage.location.lat,
          lng: pendingImage.location.lng
        });

        // Delete pending image
        await deletePendingImage(pendingImage.id);

        console.log(`✅ Processed ${pendingImage.id} -> ${vendor.id}`);
        
        results.push({
          id: pendingImage.id,
          status: 'success',
          vendorId: vendor.id,
          location: pendingImage.location
        });
        
        successCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error processing ${pendingImage.id}:`, error.message);
        results.push({
          id: pendingImage.id,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    console.log(`✅ Batch processing complete: ${successCount} success, ${errorCount} errors`);

    res.json({
      success: true,
      message: `Processed ${successCount} images successfully, ${errorCount} errors`,
      processed: successCount,
      errors: errorCount,
      total: pendingImages.length,
      results: results
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

