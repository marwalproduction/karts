# Karts Image Processing Automation

Automation script to process pending vendor images using Google Gemini AI.

## Features

- 📥 Downloads pending images from the API
- 🤖 Opens Gemini AI in browser
- 📤 Uploads images to Gemini
- 🔍 Extracts vendor information (name, items, prices, hours, contact, features)
- 📤 Sends processed data back to backend
- ✅ Automatically approves processed vendors

## Setup

1. **Install dependencies:**
   ```bash
   cd automation
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Environment Variables:**
   - `API_URL` - Your backend API URL (default: https://karts-tau.vercel.app)
   - `GEMINI_URL` - Gemini AI URL (default: https://gemini.google.com)
   - `DOWNLOAD_DIR` - Directory to save downloaded images (default: ./downloads)
   - `HEADLESS` - Run browser in headless mode (default: false)
   - `WAIT_TIME` - Time to wait for Gemini response in ms (default: 5000)

## Usage

```bash
npm start
# or
node process-images.js
```

## How It Works

1. **Download Images**: Fetches all pending images from `/api/admin/pending`
2. **Open Browser**: Launches Chromium browser (Puppeteer)
3. **Navigate to Gemini**: Opens Google Gemini AI interface
4. **Upload Image**: Uploads each image to Gemini
5. **Send Prompt**: Sends a structured prompt to extract vendor information
6. **Extract Data**: Parses JSON response from Gemini
7. **Send to Backend**: Uploads processed data via `/api/admin/pending/bulk-upload`
8. **Save Results**: Saves processing results to `downloads/results.json`

## Output

- Downloaded images: `downloads/images/`
- Processing results: `downloads/results.json`

## Notes

- The script processes images one by one to avoid rate limiting
- Browser automation may need adjustments based on Gemini's interface changes
- Make sure you're logged into Google/Gemini in the browser
- The script waits for responses, so processing may take time

## Troubleshooting

- **Browser not opening**: Set `HEADLESS=false` in `.env`
- **Upload button not found**: Gemini interface may have changed, update selectors in `process-images.js`
- **No response from Gemini**: Increase `WAIT_TIME` in `.env`
- **API errors**: Check `API_URL` is correct and backend is accessible

