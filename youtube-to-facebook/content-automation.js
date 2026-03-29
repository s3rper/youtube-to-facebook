require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Import all modules
const {
  generatePoliticalPost,
  scoreViralPotential,
  matchProduct,
  generateCaption,
  generatePersuasiveComment,
  optimizeForVirality
} = require('./ai-content-generator');

const {
  getImageForPost,
  cleanupOldImages
} = require('./image-handler');

const {
  postImageToFacebook,
  commentOnPost
} = require('./facebook-poster');

const {
  validatePostContent,
  checkDailyPostLimit,
  estimateAPICost,
  getSystemStats
} = require('./safety-validator');

// Configuration
const shopeeListFile = path.join(__dirname, 'duterte-shopee-list.json');
const postsLogFile = path.join(__dirname, 'posts-log.json');
const VIRALITY_THRESHOLD = 60;
const MIN_WAIT_TIME = 2 * 60 * 60 * 1000; // 2 hours
const MAX_WAIT_TIME = 4 * 60 * 60 * 1000; // 4 hours

// Content topics pool
const contentTopics = [
  'Latest Philippine Senate updates',
  'Duterte legacy and impact analysis',
  'Current political climate in Manila',
  'Filipino leadership lessons from past presidents',
  'Philippine economic policy commentary',
  'Voting rights and democracy in the Philippines',
  'Anti-corruption initiatives in government',
  'Infrastructure development and Build Build Build program',
  'Philippine foreign relations and diplomacy',
  'Local government achievements and challenges',
  'Federalism debate in the Philippines',
  'Drug war policy analysis and effects',
  'Philippine healthcare system improvements',
  'Education reform in the Philippines',
  'Disaster preparedness and government response',
  'Philippine sovereignty and territorial issues',
  'Constitutional reform discussions',
  'Political dynasty concerns in Filipino politics',
  'Youth involvement in Philippine politics',
  'Social media impact on Philippine elections'
];

// Load Shopee products
let shopeeProducts = [];
try {
  shopeeProducts = JSON.parse(fs.readFileSync(shopeeListFile, 'utf-8'));
  console.log(`✅ Loaded ${shopeeProducts.length} Shopee products`);
} catch (err) {
  console.error('❌ Failed to load Shopee products:', err.message);
  process.exit(1);
}

// Load or initialize posts log
function loadPostsLog() {
  try {
    if (fs.existsSync(postsLogFile)) {
      return JSON.parse(fs.readFileSync(postsLogFile, 'utf-8'));
    }
  } catch (err) {
    console.error('⚠️ Error loading posts log, starting fresh:', err.message);
  }
  return [];
}

// Save post to log
function savePostLog(postData) {
  try {
    const log = loadPostsLog();
    log.push(postData);
    fs.writeFileSync(postsLogFile, JSON.stringify(log, null, 2));
    console.log('📝 Post logged successfully');
  } catch (err) {
    console.error('❌ Error saving post log:', err.message);
  }
}

// Get random topic
function getRandomTopic() {
  const randomIndex = Math.floor(Math.random() * contentTopics.length);
  return contentTopics[randomIndex];
}

// Calculate random wait time
function getRandomWaitTime() {
  return MIN_WAIT_TIME + Math.floor(Math.random() * (MAX_WAIT_TIME - MIN_WAIT_TIME));
}

// Format wait time for display
function formatWaitTime(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

/**
 * Single content generation and posting cycle
 */
async function runContentCycle() {
  const cycleStartTime = Date.now();
  console.log('\n' + '='.repeat(80));
  console.log('🚀 STARTING NEW CONTENT CYCLE');
  console.log('='.repeat(80));
  console.log(`📅 Timestamp: ${new Date().toLocaleString()}\n`);

  let postLogData = {
    timestamp: new Date().toISOString(),
    success: false,
    topic: null,
    virality_score: 0,
    post_id: null,
    error: null
  };

  try {
    // Step 1: Select random topic
    const topic = getRandomTopic();
    postLogData.topic = topic;
    console.log('📋 Topic:', topic, '\n');

    // Step 2: Generate AI content
    console.log('🤖 Step 1: Generating AI content...');
    let postData = await generatePoliticalPost(topic);
    console.log('   Headline:', postData.headline);
    console.log('   Emotion:', postData.emotion);
    console.log('');

    // Step 3: Score viral potential
    console.log('📊 Step 2: Scoring viral potential...');
    let scoreData = await scoreViralPotential(postData);
    postLogData.virality_score = scoreData.score;
    console.log(`   Score: ${scoreData.score}/100`);
    console.log(`   Reason: ${scoreData.reason}`);
    console.log('');

    // Step 4: Optimize if score is low
    if (scoreData.score < VIRALITY_THRESHOLD) {
      console.log('⚠️ Step 3: Score below threshold, optimizing content...');
      const optimized = await optimizeForVirality(postData);
      postData = optimized;

      // Re-score optimized content
      scoreData = await scoreViralPotential(postData);
      postLogData.virality_score = scoreData.score;
      console.log(`   New score: ${scoreData.score}/100`);
      console.log('');

      // If still below threshold, skip this cycle
      if (scoreData.score < VIRALITY_THRESHOLD) {
        console.log(`❌ Still below threshold (${VIRALITY_THRESHOLD}). Skipping this post.`);
        postLogData.error = 'Score below threshold after optimization';
        savePostLog(postLogData);
        return false;
      }
    }

    console.log('✅ Content passed virality check!\n');

    // Step 5: Match product
    console.log('🎯 Step 4: Matching Shopee product...');
    const productMatch = await matchProduct(postData, shopeeProducts);
    const selectedProduct = productMatch.product;
    const productName = selectedProduct.batch_item_for_item_card_full?.name || 'Duterte merchandise';
    console.log(`   Selected: ${productName}`);
    console.log(`   Reason: ${productMatch.reason}`);
    console.log('');
    postLogData.product_name = productName;
    postLogData.product_link = selectedProduct.productOfferLink;

    // Step 6: Generate Facebook caption
    console.log('✍️ Step 5: Generating Facebook caption...');
    const captionData = await generateCaption(postData, selectedProduct);
    let fullCaption = `${captionData.caption}\n\n${captionData.hashtags}`;
    console.log('   Caption preview:', captionData.caption.substring(0, 100) + '...');
    console.log('   Hashtags:', captionData.hashtags);
    console.log('');

    // Step 6.5: Validate content before posting
    console.log('🛡️ Step 5.5: Validating content safety...');
    const validation = validatePostContent(postData, fullCaption);

    if (!validation.valid) {
      console.log('   ❌ Validation failed:');
      validation.errors.forEach(err => console.log(`      - ${err}`));
      postLogData.error = `Validation failed: ${validation.errors.join(', ')}`;
      savePostLog(postLogData);
      return false;
    }

    if (validation.warnings.length > 0) {
      console.log('   ⚠️ Warnings:');
      validation.warnings.forEach(warn => console.log(`      - ${warn}`));
    }

    // Auto-trim caption if too long
    if (validation.captionValidation && !validation.captionValidation.valid) {
      fullCaption = validation.captionValidation.trimmed;
      console.log('   ✂️ Caption auto-trimmed to fit limit');
    }

    console.log('   ✅ Content validation passed');
    console.log('');
    postLogData.caption = fullCaption;

    // Step 7: Get image
    console.log('🖼️ Step 6: Getting image for post...');
    const imagePath = await getImageForPost(postData, selectedProduct);
    console.log(`   Image ready: ${imagePath}`);
    console.log('');

    // Step 8: Post to Facebook
    console.log('📤 Step 7: Posting to Facebook...');
    const postResult = await postImageToFacebook(imagePath, fullCaption);

    if (!postResult.success) {
      throw new Error(`Facebook posting failed: ${postResult.error}`);
    }

    const postId = postResult.post_id;
    postLogData.post_id = postId;
    postLogData.post_url = postResult.url;
    console.log(`   ✅ Posted! ID: ${postId}`);
    console.log(`   URL: ${postResult.url}`);
    console.log('');

    // Step 9: Wait before commenting
    console.log('⏳ Waiting 5 seconds before commenting...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 10: Generate and post comment
    console.log('💬 Step 8: Adding affiliate comment...');
    const commentText = await generatePersuasiveComment(selectedProduct);
    const commentResult = await commentOnPost(postId, commentText);

    if (commentResult.success) {
      console.log(`   ✅ Comment posted! ID: ${commentResult.comment_id}`);
      postLogData.comment_id = commentResult.comment_id;
      postLogData.comment_text = commentText;
    } else {
      console.log(`   ⚠️ Comment failed (non-critical): ${commentResult.error}`);
      postLogData.comment_error = commentResult.error;
    }
    console.log('');

    // Step 11: Cleanup old images
    cleanupOldImages();

    // Mark as successful
    postLogData.success = true;
    postLogData.content_headline = postData.headline;
    postLogData.content_preview = postData.content.substring(0, 150);

    // Save to log
    savePostLog(postLogData);

    const cycleDuration = ((Date.now() - cycleStartTime) / 1000).toFixed(2);
    console.log('='.repeat(80));
    console.log(`✅ CYCLE COMPLETED SUCCESSFULLY in ${cycleDuration}s`);
    console.log('='.repeat(80));

    return true;

  } catch (err) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ CYCLE FAILED:', err.message);
    console.error('='.repeat(80));
    console.error('Error details:', err.stack);

    postLogData.error = err.message;
    savePostLog(postLogData);

    return false;
  }
}

/**
 * Main continuous loop
 */
async function startAutomation() {
  console.log('\n' + '★'.repeat(80));
  console.log('🤖 AI-POWERED ORIGINAL CONTENT AUTOMATION SYSTEM');
  console.log('★'.repeat(80));
  console.log('📊 Configuration:');
  console.log(`   - Virality Threshold: ${VIRALITY_THRESHOLD}/100`);
  console.log(`   - Posting Interval: ${formatWaitTime(MIN_WAIT_TIME)} - ${formatWaitTime(MAX_WAIT_TIME)}`);
  console.log(`   - Daily Post Limit: ${checkDailyPostLimit().maxCount} posts/day`);
  console.log(`   - Topics Available: ${contentTopics.length}`);
  console.log(`   - Products Available: ${shopeeProducts.length}`);

  const costEstimate = estimateAPICost();
  console.log('\n💰 Cost Estimates:');
  console.log(`   - Per Post: ${costEstimate.formatted.perCycle}`);
  console.log(`   - Per Day: ${costEstimate.formatted.perDay} (12 posts)`);
  console.log(`   - Per Month: ${costEstimate.formatted.perMonth} (~360 posts)`);

  const stats = getSystemStats();
  if (stats && stats.totalPosts > 0) {
    console.log('\n📈 System Statistics:');
    console.log(`   - Total Posts: ${stats.totalPosts}`);
    console.log(`   - Success Rate: ${stats.successRate}%`);
    console.log(`   - Avg Virality: ${stats.averageViralityScore}/100`);
    console.log(`   - Last 24h: ${stats.last24Hours} posts`);
  }

  console.log('★'.repeat(80) + '\n');

  let cycleCount = 0;
  let successCount = 0;
  let failureCount = 0;

  while (true) {
    cycleCount++;
    console.log(`\n📈 Cycle #${cycleCount} | Success: ${successCount} | Failed: ${failureCount}\n`);

    try {
      const success = await runContentCycle();

      if (success) {
        successCount++;
      } else {
        failureCount++;
      }

    } catch (err) {
      failureCount++;
      console.error('❌ Unexpected error in cycle:', err.message);
    }

    // Calculate random wait time
    const waitTime = getRandomWaitTime();
    const nextPostTime = new Date(Date.now() + waitTime);

    console.log(`\n⏰ Next post scheduled at: ${nextPostTime.toLocaleString()}`);
    console.log(`⏳ Waiting ${formatWaitTime(waitTime)}...\n`);
    console.log('─'.repeat(80) + '\n');

    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down automation system...');
  console.log('📊 Final statistics saved to posts-log.json');
  process.exit(0);
});

// Export for testing
module.exports = {
  runContentCycle,
  startAutomation
};

// Run if called directly
if (require.main === module) {
  startAutomation().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}
