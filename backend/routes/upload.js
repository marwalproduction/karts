const express = require('express');
const multer = require('multer');
const path = require('path');
const Tesseract = require('tesseract.js');
const fs = require('fs');

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// POST /upload - expects: image file, location {lat, lng} (JSON or form)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!req.file || !lat || !lng) {
      return res.status(400).json({ error: 'image, lat, and lng are required' });
    }

    // OCR: use Tesseract to extract text
    const imagePath = req.file.path;
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng',
      { logger: m => console.log(m) }
    );

    // Optional: save to DB here (we'll do this later)
    // Clean up the uploaded file
    fs.unlink(imagePath, () => {});

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

