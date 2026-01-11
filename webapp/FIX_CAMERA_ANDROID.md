# Fix Camera Not Opening on Android

## 🔴 Problem
Error: "Media capture intent could not be launched. Falling back to default file picker."

**Root Cause**: Camera plugin is not registered in Android project (`capacitor.plugins.json` is empty)

## ✅ Solution

### Step 1: Install Camera Plugin (if not installed)
```bash
cd /Users/lokeshmarwal/Downloads/karts-main/frontend
npm install @capacitor/camera
```

### Step 2: Sync Plugin to Android
```bash
npx cap sync android
```

This will:
- Register Camera plugin in `capacitor.plugins.json`
- Update Android project with plugin configuration

### Step 3: Rebuild in Android Studio
1. Open Android Studio
2. Open project: `frontend/android`
3. **Clean**: Build → Clean Project
4. **Rebuild**: Build → Rebuild Project
5. **Run** the app

## 🔍 Verify Fix

After syncing, check:
```bash
cat android/app/src/main/assets/capacitor.plugins.json
```

Should show Camera plugin registered (not empty `[]`)

## 📝 Code Changes Made

I've also updated the code to use string literals instead of enums for better compatibility:

```javascript
// Changed from:
source: CameraSource.Camera
direction: CameraDirection.Rear

// To:
source: 'CAMERA'
direction: 'REAR'
```

## 🚀 Quick Fix Command

```bash
cd frontend
npm install @capacitor/camera
npm run build
npx cap sync android
```

Then rebuild in Android Studio.

## ✅ Expected Result

After fixing:
- Click "Capture Photo"
- Camera opens directly (no file picker)
- No "Media capture intent could not be launched" error


