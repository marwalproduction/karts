const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const API_URL = process.env.API_URL || 'https://karts-tau.vercel.app';
const GEMINI_URL = process.env.GEMINI_URL || 'https://gemini.google.com';
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';
const HEADLESS = process.env.HEADLESS === 'true';
const WAIT_TIME = parseInt(process.env.WAIT_TIME || '5000');

// Prompt template for Gemini
const GEMINI_PROMPT = `Analyze this vendor image and extract the following information in JSON format:

{
  "heading": "Business/vendor name",
  "description": "Brief 1-2 line description",
  "items": ["item1", "item2", "item3"],
  "prices": "Price information if visible",
  "hours": "Operating hours if visible",
  "contact": "Phone/contact info if visible",
  "features": ["feature1", "feature2"]
}

Only extract information that is clearly visible in the image. If something is not visible, use empty string or empty array.`;

async function downloadPendingImages() {
  console.log('📥 Downloading pending images...');
  
  try {
    // Create downloads directory
    await fs.ensureDir(DOWNLOAD_DIR);
    await fs.ensureDir(path.join(DOWNLOAD_DIR, 'images'));
    
    // Fetch pending images from API
    const response = await fetch(`${API_URL}/api/admin/pending`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pending images: ${response.statusText}`);
    }
    
    const data = await response.json();
    const pendingImages = data.pendingImages || [];
    
    console.log(`Found ${pendingImages.length} pending images`);
    
    if (pendingImages.length === 0) {
      console.log('No pending images to process');
      return [];
    }
    
    // Download images
    const images = [];
    for (const image of pendingImages) {
      try {
        const imageUrl = image.imageUrl || `https://raw.githubusercontent.com/marwalproduction/karts/main/${image.imagePath}`;
        const imageResponse = await fetch(imageUrl);
        
        if (!imageResponse.ok) {
          console.error(`Failed to download ${image.id}: ${imageResponse.statusText}`);
          continue;
        }
        
        const imageBuffer = await imageResponse.buffer();
        const imagePath = path.join(DOWNLOAD_DIR, 'images', `${image.id}.jpg`);
        await fs.writeFile(imagePath, imageBuffer);
        
        images.push({
          id: image.id,
          imagePath: imagePath,
          location: image.location,
          metadata: image
        });
        
        console.log(`✓ Downloaded ${image.id}`);
      } catch (error) {
        console.error(`Error downloading ${image.id}:`, error.message);
      }
    }
    
    return images;
  } catch (error) {
    console.error('Error downloading images:', error);
    throw error;
  }
}

async function processImageWithGemini(browser, imageData) {
  console.log(`\n🤖 Processing ${imageData.id} with Gemini...`);
  
  try {
    const page = await browser.newPage();
    
    // Navigate to Gemini
    await page.goto(GEMINI_URL, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Look for file upload button/area
    // Gemini interface may vary, try common selectors
    const uploadSelectors = [
      'input[type="file"]',
      'button[aria-label*="upload"]',
      'button[aria-label*="Upload"]',
      '[data-testid*="upload"]',
      'button:has-text("Upload")',
      '.upload-button',
      '#upload-button'
    ];
    
    let uploadElement = null;
    for (const selector of uploadSelectors) {
      try {
        uploadElement = await page.$(selector);
        if (uploadElement) {
          console.log(`Found upload element: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!uploadElement) {
      // Try to find any file input
      uploadElement = await page.$('input[type="file"]');
    }
    
    if (uploadElement) {
      // Upload image
      const fileInput = await uploadElement;
      await fileInput.uploadFile(imageData.imagePath);
      console.log('✓ Image uploaded');
      await page.waitForTimeout(3000);
    } else {
      // Alternative: Use drag and drop or paste
      console.log('⚠️ Upload button not found, trying alternative method...');
      // You might need to adjust this based on Gemini's actual interface
    }
    
    // Wait for image to be processed
    await page.waitForTimeout(2000);
    
    // Enter prompt
    const promptSelectors = [
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      'textarea[aria-label*="message"]',
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]'
    ];
    
    let promptElement = null;
    for (const selector of promptSelectors) {
      try {
        promptElement = await page.$(selector);
        if (promptElement) {
          console.log(`Found prompt element: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (promptElement) {
      await promptElement.type(GEMINI_PROMPT, { delay: 50 });
      await page.waitForTimeout(1000);
      
      // Submit (press Enter or click send button)
      await promptElement.press('Enter');
      console.log('✓ Prompt sent');
    } else {
      console.log('⚠️ Prompt input not found');
    }
    
    // Wait for response
    await page.waitForTimeout(WAIT_TIME);
    
    // Extract response text
    const responseSelectors = [
      '[data-message-content]',
      '.message-content',
      '.response-text',
      'div[role="textbox"]',
      '.markdown'
    ];
    
    let responseText = '';
    for (const selector of responseSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          // Get the last element (most recent response)
          const lastElement = elements[elements.length - 1];
          responseText = await page.evaluate(el => el.textContent, lastElement);
          if (responseText) {
            console.log(`✓ Response extracted using: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    // If no specific selector works, try to get all text
    if (!responseText) {
      responseText = await page.evaluate(() => {
        return document.body.innerText;
      });
    }
    
    await page.close();
    
    // Parse JSON from response
    let extractedData = null;
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        extractedData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.warn('Could not parse JSON from response, using raw text');
      // Create structured data from raw text
      extractedData = {
        heading: extractField(responseText, 'heading', 'name', 'business'),
        description: extractField(responseText, 'description'),
        items: extractArray(responseText, 'items'),
        prices: extractField(responseText, 'prices', 'price'),
        hours: extractField(responseText, 'hours', 'operating hours'),
        contact: extractField(responseText, 'contact', 'phone'),
        features: extractArray(responseText, 'features')
      };
    }
    
    return {
      id: imageData.id,
      extractedData: extractedData,
      rawResponse: responseText,
      location: imageData.location
    };
    
  } catch (error) {
    console.error(`Error processing ${imageData.id}:`, error.message);
    return {
      id: imageData.id,
      error: error.message,
      location: imageData.location
    };
  }
}

function extractField(text, ...keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[\\s:]*([^\\n]+)`, 'i');
    const match = text.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function extractArray(text, fieldName) {
  const regex = new RegExp(`${fieldName}[\\s:]*\\[([^\\]]+)\\]`, 'i');
  const match = text.match(regex);
  if (match) {
    return match[1].split(',').map(item => item.trim().replace(/['"]/g, ''));
  }
  return [];
}

async function sendToBackend(processedData) {
  console.log(`\n📤 Sending processed data to backend for ${processedData.id}...`);
  
  try {
    // Prepare vendor data
    const vendorData = {
      heading: processedData.extractedData?.heading || '',
      description: processedData.extractedData?.description || '',
      items: Array.isArray(processedData.extractedData?.items) 
        ? processedData.extractedData.items.join(', ') 
        : processedData.extractedData?.items || '',
      prices: processedData.extractedData?.prices || '',
      hours: processedData.extractedData?.hours || '',
      contact: processedData.extractedData?.contact || '',
      features: Array.isArray(processedData.extractedData?.features)
        ? processedData.extractedData.features.join(', ')
        : processedData.extractedData?.features || '',
      lat: processedData.location?.lat || '',
      lng: processedData.location?.lng || ''
    };
    
    // Send to bulk upload endpoint
    const response = await fetch(`${API_URL}/api/admin/pending/bulk-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        id: processedData.id,
        ...vendorData
      }])
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✓ Successfully sent to backend: ${processedData.id}`);
    return result;
    
  } catch (error) {
    console.error(`Error sending to backend:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting automation process...\n');
  
  try {
    // Step 1: Download pending images
    const images = await downloadPendingImages();
    
    if (images.length === 0) {
      console.log('No images to process. Exiting.');
      return;
    }
    
    // Step 2: Launch browser
    console.log('\n🌐 Launching browser...');
    const browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Step 3: Process each image
    const results = [];
    for (const image of images) {
      try {
        const processed = await processImageWithGemini(browser, image);
        
        if (processed.error) {
          console.error(`✗ Failed to process ${image.id}: ${processed.error}`);
          results.push({ id: image.id, status: 'error', error: processed.error });
          continue;
        }
        
        // Step 4: Send to backend
        await sendToBackend(processed);
        results.push({ id: image.id, status: 'success', data: processed.extractedData });
        
        // Wait between images to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error processing ${image.id}:`, error.message);
        results.push({ id: image.id, status: 'error', error: error.message });
      }
    }
    
    // Close browser
    await browser.close();
    
    // Summary
    console.log('\n📊 Processing Summary:');
    console.log(`Total: ${images.length}`);
    console.log(`Success: ${results.filter(r => r.status === 'success').length}`);
    console.log(`Failed: ${results.filter(r => r.status === 'error').length}`);
    
    // Save results
    const resultsPath = path.join(DOWNLOAD_DIR, 'results.json');
    await fs.writeJson(resultsPath, results, { spaces: 2 });
    console.log(`\n✓ Results saved to ${resultsPath}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, downloadPendingImages, processImageWithGemini, sendToBackend };

