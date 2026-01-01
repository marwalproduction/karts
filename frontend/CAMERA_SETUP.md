# Camera Setup - Direct Camera Access

## ✅ What's Been Done

1. **Added Capacitor Camera Plugin** - For native camera access on Android
2. **Updated Code** - Camera opens directly when clicking "Capture Photo" on Android
3. **Fallback Support** - Still works on web browsers using file input

## 📦 Installation Required

After pulling the code, you need to install the Camera plugin:

```bash
cd frontend
npm install @capacitor/camera
npx cap sync android
```

## 🔧 How It Works

### On Android (Native):
- Clicking "Capture Photo" → Opens native camera app directly
- Takes photo → Processes and uploads automatically
- No file picker, direct camera access

### On Web Browser:
- Clicking "Capture Photo" → Opens file picker
- Can select from gallery or take photo (if browser supports)

## 🚀 Testing

1. **Build and sync**:
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Open in Android Studio** and run the app

3. **Click "Capture Photo"** → Camera should open directly!

## ⚙️ Permissions

Camera permissions are already configured in:
- `android/app/src/main/AndroidManifest.xml`
- `capacitor.config.json`

The app will request camera permission on first use.

## 🐛 Troubleshooting

### Camera doesn't open
- Make sure you've run `npx cap sync android` after installing the plugin
- Check that camera permissions are granted in Android settings
- Rebuild the app in Android Studio

### "Camera plugin not found"
- Run: `npm install @capacitor/camera`
- Then: `npx cap sync android`

