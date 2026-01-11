# Fix Camera Intent Issue on Android

## Problem
Error: "Media capture intent could not be launched. Falling back to default file picker."

## Solution Applied
Changed from enum values to string literals for better compatibility:

```javascript
// Before (might not work on all Capacitor versions):
source: CameraSource.Camera
direction: CameraDirection.Rear

// After (more compatible):
source: 'CAMERA'
direction: 'REAR'
```

## Steps to Fix

1. **Rebuild and sync**:
   ```bash
   cd frontend
   npm run build
   npx cap sync android
   ```

2. **In Android Studio**:
   - Clean: Build → Clean Project
   - Rebuild: Build → Rebuild Project
   - Run the app

3. **Verify Camera plugin is installed**:
   ```bash
   npm list @capacitor/camera
   ```

   If not installed:
   ```bash
   npm install @capacitor/camera
   npx cap sync android
   ```

## Additional Checks

1. **Check permissions in AndroidManifest.xml**:
   - Should have `<uses-permission android:name="android.permission.CAMERA" />`
   - Already configured ✅

2. **Runtime permissions**:
   - The app requests camera permission at runtime
   - Make sure to grant permission when prompted

3. **Check capacitor.plugins.json**:
   - Should include Camera plugin registration
   - Run `npx cap sync android` to regenerate

## Testing

After rebuilding:
1. Open app
2. Click "Capture Photo"
3. Grant camera permission if prompted
4. Camera should open directly (not file picker)

## If Still Not Working

1. **Uninstall and reinstall the app** (clears permission cache)
2. **Check Logcat** for detailed error messages
3. **Verify Camera plugin version** matches Capacitor version:
   ```bash
   npm list @capacitor/core @capacitor/camera
   ```


