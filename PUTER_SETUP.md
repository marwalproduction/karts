# Puter.ai Setup

This app uses [Puter.ai](https://docs.puter.com/getting-started/) for AI-powered image analysis directly in the browser.

## How It Works

✅ **Client-Side Processing**: Image analysis happens in the browser  
✅ **No Server Required**: No API keys needed on the server  
✅ **User-Pays Model**: Users cover their own AI usage costs  
✅ **Multiple Models**: Access to GPT-5-nano and other models  
✅ **Fast**: Direct browser-to-AI communication  

## Setup

### No Configuration Required!

Puter.ai is loaded automatically via the script tag in `index.html`:
```html
<script src="https://js.puter.com/v2/"></script>
```

The app uses Puter.ai directly in the browser - no environment variables or API keys needed!

## Features

- **Image Analysis**: Uses GPT-5-nano model for understanding images
- **Text Extraction**: Extracts all visible text from signs, menus, labels
- **Structured Data**: Organizes vendor information into headings, descriptions, and categories
- **Smart Listings**: Displays vendors with clear headings and descriptions

## Model Used

- **gpt-5-nano**: Fast and efficient model for image analysis

You can change the model in `frontend/src/App.js` if needed:
```javascript
{ model: "gpt-5-nano" } // or "gpt-4o-mini", "claude-3-haiku", etc.
```

## Benefits

✅ **No Backend Setup**: Everything runs in the browser  
✅ **No API Keys**: No server-side configuration needed  
✅ **Free for You**: User-pays model means no cost to you  
✅ **Fast**: Direct communication, no server round-trip  
✅ **Privacy**: Images never leave the user's browser  

## How It Works

1. User captures/selects image
2. Image analyzed by Puter.ai in the browser
3. Structured data extracted (heading, description, text, etc.)
4. Data sent to server for storage
5. Vendor saved to GitHub

For more information, see: [Puter.js Documentation](https://docs.puter.com/getting-started/)

