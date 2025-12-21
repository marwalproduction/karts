# Roboflow YOLOv8 Setup (Optional)

This app can use YOLOv8 via Roboflow API for object detection to enhance vendor image analysis.

## Roboflow Free Tier

✅ **Free tier includes:**
- 1,000 API calls per month
- Access to pre-trained models
- YOLOv8 inference
- No credit card required

## Setup Instructions

### 1. Create Roboflow Account

1. Go to [Roboflow](https://roboflow.com/)
2. Sign up for a free account
3. Verify your email

### 2. Get Your API Key

1. Go to [Roboflow Account Settings](https://app.roboflow.com/settings/api)
2. Copy your API key

### 3. Choose or Create a Model

**Option A: Use Pre-trained Model**
- Roboflow Universe has many pre-trained models
- Search for "food", "vendor", "cart", etc.
- Copy the model ID (format: `workspace/model/version`)

**Option B: Train Your Own Model**
- Upload your vendor images
- Annotate objects (food items, carts, signs, etc.)
- Train a custom YOLOv8 model
- Deploy and get model ID

### 4. Configure Vercel Environment Variables

Add these in Vercel → Settings → Environment Variables:

- **ROBOFLOW_API_KEY** (required if using Roboflow)
  - Your Roboflow API key
  
- **ROBOFLOW_MODEL_ID** (optional)
  - Format: `workspace/model/version`
  - Example: `food-items-detection/1`
  - Default: Uses a generic food detection model

### 5. Redeploy

After adding environment variables, redeploy your application.

## How It Works

1. **YOLOv8 Detection**: Detects objects in the image (food items, carts, signs, etc.)
2. **Gemini Analysis**: Extracts text and understands context
3. **Combined Results**: Both detections are merged for comprehensive vendor information

## Recommended Models

For vendor/food detection, search Roboflow Universe for:
- "food detection"
- "food items"
- "street vendor"
- "food cart"

## Benefits

✅ **Better Object Detection**: Identifies specific food items, carts, signs  
✅ **Enhanced Analysis**: Combines object detection with text extraction  
✅ **Free Tier**: 1,000 calls/month is plenty for testing  
✅ **No Setup Required**: Works out of the box with API key  

## Note

Roboflow is **optional**. The app works fine with just Gemini. YOLOv8 adds object detection capabilities but isn't required for basic functionality.

