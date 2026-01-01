#!/bin/bash

# Node.js Installation Script for macOS
# This script will install Node.js using Homebrew or direct download

set -e

echo "📦 Installing Node.js..."
echo ""

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    echo "✅ Node.js is already installed!"
    echo "   Version: $(node --version)"
    echo "   npm version: $(npm --version)"
    exit 0
fi

# Method 1: Try Homebrew (if available)
if command -v brew &> /dev/null || [ -f /opt/homebrew/bin/brew ] || [ -f /usr/local/bin/brew ]; then
    echo "🍺 Installing Node.js using Homebrew..."
    
    if [ -f /opt/homebrew/bin/brew ]; then
        /opt/homebrew/bin/brew install node
    elif [ -f /usr/local/bin/brew ]; then
        /usr/local/bin/brew install node
    else
        brew install node
    fi
    
    echo "✅ Node.js installed successfully!"
    echo "   Version: $(node --version)"
    echo "   npm version: $(npm --version)"
    exit 0
fi

# Method 2: Install Homebrew first, then Node.js
echo "🍺 Homebrew not found. Installing Homebrew first..."
echo "   (This will ask for your password)"
echo ""

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add Homebrew to PATH
if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

echo ""
echo "📦 Installing Node.js..."
brew install node

echo ""
echo "✅ Node.js installed successfully!"
echo "   Version: $(node --version)"
echo "   npm version: $(npm --version)"
echo ""
echo "🚀 You can now run: cd frontend && ./setup-android.sh"

