const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { generateImageSearchQueries } = require('./ai-content-generator');

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
 * Search for relevant background image using Lorem Picsum (free random images)
 * @param {string} query - Search query (not used by picsum, but kept for API consistency)
 * @returns {Promise<Buffer|null>} - Image buffer or null
 */
async function searchUnsplashImage(query) {
  try {
    // Note: Unsplash Source API is deprecated. Using Lorem Picsum as free alternative.
    // Lorem Picsum provides random high-quality images without authentication.
    // Query parameter is ignored, but we generate different images using cache busting.
    const randomSeed = Math.floor(Math.random() * 1000);
    const url = `https://picsum.photos/1080/1080?random=${randomSeed}`;

    console.log(`   Fetching random background image from Lorem Picsum...`);

    // Download the image
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxRedirects: 5
    });

    return response.data;

  } catch (err) {
    console.error(`   ⚠️ Image fetch failed: ${err.message}`);
    return null;
  }
}

/**
 * Search for image using Pexels API
 * @param {string} query - Search query
 * @returns {Promise<Buffer|null>} - Image buffer or null
 */
async function searchPexelsImage(query) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    console.log(`   Searching Pexels: "${query}"`);
    const response = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: apiKey },
      params: { query, per_page: 5, orientation: 'square' },
      timeout: 15000
    });

    const photos = response.data.photos || [];
    const valid = photos.find(p => p.width >= 1080 && p.height >= 1080);
    if (!valid) {
      console.log(`   No qualifying photos for: "${query}"`);
      return null;
    }

    const imgUrl = valid.src.large2x || valid.src.original;
    const imgResponse = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 20000 });
    console.log(`   ✅ Pexels image found: ${valid.url}`);
    return imgResponse.data;
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

// Category fallback queries for Level 2
const categoryFallbackQueries = {
  politics: 'philippines senate government building',
  economy: 'financial market trading economy',
  global: 'world map globe international news',
  breaking: 'news broadcast media journalism',
  default: 'manila city skyline philippines'
};

/**
 * Get background image for news automation
 * Accepts a newsItem object (new) or a string query (legacy).
 * Runs a 4-level waterfall: AI Pexels → Category Pexels → Lorem Picsum → null (gradient)
 * @param {Object|string} newsItemOrQuery - News item object or search query string
 * @returns {Promise<Buffer|null>} - Image buffer or null on failure
 */
async function getNewsBackgroundImage(newsItemOrQuery = 'philippines politics') {
  try {
    // Legacy string path — original behavior
    if (typeof newsItemOrQuery === 'string') {
      console.log(`🖼️ Fetching background image: ${newsItemOrQuery}`);
      const cacheKey = getCacheKey(newsItemOrQuery);
      const cachedPath = path.join(cacheDir, `${cacheKey}.jpg`);
      if (fs.existsSync(cachedPath)) {
        console.log('   Using cached image');
        return fs.readFileSync(cachedPath);
      }
      const imageData = await searchUnsplashImage(newsItemOrQuery);
      if (imageData) {
        fs.writeFileSync(cachedPath, imageData);
        console.log('   ✅ Cached new image');
      }
      return imageData || null;
    }

    // New object path — newsItem with topic-specific research
    const newsItem = newsItemOrQuery;
    console.log(`🖼️ Fetching topic-matched background for: "${newsItem.title}"`);

    // Level 0: NewsData.io article image_url (most relevant — actual news photo)
    if (newsItem.image_url) {
      try {
        console.log('   Trying NewsData.io article image...');
        const resp = await axios.get(newsItem.image_url, {
          responseType: 'arraybuffer',
          timeout: 15000,
          maxRedirects: 5
        });
        const imageData = Buffer.from(resp.data);
        if (imageData.length > 5000) { // sanity check — at least 5KB
          const cacheKey = getCacheKey(newsItem.image_url);
          const cachedPath = path.join(cacheDir, `${cacheKey}.jpg`);
          fs.writeFileSync(cachedPath, imageData);
          console.log('   ✅ Using NewsData.io article image');
          return imageData;
        }
      } catch (err) {
        console.warn('   NewsData.io image download failed:', err.message);
      }
    }

    // Level 1: AI-generated topic-specific queries → Pexels
    let aiQueries = [];
    try {
      const result = await generateImageSearchQueries(newsItem);
      aiQueries = result.queries || [];
    } catch (err) {
      console.warn('   AI query generation failed, skipping to category fallback');
    }

    for (const query of aiQueries) {
      const cachedPath = path.join(cacheDir, `${getCacheKey(query)}.jpg`);
      if (fs.existsSync(cachedPath)) {
        console.log(`   Using cached image for: "${query}"`);
        return fs.readFileSync(cachedPath);
      }
      const imageData = await searchPexelsImage(query);
      if (imageData) {
        fs.writeFileSync(cachedPath, imageData);
        return imageData;
      }
    }

    // Level 2: Category-based deterministic query → Pexels
    const categoryQuery = categoryFallbackQueries[newsItem.category] || categoryFallbackQueries.default;
    console.log(`   Trying category fallback: "${categoryQuery}"`);
    const cachedCategoryPath = path.join(cacheDir, `${getCacheKey(categoryQuery)}.jpg`);
    if (fs.existsSync(cachedCategoryPath)) {
      console.log('   Using cached category image');
      return fs.readFileSync(cachedCategoryPath);
    }
    const categoryImageData = await searchPexelsImage(categoryQuery);
    if (categoryImageData) {
      fs.writeFileSync(cachedCategoryPath, categoryImageData);
      return categoryImageData;
    }

    // Level 3: Lorem Picsum (random)
    console.log('   Falling back to Lorem Picsum...');
    const picsumData = await searchUnsplashImage(categoryQuery);
    if (picsumData) {
      fs.writeFileSync(cachedCategoryPath, picsumData);
      return picsumData;
    }

    // Level 4: null → gradient fallback in news-image-generator.js
    console.log('   ⚠️ All image sources failed, gradient will be used');
    return null;

  } catch (err) {
    console.error('❌ Error in getNewsBackgroundImage:', err.message);
    return null;
  }
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
  getNewsBackgroundImage,  // NEW: For news automation
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
