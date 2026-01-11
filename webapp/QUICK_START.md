# Quick Start - Android Studio Setup

## ⚠️ Prerequisites

**You need Node.js installed first!**

1. Download Node.js from: https://nodejs.org/ (LTS version)
2. Install it
3. Restart your terminal

## 🚀 One-Command Setup

After installing Node.js, run:

```bash
cd /Users/lokeshmarwal/Downloads/karts-main/frontend
./setup-android.sh
```

This script will:
- ✅ Install all dependencies
- ✅ Build your React app
- ✅ Initialize Capacitor
- ✅ Create Android Studio project
- ✅ Sync everything

## 📱 After Setup

1. **Open Android Studio**
2. **Open project**: `frontend/android`
3. **Start emulator** or connect Android device
4. **Click "Run"** button (green play icon)

## 🔄 Development Workflow

1. **Edit code in Cursor**
2. **Run sync command**:
   ```bash
   npm run cap:sync
   ```
3. **In Android Studio**: Click "Run" again
4. **See your changes** in the emulator/device!

## 📝 Manual Setup (if script doesn't work)

```bash
cd frontend

# Install dependencies
npm install

# Build React app
npm run build

# Initialize Capacitor (first time only)
npx cap init
# Enter: Karts, com.marwalproduction.karts, build

# Add Android platform
npx cap add android

# Sync project
npx cap sync android

# Open Android Studio
npx cap open android
```

## ❓ Troubleshooting

### "Command not found: npm"
- Install Node.js from https://nodejs.org/
- Restart terminal after installation

### "Permission denied" on setup script
```bash
chmod +x setup-android.sh
```

### Android Studio not opening
- Install Android Studio from https://developer.android.com/studio
- Make sure it's in your Applications folder

