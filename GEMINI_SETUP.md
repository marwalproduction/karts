# Google Gemini API Setup

This app uses Google Gemini Vision API for intelligent image analysis and structured vendor information extraction.

## Setup Instructions

### 1. Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Configure Vercel Environment Variable

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add a new environment variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Google Gemini API key
   - **Environments**: Select all (Production, Preview, Development)
3. Click "Save"
4. **Redeploy** your application

## How It Works

- **Image Analysis**: When you capture/upload an image, it's sent to Gemini Vision API
- **Structured Extraction**: Gemini analyzes the image and extracts:
  - **Heading**: Short descriptive title (e.g., "Taco Stand", "Coffee Cart")
  - **Description**: AI-generated description of what the vendor offers
  - **Extracted Text**: All visible text from signs, menus, labels
  - **Extra Info**: Items, prices, hours, contact, features

## Features

✅ **Smart Image Understanding**: Uses AI to understand what's in the image, not just text extraction  
✅ **Structured Data**: Organizes vendor information into headings, descriptions, and categories  
✅ **Better Listings**: Displays vendors with clear headings, descriptions, and organized details  
✅ **Location Info**: Automatically captures and displays location coordinates  

## API Limits

Google Gemini API has free tier limits:
- **Free tier**: 15 requests per minute
- For production use, consider upgrading to a paid plan

## Troubleshooting

- **Error: "GEMINI_API_KEY not configured"**: Make sure you've added the environment variable in Vercel
- **Error: "Failed to analyze image"**: Check your API key is valid and has quota remaining
- **Slow responses**: Gemini API can take 5-10 seconds for image analysis

