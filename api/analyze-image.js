const vision = require('@google-cloud/vision');

// Analyze image using Google Cloud Vision API for OCR and object detection
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
    const googleVisionCredentials = process.env.GOOGLE_VISION_CREDENTIALS;
    if (!googleVisionCredentials) {
      return res.status(500).json({ 
        error: 'GOOGLE_VISION_CREDENTIALS not configured. Please set it in Vercel environment variables.' 
      });
    }

    // Parse request body
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });

    const body = Buffer.concat(chunks).toString();
    let data;
    try {
      data = JSON.parse(body);
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const { imageBase64, mimeType } = data;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Parse service account credentials from environment variable
    const credentials = JSON.parse(googleVisionCredentials);
    const client = new vision.ImageAnnotatorClient({ credentials });
    
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // Perform multiple Vision API detections in parallel
    const [textResult, labelResult, objectResult] = await Promise.all([
      // Text detection (OCR)
      client.textDetection({ image: { content: imageBuffer } }),
      // Label detection (objects, scenes, concepts)
      client.labelDetection({ image: { content: imageBuffer } }),
      // Object localization (detects and localizes multiple objects)
      client.objectLocalization({ image: { content: imageBuffer } })
    ]);
    
    // Extract text from OCR
    let extractedText = '';
    if (textResult[0].textAnnotations && textResult[0].textAnnotations.length > 0) {
      extractedText = textResult[0].textAnnotations[0].description || '';
      console.log('Google Vision API OCR completed');
    }
    
    // Extract labels (objects, scenes, concepts)
    const labels = [];
    if (labelResult[0].labelAnnotations) {
      labels.push(...labelResult[0].labelAnnotations
        .map(label => label.description)
        .filter(Boolean));
      console.log('Google Vision API labels:', labels.length);
    }
    
    // Extract detected objects with locations
    const detectedObjects = [];
    if (objectResult[0].localizedObjectAnnotations) {
      detectedObjects.push(...objectResult[0].localizedObjectAnnotations.map(obj => ({
        name: obj.name,
        score: obj.score,
        boundingPoly: obj.boundingPoly
      })));
      console.log('Google Vision API objects detected:', detectedObjects.length);
    }
    
    // Generate heading from labels or objects
    const heading = detectedObjects.length > 0 
      ? detectedObjects[0].name 
      : labels.length > 0 
        ? labels[0] 
        : 'Vendor';
    
    // Generate description from labels
    const description = labels.length > 0
      ? `This vendor appears to be related to: ${labels.slice(0, 5).join(', ')}. ${extractedText ? 'Text extracted from image.' : ''}`
      : extractedText 
        ? 'A vendor or business. ' + extractedText.substring(0, 100)
        : 'A vendor or business';
    
    // Extract items/prices from text (simple pattern matching)
    const items = [];
    const prices = [];
    if (extractedText) {
      // Look for price patterns ($X.XX, X.XX, etc.)
      const pricePattern = /\$?\d+\.?\d*/g;
      const foundPrices = extractedText.match(pricePattern);
      if (foundPrices) {
        prices.push(...foundPrices.slice(0, 10));
      }
      
      // Look for common item indicators (lines, bullet points, etc.)
      const lines = extractedText.split('\n').filter(line => line.trim().length > 0);
      items.push(...lines.slice(0, 10).filter(line => line.length < 50));
    }
    
    // Structure the data
    const structuredData = {
      heading: heading,
      description: description,
      extractedText: extractedText,
      extraInfo: {
        items: items.length > 0 ? items : [],
        prices: prices.length > 0 ? prices : [],
        hours: null, // Vision API doesn't detect hours directly
        contact: null, // Vision API doesn't detect contact directly
        features: labels,
        detectedObjects: detectedObjects.map(obj => obj.name)
      },
      analysisSource: 'google-vision-api'
    };

    res.json({
      success: true,
      data: structuredData
    });

  } catch (error) {
    console.error('Google Vision API error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze image with Google Vision API',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

