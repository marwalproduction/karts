const { getAllPendingImages } = require('../../github-storage');

// Admin CSV Export API
// GET /api/admin/pending/csv - Export all pending images as CSV
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
    
    // CSV Header (with columns for processed data)
    csvRows.push('ID,Image URL,Download URL,Latitude,Longitude,Timestamp,Date,Time,Heading,Description,Items,Prices,Hours,Contact,Features');
    
    // CSV Data rows
    for (const image of pendingImages) {
      const timestamp = image.uploadedAt || image.timestamp || new Date().toISOString();
      const date = new Date(timestamp);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS
      
      // Image URLs - use the imageUrl from metadata if available, otherwise construct it
      const imageUrl = image.imageUrl || `https://raw.githubusercontent.com/${process.env.GITHUB_OWNER || 'marwalproduction'}/${process.env.GITHUB_REPO || 'karts'}/main/${image.imagePath || `pending-images/${image.id}.jpg`}`;
      const downloadUrl = imageUrl; // Same URL for download
      
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
        escapeCsv(imageUrl),
        escapeCsv(downloadUrl),
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

