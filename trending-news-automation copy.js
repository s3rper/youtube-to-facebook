require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Import modules
const { fetchTrendingNews, addToPostedCache } = require('./news-fetcher');
const { createNewsQuoteImage, cleanupOldNewsImages } = require('./news-image-generator');
const { getNewsBackgroundImage } = require('./image-search-service');
const { generateNewsCaption } = require('./ai-content-generator');
const { postImageToFacebook } = require('./facebook-poster');
const {
  isDuplicateContent,
  checkProfanity,
  validateCaptionLength,
  checkDailyPostLimit
} = require('./safety-validator');

// Configuration
const NEWS_MIN_WAIT_TIME = parseInt(process.env.NEWS_MIN_WAIT_TIME) || 15 * 60 * 1000; // 15 minutes
const NEWS_MAX_WAIT_TIME = parseInt(process.env.NEWS_MAX_WAIT_TIME) || 60 * 60 * 1000; // 1 hour
const NEWS_DAILY_POST_LIMIT = parseInt(process.env.NEWS_DAILY_POST_LIMIT) || 24; // Increased to 24 for hourly posting
const TOPIC_MIX = { ph: 0.70, global: 0.30 };

// Log file path
const newsPostsLogFile = path.join(__dirname, 'news-posts-log.json');

// Command-line flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE_POST = args.includes('--single');

/**
 * Get random wait interval - random between 15 minutes to 1 hour
 * @returns {number} - Wait time in milliseconds
 */
function getRandomInterval() {
  // Random interval between 15 minutes and 1 hour
  const minWait = NEWS_MIN_WAIT_TIME; // 15 minutes
  const maxWait = NEWS_MAX_WAIT_TIME; // 1 hour
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
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Load news posts log
 * @returns {Array} - Log entries
 */
function loadNewsPostsLog() {
  if (!fs.existsSync(newsPostsLogFile)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(newsPostsLogFile, 'utf-8'));
  } catch (err) {
    console.error('⚠️ Error loading news posts log:', err.message);
    return [];
  }
}

/**
 * Save entry to news posts log
 * @param {Object} entry - Log entry
 */
function saveToNewsPostsLog(entry) {
  try {
    const log = loadNewsPostsLog();

    log.push({
      timestamp: new Date().toISOString(),
      ...entry
    });

    fs.writeFileSync(newsPostsLogFile, JSON.stringify(log, null, 2));
    console.log('💾 Saved to news posts log');

  } catch (err) {
    console.error('❌ Error saving to news posts log:', err.message);
  }
}

/**
 * Check daily post limit for news automation
 * @returns {Object} - {withinLimit, count, maxCount}
 */
function checkNewsPostLimit() {
  try {
    const log = loadNewsPostsLog();

    // Count successful posts in last 24 hours
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    const recentSuccessfulPosts = log.filter(post => {
      const postTime = new Date(post.timestamp).getTime();
      return post.success && postTime > yesterday;
    });

    const count = recentSuccessfulPosts.length;
    const withinLimit = count < NEWS_DAILY_POST_LIMIT;

    if (!withinLimit) {
      console.warn(`⚠️ Daily post limit reached: ${count}/${NEWS_DAILY_POST_LIMIT}`);
    }

    return {
      withinLimit,
      count,
      maxCount: NEWS_DAILY_POST_LIMIT
    };

  } catch (err) {
    console.error('⚠️ Error checking daily limit:', err.message);
    return { withinLimit: true, count: 0, maxCount: NEWS_DAILY_POST_LIMIT };
  }
}

/**
 * Validate news post content
 * @param {Object} newsItem - News item
 * @param {string} caption - Generated caption
 * @returns {Object} - {valid, errors, warnings}
 */
function validateNewsPost(newsItem, caption) {
  const errors = [];
  const warnings = [];

  // Check daily limit
  const dailyLimit = checkNewsPostLimit();
  if (!dailyLimit.withinLimit) {
    errors.push(`Daily post limit reached: ${dailyLimit.count}/${dailyLimit.maxCount}`);
  }

  // Check for duplicates (using headline)
  if (isDuplicateContent(newsItem.title)) {
    errors.push('Duplicate content detected (news headline already posted)');
  }

  // Check profanity in headline
  const headlineProfanity = checkProfanity(newsItem.title);
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
  if (newsItem.title.length < 10) {
    errors.push('Headline too short (minimum 10 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    captionValidation
  };
}

/**
 * Run a single news posting cycle
 * @returns {boolean} - Success status
 */
async function runNewsPostingCycle() {
  console.log('\n' + '='.repeat(80));
  console.log('📰 STARTING NEWS POSTING CYCLE');
  console.log('='.repeat(80) + '\n');

  let logEntry = {
    success: false,
    news_title: null,
    news_category: null,
    news_source: null,
    news_url: null,
    caption: null,
    post_url: null,
    error: null
  };

  try {
    // Step 1: Fetch trending news
    console.log('📡 Step 1: Fetching trending news...\n');

    const newsItem = await fetchTrendingNews(TOPIC_MIX);

    if (!newsItem) {
      const error = 'No trending news available';
      console.log(`⚠️ ${error}`);
      logEntry.error = error;
      saveToNewsPostsLog(logEntry);
      return false;
    }

    logEntry.news_title = newsItem.title;
    logEntry.news_category = newsItem.category;
    logEntry.news_source = newsItem.news_source || newsItem.source;
    logEntry.news_url = newsItem.url;

    // Step 2: Generate Taglish caption
    console.log('🤖 Step 2: Generating Taglish caption with Claude AI...\n');

    const { caption, hashtags } = await generateNewsCaption(newsItem);

    const fullCaption = `${caption}\n\n${hashtags}`;
    logEntry.caption = fullCaption;

    console.log(`\n📝 Generated Caption:\n${fullCaption}\n`);

    // Step 3: Validate content
    console.log('🔍 Step 3: Validating content...\n');

    const validation = validateNewsPost(newsItem, fullCaption);

    if (validation.errors.length > 0) {
      console.error('❌ Validation failed:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      logEntry.error = validation.errors.join('; ');
      saveToNewsPostsLog(logEntry);
      return false;
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Warnings:');
      validation.warnings.forEach(warn => console.warn(`   - ${warn}`));
    }

    console.log('✅ Content validation passed\n');

    // Step 4: Create news quote image
    console.log('🎨 Step 4: Creating news quote image...\n');

    // Try to get background image from Unsplash (with timestamp for variety)
    const searchQuery = `philippines politics ${Date.now()}`;
    const backgroundImage = await getNewsBackgroundImage(searchQuery);

    if (backgroundImage) {
      console.log('✅ Background image fetched successfully');
    } else {
      console.log('⚠️ Background fetch failed, will use gradient fallback');
    }

    const imagePath = await createNewsQuoteImage(
      newsItem.title,
      newsItem.category,
      null,           // outputPath (auto-generate)
      backgroundImage // Buffer or null
    );

    console.log(`✅ Image created: ${imagePath}\n`);

    // Step 5: Post to Facebook (unless dry run)
    if (DRY_RUN) {
      console.log('🧪 DRY RUN MODE: Skipping Facebook posting\n');
      console.log('✅ Dry run successful!');
      console.log(`   News: ${newsItem.title}`);
      console.log(`   Category: ${newsItem.category}`);
      console.log(`   Image: ${imagePath}`);

      logEntry.success = true;
      logEntry.error = 'DRY_RUN';
      saveToNewsPostsLog(logEntry);

      return true;
    }

    console.log('📤 Step 5: Posting to Facebook...\n');

    const result = await postImageToFacebook(imagePath, fullCaption);

    if (!result.success) {
      const error = result.error || 'Unknown Facebook API error';
      console.error(`❌ Facebook posting failed: ${error}`);
      logEntry.error = error;
      saveToNewsPostsLog(logEntry);
      return false;
    }

    console.log(`✅ Posted successfully!`);
    console.log(`   Post ID: ${result.post_id}`);
    console.log(`   URL: ${result.url}\n`);

    logEntry.success = true;
    logEntry.post_id = result.post_id;
    logEntry.post_url = result.url;

    // Step 6: Post-posting tasks
    console.log('📋 Step 6: Post-posting tasks...\n');

    // Add to posted cache for duplicate detection
    addToPostedCache(newsItem);

    // Save to log
    saveToNewsPostsLog(logEntry);

    // Cleanup old images
    cleanupOldNewsImages(20);

    console.log('\n' + '='.repeat(80));
    console.log('✅ NEWS POSTING CYCLE COMPLETE');
    console.log('='.repeat(80) + '\n');

    return true;

  } catch (err) {
    console.error('\n❌ Cycle error:', err.message);
    console.error(err.stack);

    logEntry.error = err.message;
    saveToNewsPostsLog(logEntry);

    return false;
  }
}

/**
 * Display startup banner
 */
function displayBanner() {
  console.log('\n' + '='.repeat(80));
  console.log('📰 TRENDING NEWS AUTOMATION SYSTEM');
  console.log('='.repeat(80));
  console.log(`
Mode: ${DRY_RUN ? 'DRY RUN (no Facebook posting)' : SINGLE_POST ? 'SINGLE POST' : 'CONTINUOUS'}
Topic Mix: ${(TOPIC_MIX.ph * 100)}% Philippines / ${(TOPIC_MIX.global * 100)}% Global
Daily Limit: ${NEWS_DAILY_POST_LIMIT} posts
Post Interval: Random 15 min - 1 hour (unique backgrounds every post!)
  `);
  console.log('='.repeat(80) + '\n');
}

/**
 * Display system statistics
 */
function displayStats() {
  const log = loadNewsPostsLog();

  if (log.length === 0) {
    console.log('ℹ️ No posts yet\n');
    return;
  }

  const totalPosts = log.length;
  const successfulPosts = log.filter(p => p.success && p.error !== 'DRY_RUN').length;
  const failedPosts = totalPosts - successfulPosts;

  // Posts in last 24 hours
  const yesterday = Date.now() - (24 * 60 * 60 * 1000);
  const last24Hours = log.filter(post => {
    const postTime = new Date(post.timestamp).getTime();
    return postTime > yesterday && post.success;
  }).length;

  console.log('📊 SYSTEM STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total Posts: ${totalPosts}`);
  console.log(`Successful: ${successfulPosts} (${((successfulPosts / totalPosts) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failedPosts}`);
  console.log(`Last 24 Hours: ${last24Hours}/${NEWS_DAILY_POST_LIMIT}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Main automation loop
 */
async function startNewsAutomation() {
  displayBanner();
  displayStats();

  // Single post mode
  if (SINGLE_POST) {
    console.log('🎯 Single post mode: Posting one news item...\n');

    const success = await runNewsPostingCycle();

    if (success) {
      console.log('\n✅ Single post complete!');
      process.exit(0);
    } else {
      console.log('\n❌ Single post failed');
      process.exit(1);
    }
  }

  // Continuous mode
  console.log('🔄 Starting continuous automation loop...\n');

  let cycleCount = 0;

  while (true) {
    try {
      cycleCount++;
      console.log(`\n🔄 Cycle #${cycleCount}\n`);

      // Check daily limit
      const limitCheck = checkNewsPostLimit();
      if (!limitCheck.withinLimit) {
        await waitUntilMidnight();
        continue;
      }

      // Run posting cycle
      const success = await runNewsPostingCycle();

      // Calculate next post time
      const waitTime = getRandomInterval();
      const nextPost = new Date(Date.now() + waitTime);

      console.log(`\n⏰ Next post scheduled for: ${nextPost.toLocaleString()}`);
      console.log(`   Waiting ${formatWaitTime(waitTime)}...\n`);

      // Sleep
      await sleep(waitTime);

    } catch (error) {
      console.error('\n❌ Automation error:', error.message);
      console.error(error.stack);

      // Wait 10 minutes on error, then retry
      console.log('⏰ Waiting 10 minutes before retry...\n');
      await sleep(10 * 60 * 1000);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Received SIGINT signal');
  console.log('📊 Final Statistics:');
  displayStats();
  console.log('👋 Shutting down gracefully...\n');
  process.exit(0);
});

// Start automation
if (require.main === module) {
  startNewsAutomation().catch(err => {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = {
  runNewsPostingCycle,
  getRandomInterval,
  checkNewsPostLimit
};
