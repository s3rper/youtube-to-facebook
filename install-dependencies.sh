#!/bin/bash
# Install dependencies for YouTube downloads on Render

echo "📦 Installing yt-dlp..."
pip install --upgrade yt-dlp

echo "📦 Installing deno (JavaScript runtime for YouTube challenges)..."
# Install deno for solving YouTube signature challenges
curl -fsSL https://deno.land/install.sh | sh
export DENO_INSTALL="/opt/render/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"

# Verify installations
echo "✅ yt-dlp version:"
yt-dlp --version

echo "✅ deno version:"
deno --version

echo "✅ All dependencies installed successfully"
