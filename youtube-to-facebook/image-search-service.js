const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Cache directory for background images
const cacheDir = path.join(__dirname, 'background_images_cache');
const remotionPublicDir = path.join(__dirname, 'remotion', 'public', 'backgrounds');

// Ensure cache directories exist
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}
if (!fs.existsSync(remotionPublicDir)) {
  fs.mkdirSync(remotionPublicDir, { recursive: true });
}

/**
 * Generate cache key from search query
 * @param {string} query - Search query
 * @returns {string} - MD5 hash
 */
function getCacheKey(query) {
  return crypto.createHash('md5').update(query.toLowerCase()).digest('hex');
}

/**
 * Get cached image path if exists
 * @param {string} query - Search query
 * @returns {string|null} - Path to cached image or null
 */
function getCachedImage(query) {
  const cacheKey = getCacheKey(query);
  const cachedPath = path.join(cacheDir, `${cacheKey}.jpg`);

  if (fs.existsSync(cachedPath)) {
    console.log(`   Using cached background image for: ${query}`);
    return cachedPath;
  }

  return null;
}

/**
 * Build search query based on Duterte content
 * @param {Object} content - Content object
 * @returns {string} - Search query
 */
function buildSearchQuery(content) {
  const { category, headline, tags } = content;

  // Map categories to search terms
  const categoryQueries = {
    policy: 'philippines government building manila infrastructure',
    achievements: 'philippines success development progress',
    controversy: 'philippines news media serious',
    quotes: 'philippines leadership president speech',
    sara_duterte: 'philippines woman leader government'
  };

  // Use category-based query
  let query = categoryQueries[category] || 'philippines government';

  // Add specific topic terms based on tags or headline
  if (tags && tags.length > 0) {
    const firstTag = tags[0];
    if (firstTag === 'infrastructure' || firstTag === 'bbb') {
      query = 'philippines roads bridges construction';
    } else if (firstTag === 'war_on_drugs') {
      query = 'philippines police law enforcement';
    } else if (firstTag === 'healthcare') {
      query = 'philippines hospital medical health';
    } else if (firstTag === 'education') {
      query = 'philippines students school university';
    } else if (firstTag === 'environment') {
      query = 'philippines nature beach ocean';
    }
  }

  return query;
}

/**
 * Search for relevant background image using Unsplash API
 * @param {string} query - Search query
 * @returns {Promise<string|null>} - Image URL or null
 */
async function searchUnsplashImage(query) {
  try {
    // Unsplash provides a free "Source API" that doesn't require authentication
    // for basic random image fetching
    const url = `https://source.unsplash.com/1080x1920/?${encodeURIComponent(query)}`;

    console.log(`   Searching for background: ${query}`);

    // The source.unsplash.com URL redirects to an actual image
    // We'll download it
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxRedirects: 5
    });

    return response.data;

  } catch (err) {
    console.error(`   ⚠️ Unsplash search failed: ${err.message}`);
    return null;
  }
}

/**
 * Search for image using Pexels API (fallback)
 * @param {string} query - Search query
 * @returns {Promise<string|null>} - Image URL or null
 */
async function searchPexelsImage(query) {
  try {
    // Pexels provides a free API but requires a key
    // For now, we'll use a generic Philippine image endpoint
    const url = `https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920`;

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000
    });

    return response.data;

  } catch (err) {
    console.error(`   ⚠️ Pexels search failed: ${err.message}`);
    return null;
  }
}

/**
 * Download and cache image
 * @param {Buffer} imageData - Image data buffer
 * @param {string} query - Original search query
 * @returns {string} - Path to cached image
 */
function cacheImage(imageData, query) {
  const cacheKey = getCacheKey(query);
  const cachedPath = path.join(cacheDir, `${cacheKey}.jpg`);

  fs.writeFileSync(cachedPath, imageData);
  console.log(`   Cached background image: ${cachedPath}`);

  return cachedPath;
}

/**
 * Get background image for Duterte content
 * Main function to get or fetch background image
 * @param {Object} content - Content object from duterte-content-generator
 * @returns {Promise<string>} - Filename for staticFile() or null
 */
async function getBackgroundImage(content) {
  try {
    console.log('🖼️ Finding background image...');

    // Build search query
    const query = buildSearchQuery(content);
    const cacheKey = getCacheKey(query);
    const filename = `${cacheKey}.jpg`;

    // Check cache first
    const cachedPath = getCachedImage(query);
    if (cachedPath) {
      // Copy to Remotion public folder
      const publicPath = path.join(remotionPublicDir, filename);
      fs.copyFileSync(cachedPath, publicPath);
      return filename;
    }

    // Try Unsplash
    console.log('   Downloading new background image...');
    let imageData = await searchUnsplashImage(query);

    // Fallback to Pexels if Unsplash fails
    if (!imageData) {
      console.log('   Trying fallback image source...');
      imageData = await searchPexelsImage(query);
    }

    // If still no image, use a default Philippine flag gradient
    if (!imageData) {
      console.log('   Using default gradient (no image found)');
      return null; // Will trigger gradient fallback in composition
    }

    // Cache image
    const imagePath = cacheImage(imageData, query);

    // Copy to Remotion public folder
    const publicPath = path.join(remotionPublicDir, filename);
    fs.copyFileSync(imagePath, publicPath);

    return filename;

  } catch (err) {
    console.error('❌ Error getting background image:', err.message);
    return null; // Fallback to gradient
  }
}

/**
 * Cleanup old cached images (keep last N)
 * @param {number} keepCount - Number of images to keep (default: 50)
 */
function cleanupImageCache(keepCount = 50) {
  try {
    const files = fs.readdirSync(cacheDir)
      .filter(f => f.endsWith('.jpg'))
      .map(f => ({
        name: f,
        path: path.join(cacheDir, f),
        time: fs.statSync(path.join(cacheDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort newest first

    if (files.length > keepCount) {
      const filesToDelete = files.slice(keepCount);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
      });
      console.log(`🗑️ Cleaned up ${filesToDelete.length} old background images`);
    }

  } catch (err) {
    console.error('❌ Image cache cleanup error:', err.message);
  }
}

module.exports = {
  getBackgroundImage,
  cleanupImageCache,
  buildSearchQuery
};

// Test if running directly
if (require.main === module) {
  console.log('🧪 Testing Image Search Service...\\n');

  const testContent = {
    category: 'policy',
    headline: 'Build Build Build Program',
    tags: ['infrastructure', 'bbb']
  };

  getBackgroundImage(testContent)
    .then(imagePath => {
      if (imagePath) {
        console.log('\\n✅ Test complete!');
        console.log(`Background image: ${imagePath}`);
      } else {
        console.log('\\n⚠️ No image found, will use gradient fallback');
      }
    })
    .catch(err => {
      console.error('\\n❌ Test failed:', err.message);
    });
}
