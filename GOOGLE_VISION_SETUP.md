# Google Cloud Vision API Setup

This app uses Google Cloud Vision API for high-quality OCR (text extraction) and image labeling.

## Google Cloud Vision API Features

✅ **Excellent OCR**: Industry-leading text extraction from images  
✅ **Label Detection**: Identifies objects, scenes, and concepts in images  
✅ **Free Tier**: 1,000 requests/month free  
✅ **Accurate**: Better text extraction than many alternatives  

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Vision API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Cloud Vision API"
3. Click **Enable**

### 3. Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - **Service account name**: `karts-vision-api`
   - **Service account ID**: (auto-generated)
   - Click **Create and Continue**
4. **Grant role**: Select "Cloud Vision API User"
5. Click **Continue** → **Done**

### 4. Create and Download Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create** - This downloads a JSON file

### 5. Configure Vercel Environment Variable

1. Open the downloaded JSON file
2. Copy the entire contents
3. Go to Vercel → Your Project → Settings → Environment Variables
4. Add new variable:
   - **Key**: `GOOGLE_VISION_CREDENTIALS`
   - **Value**: Paste the entire JSON content
   - **Environments**: Select all (Production, Preview, Development)
   - **Sensitive**: Enable (recommended)
5. Click **Save**

### 6. Redeploy

After adding the environment variable, redeploy your application.

## How It Works

**Priority Order:**
1. **Google Vision API** (if credentials set) - Extracts text via OCR
2. **Puter.ai** (if token set) - AI analysis
3. **Gemini** (fallback) - AI analysis and understanding

**Combined Analysis:**
- Google Vision API: High-quality OCR text extraction
- Puter.ai/Gemini: Understanding and structuring the information
- Results merged for comprehensive vendor data

## Pricing

- **Free Tier**: First 1,000 requests/month free
- **After Free Tier**: 
  - Text Detection: $1.50 per 1,000 images
  - Label Detection: $1.50 per 1,000 images
- Very affordable for most use cases

## Benefits

✅ **Better OCR**: More accurate text extraction than basic OCR  
✅ **Label Detection**: Identifies objects and scenes automatically  
✅ **Reliable**: Google's enterprise-grade API  
✅ **Fast**: Quick response times  
✅ **Optional**: Works without it (uses Gemini OCR)  

## Troubleshooting

- **Error: "Credentials not found"**: Make sure `GOOGLE_VISION_CREDENTIALS` is set correctly
- **Error: "API not enabled"**: Enable Cloud Vision API in Google Cloud Console
- **Error: "Permission denied"**: Check service account has "Cloud Vision API User" role

## Note

Google Vision API is **optional**. The app works fine with just Gemini/Puter.ai. Vision API adds high-quality OCR capabilities but isn't required for basic functionality.

For more information, see: [Google Cloud Vision API Documentation](https://cloud.google.com/vision/docs)

