require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Import modules
const { selectDuterteContent, generateVideoCaption } = require('./duterte-content-generator');
const { renderWithRetry, cleanupOldVideos } = require('./remotion-video-renderer');
const { postVideoToFacebook } = require('./facebook-video-poster');
const { checkProfanity, validateCaptionLength } = require('./safety-validator');

// Configuration
const VIDEO_MIN_WAIT_TIME = parseInt(process.env.VIDEO_MIN_WAIT_TIME) || 30 * 60 * 1000;  // 30 minutes
const VIDEO_MAX_WAIT_TIME = parseInt(process.env.VIDEO_MAX_WAIT_TIME) || 120 * 60 * 1000; // 2 hours
const VIDEO_DAILY_POST_LIMIT = parseInt(process.env.VIDEO_DAILY_POST_LIMIT) || 8;

// Log file path
const videoPostsLogFile = path.join(__dirname, 'duterte-video-posts-log.json');

// Command-line flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE_POST = args.includes('--single');

/**
 * Get random wait interval between 30 min and 2 hours
 * @returns {number} - Wait time in milliseconds
 */
function getRandomInterval() {
  const minWait = VIDEO_MIN_WAIT_TIME;
  const maxWait = VIDEO_MAX_WAIT_TIME;
  return minWait + Math.floor(Math.random() * (maxWait - minWait));
}

/**
 * Format wait time for display
 * @param {number} ms - Milliseconds
 * @returns {string} - Formatted string
 */
function formatWaitTime(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Load video posts log
 * @returns {Array} - Log entries
 */
function loadVideoPostsLog() {
  if (!fs.existsSync(videoPostsLogFile)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(videoPostsLogFile, 'utf-8'));
  } catch (err) {
    console.error('⚠️ Error loading video posts log:', err.message);
    return [];
  }
}

/**
 * Save entry to video posts log
 * @param {Object} entry - Log entry
 */
function saveToVideoPostsLog(entry) {
  try {
    const log = loadVideoPostsLog();

    log.push({
      timestamp: new Date().toISOString(),
      ...entry
    });

    fs.writeFileSync(videoPostsLogFile, JSON.stringify(log, null, 2));
    console.log('💾 Saved to video posts log');

  } catch (err) {
    console.error('❌ Error saving to video posts log:', err.message);
  }
}

/**
 * Check daily video post limit
 * @returns {Object} - {withinLimit, count, maxCount}
 */
function checkVideoPostLimit() {
  try {
    const log = loadVideoPostsLog();

    // Count successful posts in last 24 hours
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    const recentSuccessfulPosts = log.filter(post => {
      const postTime = new Date(post.timestamp).getTime();
      return post.success && postTime > yesterday;
    });

    const count = recentSuccessfulPosts.length;
    const withinLimit = count < VIDEO_DAILY_POST_LIMIT;

    if (!withinLimit) {
      console.warn(`⚠️ Daily video limit reached: ${count}/${VIDEO_DAILY_POST_LIMIT}`);
    }

    return {
      withinLimit,
      count,
      maxCount: VIDEO_DAILY_POST_LIMIT
    };

  } catch (err) {
    console.error('⚠️ Error checking daily limit:', err.message);
    return { withinLimit: true, count: 0, maxCount: VIDEO_DAILY_POST_LIMIT };
  }
}

/**
 * Validate video post content
 * @param {Object} content - Content object
 * @param {string} caption - Generated caption
 * @returns {Object} - {valid, errors, warnings}
 */
function validateVideoPost(content, caption) {
  const errors = [];
  const warnings = [];

  // Check daily limit
  const dailyLimit = checkVideoPostLimit();
  if (!dailyLimit.withinLimit) {
    errors.push(`Daily video limit reached: ${dailyLimit.count}/${dailyLimit.maxCount}`);
  }

  // Check profanity in headline
  const headlineProfanity = checkProfanity(content.headline);
  if (headlineProfanity.hasProfanity) {
    errors.push(`Profanity in headline: ${headlineProfanity.words.join(', ')}`);
  }

  // Check profanity in caption
  const captionProfanity = checkProfanity(caption);
  if (captionProfanity.hasProfanity) {
    warnings.push(`Profanity in caption: ${captionProfanity.words.join(', ')}`);
  }

  // Validate caption length
  const captionValidation = validateCaptionLength(caption);
  if (!captionValidation.valid) {
    warnings.push(`Caption too long: ${captionValidation.length} chars`);
  }

  // Check minimum headline length
  if (content.headline.length < 10) {
    errors.push('Headline too short (minimum 10 characters)');
  }

  // Check content balance (max 40% controversial in last 10 posts)
  if (content.sentiment === 'controversial') {
    const recentPosts = loadVideoPostsLog().slice(-10).filter(p => p.success);
    const controversialCount = recentPosts.filter(p => p.sentiment === 'controversial').length;

    if (controversialCount >= 4) {
      warnings.push('Content balance: Too many controversial posts recently (limit: 4/10)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    captionValidation
  };
}

/**
 * Wait until midnight to reset daily limit
 */
async function waitUntilMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  console.log(`⏰ Daily limit reached. Waiting until midnight (${formatWaitTime(msUntilMidnight)})...`);

  await sleep(msUntilMidnight);

  console.log('🌅 New day! Resuming automation...');
}

/**
 * Run a single video posting cycle
 * @returns {boolean} - Success status
 */
async function runVideoPostingCycle() {
  console.log('\\n' + '='.repeat(80));
  console.log('🎬 STARTING VIDEO POSTING CYCLE');
  console.log('='.repeat(80) + '\\n');

  const renderStartTime = Date.now();

  let logEntry = {
    success: false,
    content_id: null,
    composition_type: null,
    headline: null,
    category: null,
    sentiment: null,
    caption: null,
    video_path: null,
    video_id: null,
    post_url: null,
    render_time_seconds: null,
    upload_time_seconds: null,
    error: null
  };

  try {
    // Step 1: Select Duterte content
    console.log('📋 Step 1: Selecting Duterte content...\\n');

    const content = await selectDuterteContent();

    if (!content) {
      const error = 'No content available';
      console.log(`⚠️ ${error}`);
      logEntry.error = error;
      saveToVideoPostsLog(logEntry);
      return false;
    }

    logEntry.content_id = content.id;
    logEntry.composition_type = content.composition_type;
    logEntry.headline = content.headline;
    logEntry.category = content.category;
    logEntry.sentiment = content.sentiment;

    console.log(`   Selected: ${content.headline} (${content.category})`);

    // Step 2: Generate Taglish caption
    console.log('\\n🤖 Step 2: Generating Taglish caption...\\n');

    const { caption, hashtags } = await generateVideoCaption(content);

    const fullCaption = `${caption}\\n\\n${hashtags}`;
    logEntry.caption = fullCaption;

    console.log(`   Caption: ${caption.substring(0, 80)}...`);

    // Step 3: Validate content
    console.log('\\n🔍 Step 3: Validating content...\\n');

    const validation = validateVideoPost(content, fullCaption);

    if (validation.errors.length > 0) {
      console.error('❌ Validation failed:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      logEntry.error = validation.errors.join('; ');
      saveToVideoPostsLog(logEntry);
      return false;
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Warnings:');
      validation.warnings.forEach(warn => console.warn(`   - ${warn}`));
    }

    console.log('✅ Content validation passed\\n');

    // Step 4: Render video with Remotion
    console.log('🎬 Step 4: Rendering video...\\n');

    const videoPath = await renderWithRetry(content, content.composition_type);

    const renderTime = (Date.now() - renderStartTime) / 1000;
    logEntry.video_path = videoPath;
    logEntry.render_time_seconds = renderTime;

    console.log(`\\n✅ Video rendered in ${renderTime.toFixed(1)}s\\n`);

    // Step 5: Post to Facebook (unless dry run)
    if (DRY_RUN) {
      console.log('🧪 DRY RUN MODE: Skipping Facebook posting\\n');
      console.log('✅ Dry run successful!');
      console.log(`   Content: ${content.headline}`);
      console.log(`   Category: ${content.category}`);
      console.log(`   Video: ${videoPath}`);

      logEntry.success = true;
      logEntry.error = 'DRY_RUN';
      saveToVideoPostsLog(logEntry);

      return true;
    }

    console.log('📤 Step 5: Posting to Facebook...\\n');

    const uploadStartTime = Date.now();
    const result = await postVideoToFacebook(videoPath, fullCaption);
    const uploadTime = (Date.now() - uploadStartTime) / 1000;

    logEntry.upload_time_seconds = uploadTime;

    if (!result.success) {
      const error = result.error || 'Unknown Facebook API error';
      console.error(`❌ Facebook posting failed: ${error}`);
      logEntry.error = error;
      saveToVideoPostsLog(logEntry);
      return false;
    }

    console.log(`\\n✅ Posted successfully!`);
    console.log(`   Post ID: ${result.video_id}`);
    console.log(`   URL: ${result.url}\\n`);

    logEntry.success = true;
    logEntry.video_id = result.video_id;
    logEntry.post_url = result.url;

    // Step 6: Post-posting tasks
    console.log('📋 Step 6: Post-posting tasks...\\n');

    // Save to log
    saveToVideoPostsLog(logEntry);

    // Cleanup old videos
    cleanupOldVideos(20);

    console.log('\\n' + '='.repeat(80));
    console.log('✅ VIDEO POSTING CYCLE COMPLETE');
    console.log('='.repeat(80) + '\\n');

    return true;

  } catch (err) {
    console.error('\\n❌ Cycle error:', err.message);
    console.error(err.stack);

    logEntry.error = err.message;
    saveToVideoPostsLog(logEntry);

    return false;
  }
}

/**
 * Display startup banner
 */
function displayBanner() {
  console.log('\\n' + '='.repeat(80));
  console.log('🎬 DUTERTE POLITICS VIDEO AUTOMATION SYSTEM');
  console.log('='.repeat(80));
  console.log(`
Mode: ${DRY_RUN ? 'DRY RUN (no Facebook posting)' : SINGLE_POST ? 'SINGLE POST' : 'CONTINUOUS'}
Daily Limit: ${VIDEO_DAILY_POST_LIMIT} videos
Post Interval: Random 30 min - 2 hours
Composition Types: Facts & Quotes
  `);
  console.log('='.repeat(80) + '\\n');
}

/**
 * Display system statistics
 */
function displayStats() {
  const log = loadVideoPostsLog();

  if (log.length === 0) {
    console.log('ℹ️ No posts yet\\n');
    return;
  }

  const totalVideos = log.length;
  const successfulVideos = log.filter(p => p.success && p.error !== 'DRY_RUN').length;
  const failedVideos = totalVideos - successfulVideos;

  // Videos in last 24 hours
  const yesterday = Date.now() - (24 * 60 * 60 * 1000);
  const last24Hours = log.filter(post => {
    const postTime = new Date(post.timestamp).getTime();
    return postTime > yesterday && post.success;
  }).length;

  // Average render time
  const successfulWithTime = log.filter(p => p.success && p.render_time_seconds);
  const avgRenderTime = successfulWithTime.length > 0
    ? successfulWithTime.reduce((sum, p) => sum + p.render_time_seconds, 0) / successfulWithTime.length
    : 0;

  console.log('📊 SYSTEM STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total Videos: ${totalVideos}`);
  console.log(`Successful: ${successfulVideos} (${((successfulVideos / totalVideos) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failedVideos}`);
  console.log(`Last 24 Hours: ${last24Hours}/${VIDEO_DAILY_POST_LIMIT}`);
  console.log(`Avg Render Time: ${avgRenderTime.toFixed(1)}s`);
  console.log('='.repeat(80) + '\\n');
}

/**
 * Main automation loop
 */
async function startVideoAutomation() {
  displayBanner();
  displayStats();

  // Single post mode
  if (SINGLE_POST) {
    console.log('🎯 Single post mode: Posting one video...\\n');

    const success = await runVideoPostingCycle();

    if (success) {
      console.log('\\n✅ Single post complete!');
      process.exit(0);
    } else {
      console.log('\\n❌ Single post failed');
      process.exit(1);
    }
  }

  // Continuous mode
  console.log('🔄 Starting continuous automation loop...\\n');

  let cycleCount = 0;

  while (true) {
    try {
      cycleCount++;
      console.log(`\\n🔄 Cycle #${cycleCount}\\n`);

      // Check daily limit
      const limitCheck = checkVideoPostLimit();
      if (!limitCheck.withinLimit) {
        await waitUntilMidnight();
        continue;
      }

      // Run posting cycle
      const success = await runVideoPostingCycle();

      // Calculate next post time
      const waitTime = getRandomInterval();
      const nextPost = new Date(Date.now() + waitTime);

      console.log(`\\n⏰ Next video scheduled for: ${nextPost.toLocaleString()}`);
      console.log(`   Waiting ${formatWaitTime(waitTime)}...\\n`);

      // Sleep
      await sleep(waitTime);

    } catch (error) {
      console.error('\\n❌ Automation error:', error.message);
      console.error(error.stack);

      // Wait 15 minutes on error, then retry
      console.log('⏰ Waiting 15 minutes before retry...\\n');
      await sleep(15 * 60 * 1000);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n\\n⚠️ Received SIGINT signal');
  console.log('📊 Final Statistics:');
  displayStats();
  console.log('👋 Shutting down gracefully...\\n');
  process.exit(0);
});

// Start automation
if (require.main === module) {
  startVideoAutomation().catch(err => {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = {
  runVideoPostingCycle,
  getRandomInterval,
  checkVideoPostLimit
};
