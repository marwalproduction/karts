# Install Node.js - Quick Guide

## 🚀 Automatic Installation (Recommended)

Run this script in Terminal:

```bash
cd /Users/lokeshmarwal/Downloads/karts-main
./install-nodejs.sh
```

This will:
1. Check if Node.js is already installed
2. Install Homebrew (if needed) - **will ask for your password**
3. Install Node.js using Homebrew

## 📥 Manual Installation (Alternative)

If the script doesn't work, install Node.js manually:

### Option 1: Direct Download (Easiest)
1. Go to: https://nodejs.org/
2. Download the **LTS version** (recommended)
3. Run the installer
4. Restart Terminal

### Option 2: Using Homebrew
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

## ✅ Verify Installation

After installation, verify it works:

```bash
node --version
npm --version
```

You should see version numbers like:
- `v20.x.x` (Node.js)
- `10.x.x` (npm)

## 🎯 After Installing Node.js

Once Node.js is installed, run:

```bash
cd /Users/lokeshmarwal/Downloads/karts-main/frontend
./setup-android.sh
```

This will set up the Android Studio project automatically!

## ❓ Troubleshooting

### "Permission denied"
- The script needs admin access to install Homebrew
- Enter your Mac password when prompted

### "Command not found" after installation
- Restart your Terminal
- Or run: `source ~/.zshrc` (or `source ~/.bash_profile`)

### Still having issues?
- Download Node.js directly from https://nodejs.org/
- Run the installer
- Restart Terminal

