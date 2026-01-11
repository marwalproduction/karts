const { getAllPendingImages } = require('../../github-storage');
const { Octokit } = require('@octokit/rest');
const archiver = require('archiver');

// Helper function to get Octokit instance
function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  return new Octokit({ auth: token });
}

// Helper function to fetch image buffer from GitHub
async function getImageBuffer(imagePath) {
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
    
    // Decode base64 image (original, uncompressed)
    const imageBuffer = Buffer.from(data.content, 'base64');
    
    console.log(`Fetched image ${imagePath}: ${imageBuffer.length} bytes`);
    
    return imageBuffer;
  } catch (error) {
    console.error(`Error fetching image ${imagePath}:`, error.message);
    return null;
  }
}

// Admin CSV Export API
// GET /api/admin/pending/csv - Export all pending images as ZIP with CSV and separate image files
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
    
    // Set headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="pending-images-${new Date().toISOString().split('T')[0]}.zip"`);
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Generate CSV content
    const csvRows = [];
    
    // CSV Header (with image filename reference instead of base64)
    csvRows.push('ID,Image Filename,Latitude,Longitude,Timestamp,Date,Time,Heading,Description,Items,Prices,Hours,Contact,Features');
    
    // CSV Data rows and add images to ZIP
    for (const image of pendingImages) {
      const timestamp = image.uploadedAt || image.timestamp || new Date().toISOString();
      const date = new Date(timestamp);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS
      
      // Get image buffer from GitHub
      const imagePath = image.imagePath || `pending-images/${image.id}.jpg`;
      const imageBuffer = await getImageBuffer(imagePath);
      
      // Determine image filename
      const imageFilename = `${image.id}.jpg`;
      
      // Add image to ZIP
      if (imageBuffer) {
        archive.append(imageBuffer, { name: `images/${imageFilename}` });
      }
      
      // Escape CSV values (handle commas and quotes)
      const escapeCsv = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      csvRows.push([
        escapeCsv(image.id),
        escapeCsv(imageFilename), // Image filename reference
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
    
    // Add CSV to ZIP
    const csvContent = csvRows.join('\n');
    archive.append(Buffer.from('\ufeff' + csvContent, 'utf-8'), { name: 'pending-images.csv' });
    
    // Finalize the archive
    await archive.finalize();
    
  } catch (error) {
    console.error('CSV export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to export CSV' });
    }
  }
};

