require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const outputDir = path.join(__dirname, 'generated_images');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Fetch a relevant image from Unsplash API
 * @param {string} query - Search query for image
 * @returns {string|null} - URL of the image or null if failed
 */
async function fetchUnsplashImage(query) {
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'your_unsplash_key_here_optional') {
    console.log('⚠️ Unsplash API key not configured, skipping Unsplash search');
    return null;
  }

  try {
    const url = 'https://api.unsplash.com/search/photos';
    const response = await axios.get(url, {
      params: {
        query: query,
        per_page: 10,
        orientation: 'landscape'
      },
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(5, response.data.results.length));
      const imageUrl = response.data.results[randomIndex].urls.regular;
      console.log('✅ Found Unsplash image:', imageUrl);
      return imageUrl;
    } else {
      console.log('⚠️ No Unsplash images found for query:', query);
      return null;
    }
  } catch (err) {
    console.error('❌ Unsplash fetch error:', err.message);
    return null;
  }
}

/**
 * Download image from URL and save to local path
 * @param {string} imageUrl - URL of the image to download
 * @param {string} outputPath - Local path to save the image
 * @returns {string} - Path to saved image
 */
async function downloadAndSaveImage(imageUrl, outputPath) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    fs.writeFileSync(outputPath, response.data);
    console.log('✅ Image downloaded:', outputPath);
    return outputPath;
  } catch (err) {
    console.error('❌ Image download error:', err.message);
    throw err;
  }
}

/**
 * Helper: Escape XML special characters
 */
function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a quote/text image using Sharp
 * @param {string} text - Text to display on image
 * @param {string} outputPath - Path to save the generated image
 * @returns {string} - Path to generated image
 */
async function createQuoteImage(text, outputPath) {
  try {
    // Create SVG with text
    const width = 1200;
    const height = 630;

    // Clean and escape text first
    const cleanText = escapeXml(text);

    // Wrap text to fit within image
    const maxCharsPerLine = 45;
    const words = cleanText.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);

    // Limit to 6 lines max
    const displayLines = lines.slice(0, 6);
    const fontSize = 42;
    const lineHeight = 55;
    const startY = (height - (displayLines.length * lineHeight)) / 2 + 20;

    // Create SVG text elements (already escaped in cleanText)
    const textElements = displayLines.map((line, i) => {
      const y = startY + (i * lineHeight);
      return `<text x="50%" y="${y}" text-anchor="middle" fill="white" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold">${line}</text>`;
    }).join('\n    ');

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad1)" />
  ${textElements}
  <text x="50%" y="${height - 30}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="24" font-family="Arial, sans-serif">Philippines Politics &amp; News</text>
</svg>`;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log('✅ Quote image created:', outputPath);
    return outputPath;
  } catch (err) {
    console.error('❌ Quote image creation error:', err.message);
    throw err;
  }
}

/**
 * Get Shopee product image URL from product object
 * @param {Object} product - Shopee product object
 * @returns {string|null} - Image URL or null
 */
function getShopeeProductImageUrl(product) {
  try {
    const imageHash = product.batch_item_for_item_card_full?.image;
    if (!imageHash) return null;

    // Shopee CDN URL format
    const imageUrl = `https://down-ph.img.susercontent.com/file/${imageHash}`;
    console.log('📦 Using Shopee product image:', imageUrl);
    return imageUrl;
  } catch (err) {
    console.error('❌ Error getting Shopee image:', err.message);
    return null;
  }
}

/**
 * Get image for post (tries multiple strategies)
 * @param {Object} postData - {headline, content}
 * @param {Object} product - Shopee product object
 * @returns {string} - Path to local image file
 */
async function getImageForPost(postData, product) {
  const timestamp = Date.now();
  const outputPath = path.join(outputDir, `post_${timestamp}.png`);

  try {
    // Strategy 1: Try Unsplash API
    const unsplashQuery = 'philippines politics government manila';
    const unsplashUrl = await fetchUnsplashImage(unsplashQuery);

    if (unsplashUrl) {
      try {
        await downloadAndSaveImage(unsplashUrl, outputPath);
        return outputPath;
      } catch (err) {
        console.log('⚠️ Unsplash download failed, trying next strategy');
      }
    }

    // Strategy 2: Try Shopee product image
    const shopeeImageUrl = getShopeeProductImageUrl(product);
    if (shopeeImageUrl) {
      try {
        await downloadAndSaveImage(shopeeImageUrl, outputPath);
        return outputPath;
      } catch (err) {
        console.log('⚠️ Shopee image download failed, trying next strategy');
      }
    }

    // Strategy 3: Create quote image with Sharp (always works)
    console.log('📝 Creating quote image as fallback');
    const quoteText = postData.headline || postData.content.substring(0, 200);
    await createQuoteImage(quoteText, outputPath);
    return outputPath;

  } catch (err) {
    console.error('❌ All image strategies failed:', err.message);

    // Final fallback: create simple quote image
    const fallbackText = postData.headline || 'Philippines Political News';
    await createQuoteImage(fallbackText, outputPath);
    return outputPath;
  }
}

/**
 * Clean up old generated images (keep last 20)
 */
function cleanupOldImages() {
  try {
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('post_') && f.endsWith('.png'))
      .map(f => ({
        name: f,
        path: path.join(outputDir, f),
        time: fs.statSync(path.join(outputDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only last 20 images
    if (files.length > 20) {
      files.slice(20).forEach(file => {
        fs.unlinkSync(file.path);
        console.log('🗑️ Deleted old image:', file.name);
      });
    }
  } catch (err) {
    console.error('❌ Cleanup error:', err.message);
  }
}

module.exports = {
  fetchUnsplashImage,
  downloadAndSaveImage,
  createQuoteImage,
  getShopeeProductImageUrl,
  getImageForPost,
  cleanupOldImages
};
