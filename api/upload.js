const Tesseract = require('tesseract.js');
const Busboy = require('busboy');

// Vercel serverless function handler
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
        if (name === 'image') {
          const chunks = [];
          file.on('data', (chunk) => chunks.push(chunk));
          file.on('end', () => {
            imageBuffer = Buffer.concat(chunks);
          });
        }
      });

      busboy.on('field', (name, value) => {
        if (name === 'lat') lat = value;
        if (name === 'lng') lng = value;
      });

      busboy.on('finish', resolve);
      busboy.on('error', reject);
      req.pipe(busboy);
    });

    if (!imageBuffer || !lat || !lng) {
      return res.status(400).json({ error: 'image, lat, and lng are required' });
    }

    // OCR: use Tesseract to extract text
    const { data: { text } } = await Tesseract.recognize(
      imageBuffer,
      'eng',
      { logger: m => console.log(m) }
    );

    res.json({
      ocr: text,
      coords: { lat, lng },
      message: 'Vendor info extracted (text only for now)'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

