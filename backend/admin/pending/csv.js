const { getAllPendingImages } = require('../../github-storage');
const { Octokit } = require('@octokit/rest');

// Helper function to get Octokit instance
function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  return new Octokit({ auth: token });
}

// Helper function to compress and convert image to base64
async function getCompressedImageBase64(imagePath) {
  try {
    const octokit = getOctokit();
    const OWNER = process.env.GITHUB_OWNER || 'marwalproduction';
    const REPO = process.env.GITHUB_REPO || 'karts';
    
    // Fetch image from GitHub
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: imagePath,
    });
    
    // Decode base64 image
    let imageBuffer = Buffer.from(data.content, 'base64');
    let mimeType = 'image/jpeg';
    
    // Try to use sharp for compression (if available)
    try {
      const sharp = require('sharp');
      
      // Compress: max width 1200px, quality 70%, convert to JPEG
      imageBuffer = await sharp(imageBuffer)
        .resize(1200, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ 
          quality: 70,
          mozjpeg: true 
        })
        .toBuffer();
      
      mimeType = 'image/jpeg';
      console.log(`Compressed image ${imagePath}: ${imageBuffer.length} bytes`);
    } catch (sharpError) {
      // If sharp is not available, use original image
      // Note: For production, install sharp: npm install sharp
      console.warn(`Sharp not available for ${imagePath}, using original image (${imageBuffer.length} bytes)`);
      
      // If image is extremely large (>2MB), truncate or skip
      if (imageBuffer.length > 2000000) {
        console.warn(`Image ${imagePath} is very large (${imageBuffer.length} bytes), consider installing sharp for compression`);
      }
    }
    
    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Image}`;
    
    return dataUri;
  } catch (error) {
    console.error(`Error fetching/compressing image ${imagePath}:`, error.message);
    // Return empty string if image can't be fetched
    return '';
  }
}

// Admin CSV Export API
// GET /api/admin/pending/csv - Export all pending images as CSV with embedded compressed images
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
    const pendingImages = await getAllPendingImages();
    
    // Generate CSV content
    const csvRows = [];
    
    // CSV Header (with compressed image column instead of URLs)
    csvRows.push('ID,Compressed Image (Base64),Latitude,Longitude,Timestamp,Date,Time,Heading,Description,Items,Prices,Hours,Contact,Features');
    
    // CSV Data rows
    for (const image of pendingImages) {
      const timestamp = image.uploadedAt || image.timestamp || new Date().toISOString();
      const date = new Date(timestamp);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS
      
      // Get compressed image as base64
      const imagePath = image.imagePath || `pending-images/${image.id}.jpg`;
      const compressedImageBase64 = await getCompressedImageBase64(imagePath);
      
      // Escape CSV values (handle commas and quotes)
      const escapeCsv = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // For base64 images, always wrap in quotes and escape internal quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.length > 100) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      csvRows.push([
        escapeCsv(image.id),
        escapeCsv(compressedImageBase64), // Compressed base64 image instead of URL
        escapeCsv(image.location?.lat || ''),
        escapeCsv(image.location?.lng || ''),
        escapeCsv(timestamp),
        escapeCsv(dateStr),
        escapeCsv(timeStr),
        '', // Heading - fill after processing
        '', // Description - fill after processing
        '', // Items - fill after processing (comma or semicolon separated)
        '', // Prices - fill after processing
        '', // Hours - fill after processing
        '', // Contact - fill after processing
        ''  // Features - fill after processing
      ].join(','));
    }
    
    const csvContent = csvRows.join('\n');
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pending-images-${new Date().toISOString().split('T')[0]}.csv"`);
    
    // Add BOM for UTF-8 (helps Excel open it correctly)
    res.write('\ufeff');
    res.write(csvContent);
    res.end();
    
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: error.message || 'Failed to export CSV' });
  }
};

