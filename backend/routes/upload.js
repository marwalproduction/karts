const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');

const router = express.Router();

// Use memory storage for Vercel serverless (no file system)
const upload = multer({ storage: multer.memoryStorage() });

// POST /upload - expects: image file, location {lat, lng} (JSON or form)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!req.file || !lat || !lng) {
      return res.status(400).json({ error: 'image, lat, and lng are required' });
    }

    // OCR: use Tesseract to extract text from buffer (memory)
    const { data: { text } } = await Tesseract.recognize(
      req.file.buffer,
      'eng',
      { logger: m => console.log(m) }
    );

    res.json({
      ocr: text,
      coords: { lat, lng },
      // classification: null, // To be added
      message: 'Vendor info extracted (text only for now)'
    });
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
});

module.exports = router;

