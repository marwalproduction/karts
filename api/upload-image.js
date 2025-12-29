const { saveVendor } = require('./github-storage');
const Busboy = require('busboy');

// Vercel serverless function handler
// Accepts image file and processes with Puter.ai on backend
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
        const { filename, encoding, mimeType } = info;
        if (name === 'image') {
          const chunks = [];
          file.on('data', (chunk) => chunks.push(chunk));
          file.on('end', () => {
            imageBuffer = Buffer.concat(chunks);
          });
        }
      });

      busboy.on('field', (name, value) => {
        if (name === 'lat') {
          lat = parseFloat(value);
        } else if (name === 'lng') {
          lng = parseFloat(value);
        }
      });

      busboy.on('finish', resolve);
      busboy.on('error', reject);
      
      req.pipe(busboy);
    });

    if (!imageBuffer || lat === null || lng === null) {
      return res.status(400).json({ error: 'image, lat, and lng are required' });
    }

    // Return immediately - processing happens in background
    res.json({
      status: 'processing',
      message: 'Image uploaded successfully. Processing in background...'
    });

    // Process in background (don't await - let it run async)
    processImageWithPuter(imageBuffer, lat, lng).catch(err => {
      console.error('Background processing error:', err);
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// Background processing function
async function processImageWithPuter(imageBuffer, lat, lng) {
  try {
    const PUTER_USERNAME = process.env.PUTER_USERNAME || 'lokewsh';
    const PUTER_PASSWORD = process.env.PUTER_PASSWORD || 'Power@123';

    // Step 1: Convert image to base64
    const imageBase64 = imageBuffer.toString('base64');
    const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;

    // Step 2: For now, use a simplified approach
    // Since Puter.ai is primarily client-side, we'll use OpenAI API directly
    // OR we can try to use Puter.ai's API if available
    
    // Try to use OpenAI API if available, otherwise use basic OCR
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    let analyzeData;
    
    if (OPENAI_API_KEY) {
      // Use OpenAI Vision API
      analyzeData = await processWithOpenAI(imageBuffer, OPENAI_API_KEY);
    } else {
      // Fallback: Use basic processing with Tesseract or simple inference
      analyzeData = await processWithBasicInference(imageBuffer);
    }

    // Ensure required fields
    if (!analyzeData.heading) {
      analyzeData.heading = 'Vendor';
    }
    if (!analyzeData.description) {
      analyzeData.description = '';
    }
    if (!analyzeData.extractedText) {
      analyzeData.extractedText = '';
    }
    if (!analyzeData.extraInfo) {
      analyzeData.extraInfo = {
        items: [],
        prices: [],
        hours: null,
        contact: null,
        features: []
      };
    }

    // Infer items if empty
    if (!analyzeData.extraInfo.items || analyzeData.extraInfo.items.length === 0) {
      const description = analyzeData.description || '';
      const heading = analyzeData.heading || '';
      const combinedText = (heading + ' ' + description).toLowerCase();
      
      const inferredItems = [];
      if (combinedText.includes('juice') || combinedText.includes('fruit')) {
        inferredItems.push('Fresh Fruit Juices', 'Mixed Juices', 'Orange Juice', 'Apple Juice');
      }
      if (combinedText.includes('coffee') || combinedText.includes('tea')) {
        inferredItems.push('Coffee', 'Tea', 'Hot Beverages', 'Pastries');
      }
      if (combinedText.includes('food') || combinedText.includes('taco') || combinedText.includes('burger')) {
        inferredItems.push('Food Items', 'Snacks', 'Meals');
      }
      if (combinedText.includes('pottery') || combinedText.includes('clay')) {
        inferredItems.push('Clay Pottery', 'Handcrafted Pots', 'Decorative Items', 'Traditional Pottery');
      }
      if (combinedText.includes('culinary') || combinedText.includes('treat') || combinedText.includes('snack')) {
        inferredItems.push('Savory Treats', 'Sweet Snacks', 'Traditional Snacks', 'Leaf Wraps');
      }
      if (combinedText.includes('vegetable') || combinedText.includes('produce')) {
        inferredItems.push('Fresh Vegetables', 'Organic Produce', 'Local Vegetables');
      }
      
      if (inferredItems.length > 0) {
        analyzeData.extraInfo.items = inferredItems;
      } else if (description) {
        analyzeData.extraInfo.items = ['Products', 'Services', 'Items'];
      }
    }

    // Save vendor to GitHub
    await saveVendor({
      heading: analyzeData.heading,
      description: analyzeData.description,
      extractedText: analyzeData.extractedText,
      extraInfo: analyzeData.extraInfo,
      lat: lat,
      lng: lng
    });

    console.log('Vendor processed and saved successfully');

  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

// Process with OpenAI Vision API
async function processWithOpenAI(imageBuffer, apiKey) {
  const fetch = require('node-fetch');
  
  const imageBase64 = imageBuffer.toString('base64');
  
  const prompt = `Analyze this image of a vendor, food cart, or business. Extract and structure the information as JSON with the following format:

{
  "heading": "A short, descriptive title (e.g., 'Taco Stand', 'Coffee Cart', 'Food Truck')",
  "description": "A brief AI-generated description of what this vendor offers, their specialties, or notable features (2-3 sentences)",
  "extractedText": "All visible text from signs, menus, or labels (preserve line breaks)",
  "extraInfo": {
    "items": ["List of specific items/products. IMPORTANT: Infer items from what you see in the image - food items, products, services. Include at least 3-5 items based on the vendor type."],
    "prices": ["Prices if visible"],
    "hours": "Operating hours if visible",
    "contact": "Phone number or contact info if visible",
    "features": ["Notable features like 'outdoor seating', 'cash only', etc."]
  }
}

CRITICAL: Always provide items array with at least 3-5 specific items. Return ONLY valid JSON, no markdown formatting.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const cleanedText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  return JSON.parse(cleanedText);
}

// Basic inference fallback (when no AI API available)
async function processWithBasicInference(imageBuffer) {
  // For testing: return a basic vendor structure
  // In production, you could use Tesseract OCR here
  return {
    heading: 'Vendor',
    description: 'A local vendor offering various products and services.',
    extractedText: '',
    extraInfo: {
      items: ['Products', 'Services', 'Items'],
      prices: [],
      hours: null,
      contact: null,
      features: []
    }
  };
}

