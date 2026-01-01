# Android Studio Setup Guide

This guide will help you set up the Android Studio project for the Karts app.

## Prerequisites

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **Android Studio** - [Download here](https://developer.android.com/studio)
3. **Java JDK 11+** (usually comes with Android Studio)

## Step 1: Install Dependencies

```bash
cd frontend
npm install
```

This will install Capacitor and all required dependencies.

## Step 2: Build React App

```bash
npm run build
```

This creates the `build` folder that Capacitor will use.

## Step 3: Initialize Capacitor (First Time Only)

```bash
npx cap init
```

When prompted:
- **App name**: `Karts`
- **App ID**: `com.marwalproduction.karts`
- **Web dir**: `build`

## Step 4: Add Android Platform

```bash
npx cap add android
```

## Step 5: Sync Project

```bash
npm run cap:sync
```

This command:
- Builds your React app
- Copies files to Android project
- Syncs all changes

## Step 6: Open in Android Studio

```bash
npm run cap:open
```

Or manually:
```bash
npx cap open android
```

## Development Workflow

### Option A: Automatic Sync (Recommended)

1. **Edit code in Cursor**
2. **Run sync command**:
   ```bash
   npm run cap:sync
   ```
3. **In Android Studio**: Click "Run" button (or press Shift+F10)
4. **Changes appear automatically** in the emulator/device

### Option B: One Command Setup

```bash
npm run android:dev
```

This builds, syncs, and opens Android Studio in one command.

## Android Permissions

The app requires these permissions (already configured):
- **Camera**: For taking photos of vendors
- **Location**: For geolocation
- **Internet**: For API calls

These are configured in `android/app/src/main/AndroidManifest.xml`

## Troubleshooting

### "Command not found: npm"
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Restart your terminal after installation

### "Capacitor not found"
- Run `npm install` in the `frontend` directory

### "Android Studio not found"
- Install Android Studio from [developer.android.com/studio](https://developer.android.com/studio)
- Make sure it's in your PATH

### Build Errors
- Make sure you've run `npm run build` first
- Check that the `build` folder exists

## Project Structure

```
frontend/
├── build/              # Built React app (created by npm run build)
├── android/            # Android Studio project (created by Capacitor)
├── capacitor.config.json
└── package.json
```

## Next Steps

1. Open Android Studio
2. Start an Android emulator (or connect a device)
3. Click "Run" in Android Studio
4. Edit code in Cursor
5. Run `npm run cap:sync` to see changes

## Publishing to Play Store

When ready to publish:

1. Build release APK/AAB in Android Studio
2. Sign the app
3. Upload to Google Play Console

For detailed publishing steps, see Android Studio documentation.

