#!/bin/bash
# Install yt-dlp for Render deployment

echo "📦 Installing yt-dlp..."

# Install yt-dlp using pip (Render has Python pre-installed)
pip install yt-dlp

# Verify installation
yt-dlp --version

echo "✅ yt-dlp installed successfully"
