const { getAllPendingImages } = require('../../github-storage');
const { Octokit } = require('@octokit/rest');
const archiver = require('archiver');
const fetch = require('node-fetch');

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
    let response;
    try {
      response = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: imagePath,
      });
    } catch (apiError) {
      if (apiError.status === 404) {
        throw new Error(`Image file not found on GitHub: ${imagePath}`);
      }
      throw new Error(`GitHub API error: ${apiError.message}`);
    }
    
    const { data } = response;
    
    // Check if data exists
    if (!data) {
      throw new Error('GitHub API returned no data');
    }
    
    // Check if data.content exists
    if (!data.content) {
      // Log the actual response structure for debugging
      console.log(`GitHub API response for ${imagePath}:`, {
        type: data.type,
        size: data.size,
        encoding: data.encoding,
        hasContent: !!data.content,
        hasDownloadUrl: !!data.download_url,
        keys: Object.keys(data)
      });
      
      // If file is too large (>1MB), GitHub returns download_url instead of content
      if (data.download_url) {
        console.log(`File too large, fetching from download_url: ${data.download_url}`);
        // Fetch image from raw URL using node-fetch
        const fetch = require('node-fetch');
        const response = await fetch(data.download_url);
        if (!response.ok) {
          throw new Error(`Failed to download image from URL: ${response.statusText}`);
        }
        const imageBuffer = await response.buffer();
        console.log(`✓ Downloaded image from URL: ${imageBuffer.length} bytes`);
        return imageBuffer;
      }
      
      throw new Error('GitHub API returned no content and no download_url for image');
    }
    
    // GitHub API returns base64 encoded content
    // Remove any whitespace/newlines that GitHub might add
    const base64Content = data.content.replace(/\s/g, '');
    
    if (!base64Content || base64Content.length === 0) {
      throw new Error('Base64 content is empty after cleaning');
    }
    
    // Decode base64 to buffer
    let imageBuffer;
    try {
      imageBuffer = Buffer.from(base64Content, 'base64');
    } catch (decodeError) {
      throw new Error(`Failed to decode base64: ${decodeError.message}`);
    }
    
    // Validate buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Image buffer is empty after decoding');
    }
    
    // Validate it's a valid image (check for common image file signatures)
    const isJPEG = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8;
    const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;
    const isGIF = imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46;
    const isValidImage = isJPEG || isPNG || isGIF;
    
    if (!isValidImage && imageBuffer.length > 10) {
      console.warn(`Image ${imagePath} might be corrupted - invalid file signature. First bytes: ${imageBuffer.slice(0, 4).toString('hex')}`);
      // Don't throw - still return the buffer, let the caller decide
    }
    
    console.log(`✓ Fetched image ${imagePath}: ${imageBuffer.length} bytes`);
    
    return imageBuffer;
  } catch (error) {
    console.error(`Error fetching image ${imagePath}:`, error.message);
    console.error(`Full error:`, error);
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
    // Verify archiver is available
    if (!archiver) {
      throw new Error('archiver package is not available. Please ensure it is installed.');
    }
    
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
    console.log(`Processing ${pendingImages.length} pending images...`);
    let successCount = 0;
    let failCount = 0;
    
    for (const image of pendingImages) {
      const timestamp = image.uploadedAt || image.timestamp || new Date().toISOString();
      const date = new Date(timestamp);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS
      
      // Get image buffer from GitHub
      const imagePath = image.imagePath || `pending-images/${image.id}.jpg`;
      console.log(`Fetching image: ${imagePath} for ID: ${image.id}`);
      
      const imageBuffer = await getImageBuffer(imagePath);
      
      // Determine image filename (preserve original extension if available)
      let imageFilename = `${image.id}.jpg`;
      if (imagePath.includes('.')) {
        const ext = imagePath.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          imageFilename = `${image.id}.${ext}`;
        }
      }
      
      // Add image to ZIP only if buffer is valid
      if (imageBuffer && imageBuffer.length > 0) {
        archive.append(imageBuffer, { name: `images/${imageFilename}` });
        console.log(`✓ Added image ${imageFilename} to ZIP (${imageBuffer.length} bytes)`);
        successCount++;
      } else {
        console.error(`✗ Failed to fetch image ${imagePath} for ID ${image.id} - buffer is empty or invalid`);
        failCount++;
        // Still add to CSV but mark as missing
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
    
    console.log(`ZIP creation summary: ${successCount} images added, ${failCount} images failed out of ${pendingImages.length} total`);
    
    // Finalize the archive
    await archive.finalize();
    
  } catch (error) {
    console.error('CSV export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to export CSV' });
    }
  }
};

