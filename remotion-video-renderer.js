const path = require('path');
const fs = require('fs');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const { getBackgroundImage, cleanupImageCache } = require('./image-search-service');

// Paths
const remotionRoot = path.join(__dirname, 'remotion/index.jsx');
const outputDir = path.join(__dirname, 'generated_videos');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Get composition ID based on type
 * @param {string} compositionType - 'fact' or 'quote'
 * @returns {string} - Composition ID
 */
function getCompositionId(compositionType) {
  switch (compositionType) {
    case 'quote':
      return 'DuterteQuote';
    case 'fact':
    default:
      return 'DuterteFact';
  }
}

/**
 * Get duration in frames based on composition type
 * @param {string} compositionType - 'fact' or 'quote'
 * @returns {number} - Duration in frames at 30fps
 */
function getDurationInFrames(compositionType) {
  switch (compositionType) {
    case 'quote':
      return 600; // 20 seconds
    case 'fact':
    default:
      return 750; // 25 seconds
  }
}

/**
 * Validate rendered video file
 * @param {string} videoPath - Path to video file
 * @throws {Error} - If validation fails
 */
function validateVideo(videoPath) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const stats = fs.statSync(videoPath);
  const fileSizeMB = stats.size / 1024 / 1024;

  // Check file size
  if (stats.size < 1000) {
    throw new Error('Video file is too small or corrupt');
  }

  if (stats.size > 1024 * 1024 * 1024) {
    throw new Error('Video exceeds 1GB size limit');
  }

  console.log(`   File size: ${fileSizeMB.toFixed(2)} MB`);
}

/**
 * Render Duterte video using Remotion
 * @param {Object} content - Content object from duterte-content-generator
 * @param {string} compositionType - 'fact' or 'quote'
 * @returns {Promise<string>} - Path to rendered video file
 */
async function renderDuterteVideo(content, compositionType) {
  try {
    console.log(`🎬 Rendering ${compositionType} video...`);

    // Step 0: Get background image
    const backgroundImageFilename = await getBackgroundImage(content);

    // Step 1: Bundle Remotion compositions
    console.log('   Bundling Remotion compositions...');
    const bundleLocation = await bundle({
      entryPoint: remotionRoot,
      webpackOverride: (config) => config,
    });

    // Step 2: Determine composition ID
    const compositionId = getCompositionId(compositionType);

    // Step 3: Prepare input props
    const inputProps = {
      headline: content.headline,
      source: content.source || '',
      category: content.category,
      sentiment: content.sentiment,
      backgroundImage: backgroundImageFilename // Just the filename for staticFile()
    };

    // Handle both old format (content) and new format (story)
    if (content.story) {
      inputProps.story = content.story;
    } else {
      // Legacy format - use content and context
      inputProps.content = content.content;
      inputProps.context = content.context || '';
    }

    // Step 4: Output path
    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `duterte_${compositionType}_${timestamp}.mp4`);

    // Step 5: Get composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });

    // Step 6: Render video
    console.log('   Rendering video...');
    const renderStart = Date.now();

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      // Video settings optimized for Facebook Reels
      imageFormat: 'jpeg',
      // Performance settings
      concurrency: 4,
      onProgress: ({ progress }) => {
        if (progress % 0.1 < 0.01) { // Log every 10%
          process.stdout.write(`\r   Progress: ${Math.round(progress * 100)}%`);
        }
      },
    });

    const renderTime = (Date.now() - renderStart) / 1000;
    console.log(`\n   ✅ Render complete: ${renderTime.toFixed(1)}s`);

    // Step 7: Validate video file
    validateVideo(outputPath);

    console.log(`✅ Video rendered: ${path.basename(outputPath)}`);
    return outputPath;

  } catch (err) {
    console.error(`❌ Render failed: ${err.message}`);
    throw err;
  }
}

/**
 * Render with retry logic
 * @param {Object} content - Content object
 * @param {string} compositionType - 'fact' or 'quote'
 * @param {number} maxRetries - Maximum retry attempts (default: 2)
 * @returns {Promise<string>} - Path to rendered video
 */
async function renderWithRetry(content, compositionType, maxRetries = 2) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎬 Render attempt ${attempt}/${maxRetries}...`);
      return await renderDuterteVideo(content, compositionType);
    } catch (err) {
      lastError = err;
      console.error(`❌ Attempt ${attempt} failed:`, err.message);

      if (attempt < maxRetries) {
        console.log('⏳ Waiting 10 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  throw lastError;
}

/**
 * Cleanup old videos (keep last N)
 * @param {number} keepCount - Number of recent videos to keep (default: 20)
 */
function cleanupOldVideos(keepCount = 20) {
  try {
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('duterte_') && f.endsWith('.mp4'))
      .map(f => ({
        name: f,
        path: path.join(outputDir, f),
        time: fs.statSync(path.join(outputDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort newest first

    if (files.length > keepCount) {
      const filesToDelete = files.slice(keepCount);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Deleted old video: ${file.name}`);
      });

      console.log(`✅ Cleanup complete: Kept ${keepCount} recent videos, deleted ${filesToDelete.length}`);
    } else {
      console.log(`ℹ️ No cleanup needed: ${files.length} videos (limit: ${keepCount})`);
    }

    // Also cleanup old background images
    cleanupImageCache(50);

  } catch (err) {
    console.error('❌ Cleanup error:', err.message);
  }
}

module.exports = {
  renderDuterteVideo,
  renderWithRetry,
  cleanupOldVideos,
  getCompositionId,
  getDurationInFrames
};

// Test if running directly
if (require.main === module) {
  console.log('🧪 Testing Remotion Video Renderer...\\n');

  const testContent = {
    id: 1,
    category: 'policy',
    headline: 'Build Build Build Program',
    story: {
      context: 'Noong 2016, ang Pilipinas ay nangangailangan ng malaking infrastructure improvement. Ang mga kalsada ay sira, walang sapat na tulay, at mahina ang transportation system.',
      main: 'Ang Build Build Build program ni Duterte ay nagtayo ng 29,000 kilometers ng kalsada, 5,950 flood control projects, 150+ evacuation centers, at 12,000+ classrooms sa buong Pilipinas. Nag-invest ang gobyerno ng mahigit 9 trillion pesos para sa mga proyektong ito.',
      impact: 'Dahil dito, mas mabilis na ang travel time between provinces. Ang mga farmers ay mas madaling makapag-deliver ng produkto. Ang baha ay nabawasan sa maraming lugar. At mas maraming estudyante ang may maayos na classroom.',
      takeaway: 'Ito ang pinakamalaking infrastructure program sa kasaysayan ng Pilipinas.'
    },
    source: 'DPWH',
    sentiment: 'positive',
    composition_type: 'fact'
  };

  renderWithRetry(testContent, testContent.composition_type)
    .then(videoPath => {
      console.log('\\n✅ Test complete!');
      console.log(`Video created: ${videoPath}`);
    })
    .catch(err => {
      console.error('\\n❌ Test failed:', err.message);
      process.exit(1);
    });
}
