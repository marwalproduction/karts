const { GoogleGenerativeAI } = require('@google/generative-ai');
const { init } = require('@heyputer/puter.js/src/init.cjs');
const vision = require('@google-cloud/vision');

// Analyze image using Google Cloud Vision API + Google Gemini + Puter.ai (optional)
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY not configured. Please set it in Vercel environment variables.' 
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

    // Step 1: Try Google Cloud Vision API for OCR (if credentials are set)
    let visionApiText = '';
    let visionApiLabels = [];
    const googleVisionCredentials = process.env.GOOGLE_VISION_CREDENTIALS;
    
    if (googleVisionCredentials) {
      try {
        // Parse service account credentials from environment variable
        const credentials = JSON.parse(googleVisionCredentials);
        const client = new vision.ImageAnnotatorClient({ credentials });
        
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        
        // Perform text detection (OCR)
        const [textResult] = await client.textDetection({
          image: { content: imageBuffer }
        });
        
        if (textResult.textAnnotations && textResult.textAnnotations.length > 0) {
          visionApiText = textResult.textAnnotations[0].description || '';
          console.log('Google Vision API OCR completed');
        }
        
        // Perform label detection for context
        const [labelResult] = await client.labelDetection({
          image: { content: imageBuffer }
        });
        
        if (labelResult.labelAnnotations) {
          visionApiLabels = labelResult.labelAnnotations
            .map(label => label.description)
            .filter(Boolean);
          console.log('Google Vision API labels:', visionApiLabels.length);
        }
      } catch (visionError) {
        console.error('Google Vision API error (non-critical):', visionError.message);
        // Continue with other methods if Vision API fails
      }
    }

    // Step 2: Try Puter.ai first (if available) for image analysis
    let puterAnalysis = null;
    const puterAuthToken = process.env.PUTER_AUTH_TOKEN;
    
    if (puterAuthToken) {
      try {
        const puter = init(puterAuthToken);
        
        // Convert base64 to data URL for Puter.ai
        const imageDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;
        
        // Use Puter.ai chat to analyze the image
        const puterResponse = await puter.ai.chat(
          `Analyze this image of a vendor, food cart, or business. Extract and structure the information as JSON with: heading (short title), description (2-3 sentences), extractedText (all visible text), extraInfo (items, prices, hours, contact, features). Return ONLY valid JSON, no markdown.`,
          imageDataUrl,
          { model: "gpt-4o-mini" } // or "gpt-5-nano" if available
        );
        
        puterAnalysis = puterResponse;
        console.log('Puter.ai analysis completed');
      } catch (puterError) {
        console.error('Puter.ai error (non-critical):', puterError.message);
        // Continue with Gemini if Puter.ai fails
      }
    }

    // Step 3: Initialize Gemini for text extraction and understanding (fallback or combined)
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-pro-vision for vision tasks (standard model for image analysis)
    // Alternative models: gemini-1.5-pro, gemini-pro
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    // Prepare the prompt for structured vendor information
    // Include Google Vision API OCR text if available
    const visionApiContext = visionApiText 
      ? `\n\nExtracted text from image (OCR): ${visionApiText.substring(0, 500)}`
      : '';
    const visionLabelsContext = visionApiLabels.length > 0
      ? `\n\nDetected labels/objects: ${visionApiLabels.join(', ')}`
      : '';

    const prompt = `Analyze this image of a vendor, food cart, or business. Extract and structure the information as JSON with the following format:

{
  "heading": "A short, descriptive title (e.g., 'Taco Stand', 'Coffee Cart', 'Food Truck')",
  "description": "A brief AI-generated description of what this vendor offers, their specialties, or notable features (2-3 sentences)",
  "extractedText": "All visible text from signs, menus, or labels (preserve line breaks)",
  "extraInfo": {
    "items": ["List of items/products if visible"],
    "prices": ["Prices if visible"],
    "hours": "Operating hours if visible",
    "contact": "Phone number or contact info if visible",
    "features": ["Notable features like 'outdoor seating', 'cash only', etc."]
  }
}

Be concise but informative. If information is not visible, use null or empty arrays. Return ONLY valid JSON, no markdown formatting.${visionApiContext}${visionLabelsContext}`;

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Call Gemini Vision API
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      },
    ]);

    const response = await result.response;
    let text = response.text();

    // Clean up the response (remove markdown code blocks if present)
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let structuredData;
    
    // If Puter.ai provided analysis, try to use it
    if (puterAnalysis) {
      try {
        // Puter.ai might return JSON directly or as text
        const puterText = typeof puterAnalysis === 'string' ? puterAnalysis : puterAnalysis.text || JSON.stringify(puterAnalysis);
        const cleanedPuterText = puterText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        structuredData = JSON.parse(cleanedPuterText);
        console.log('Using Puter.ai analysis');
      } catch (puterParseError) {
        console.log('Puter.ai response not valid JSON, using Gemini instead');
        // Fall through to Gemini parsing
      }
    }
    
    // If Puter.ai didn't work or wasn't available, use Gemini
    if (!structuredData) {
      try {
        structuredData = JSON.parse(text);
        console.log('Using Gemini analysis');
      } catch (parseError) {
        // If JSON parsing fails, create a fallback structure
        console.error('Failed to parse Gemini response as JSON:', text);
        structuredData = {
          heading: 'Vendor',
          description: text.substring(0, 200) || 'A vendor or business',
          extractedText: text,
          extraInfo: {
            items: [],
            prices: [],
            hours: null,
            contact: null,
            features: []
          }
        };
      }
    }
    
    // Enhance with Google Vision API OCR if available
    if (visionApiText && !structuredData.extractedText) {
      structuredData.extractedText = visionApiText;
    } else if (visionApiText && structuredData.extractedText) {
      // Combine OCR text (Vision API is usually more accurate for text)
      structuredData.extractedText = visionApiText + '\n\n' + structuredData.extractedText;
    }
    
    // Add detected labels to features if available
    if (visionApiLabels.length > 0) {
      if (!structuredData.extraInfo) {
        structuredData.extraInfo = {};
      }
      if (!structuredData.extraInfo.features) {
        structuredData.extraInfo.features = [];
      }
      structuredData.extraInfo.features = [
        ...structuredData.extraInfo.features,
        ...visionApiLabels
      ];
    }
    
    // Add source information
    const sources = [];
    if (visionApiText) sources.push('google-vision-ocr');
    if (puterAnalysis) sources.push('puter.ai');
    if (!puterAnalysis) sources.push('gemini');
    structuredData.analysisSource = sources.join(' + ');

    res.json({
      success: true,
      data: structuredData
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze image',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

