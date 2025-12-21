# Puter.ai Integration Setup (Optional)

This app can use [Puter.ai](https://docs.puter.com/getting-started/) for image analysis as an alternative or complement to Gemini.

## Puter.ai Features

✅ **Free/User-Pays Model**: Users cover their own AI usage costs  
✅ **Multiple AI Models**: Access to 400+ AI models (GPT, Claude, Gemini, etc.)  
✅ **Image Analysis**: Can analyze images with vision models  
✅ **OCR Support**: `img2txt()` function for text extraction  
✅ **No Backend Required**: Can work client-side or server-side  

## Setup Instructions

### 1. Get Puter.ai Auth Token

1. Go to [Puter.com](https://puter.com/)
2. Sign up for an account (free)
3. Get your auth token from account settings
4. Or use Puter.js in the browser without a token (client-side only)

### 2. Configure Vercel Environment Variable

Add in Vercel → Settings → Environment Variables:

- **PUTER_AUTH_TOKEN** (optional)
  - Your Puter.ai authentication token
  - Required for server-side usage
  - If not set, the app will use Gemini only

### 3. How It Works

**Priority Order:**
1. **Puter.ai** (if `PUTER_AUTH_TOKEN` is set) - Tries first
2. **Gemini** (fallback) - Used if Puter.ai fails or isn't configured
3. **YOLOv8** (optional) - Adds object detection if `ROBOFLOW_API_KEY` is set

**Combined Analysis:**
- Puter.ai/Gemini: Text extraction and understanding
- YOLOv8: Object detection
- Results merged for comprehensive vendor information

## Usage

The app automatically uses Puter.ai if the token is configured. No code changes needed!

## Benefits

✅ **Free for Users**: User-pays model means no cost to you  
✅ **Multiple Models**: Can use GPT-4, Claude, Gemini, etc.  
✅ **Fast**: Direct API access  
✅ **Optional**: Works without it (uses Gemini)  

## Model Options

You can specify different models in the code:
- `gpt-4o-mini` - Fast and efficient
- `gpt-5-nano` - Latest model (if available)
- `claude-3-haiku` - Anthropic's fast model
- Or any other model from Puter.ai's 400+ options

## Note

Puter.ai is **optional**. The app works perfectly with just Gemini. Puter.ai adds an alternative AI provider option.

For more information, see: [Puter.js Documentation](https://docs.puter.com/getting-started/)

