#!/bin/bash

# Android Studio Setup Script for Karts App
# Run this script after installing Node.js

set -e  # Exit on error

echo "🚀 Setting up Android Studio project for Karts..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    echo "Then run this script again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    echo "Please install Node.js (which includes npm) from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install

# Step 2: Build React app
echo ""
echo "🔨 Step 2: Building React app..."
npm run build

# Step 3: Initialize Capacitor (if not already initialized)
if [ ! -f "capacitor.config.json" ]; then
    echo ""
    echo "⚙️  Step 3: Initializing Capacitor..."
    echo "When prompted, enter:"
    echo "  - App name: Karts"
    echo "  - App ID: com.marwalproduction.karts"
    echo "  - Web dir: build"
    npx cap init
else
    echo ""
    echo "✅ Capacitor already configured"
fi

# Step 4: Add Android platform (if not already added)
if [ ! -d "android" ]; then
    echo ""
    echo "📱 Step 4: Adding Android platform..."
    npx cap add android
else
    echo ""
    echo "✅ Android platform already added"
fi

# Step 5: Sync project
echo ""
echo "🔄 Step 5: Syncing project..."
npx cap sync android

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Next steps:"
echo "1. Open Android Studio"
echo "2. Open the project: frontend/android"
echo "3. Start an Android emulator or connect a device"
echo "4. Click 'Run' in Android Studio"
echo ""
echo "💡 Development workflow:"
echo "  - Edit code in Cursor"
echo "  - Run: npm run cap:sync"
echo "  - Click 'Run' in Android Studio to see changes"
echo ""

