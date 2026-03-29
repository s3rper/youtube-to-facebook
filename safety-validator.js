const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const postsLogFile = path.join(__dirname, 'posts-log.json');
const MAX_CAPTION_LENGTH = 2000; // Facebook limit
const MAX_POSTS_PER_DAY = 12;

// Simple profanity filter (basic words)
const profanityList = [
  'fuck', 'shit', 'damn', 'bitch', 'ass', 'bastard',
  'puta', 'tangina', 'gago', 'putangina', 'bobo'
];

/**
 * Generate content hash for duplicate detection
 * @param {string} text - Content text
 * @returns {string} - SHA256 hash
 */
function generateContentHash(text) {
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

/**
 * Check if content is duplicate
 * @param {string} content - Content to check
 * @returns {boolean} - True if duplicate found
 */
function isDuplicateContent(content) {
  try {
    const hash = generateContentHash(content);

    if (!fs.existsSync(postsLogFile)) {
      return false;
    }

    const log = JSON.parse(fs.readFileSync(postsLogFile, 'utf-8'));

    // Check last 100 posts for duplicates
    const recentPosts = log.slice(-100);

    for (const post of recentPosts) {
      if (post.content_headline) {
        const postHash = generateContentHash(post.content_headline);
        if (postHash === hash) {
          console.log('⚠️ Duplicate content detected!');
          return true;
        }
      }
    }

    return false;

  } catch (err) {
    console.error('⚠️ Error checking duplicates:', err.message);
    return false; // Allow posting if check fails
  }
}

/**
 * Check for profanity in text
 * @param {string} text - Text to check
 * @returns {Object} - {hasProfanity, words}
 */
function checkProfanity(text) {
  const lowerText = text.toLowerCase();
  const foundWords = [];

  for (const word of profanityList) {
    if (lowerText.includes(word)) {
      foundWords.push(word);
    }
  }

  return {
    hasProfanity: foundWords.length > 0,
    words: foundWords
  };
}

/**
 * Validate caption length
 * @param {string} caption - Caption text
 * @returns {Object} - {valid, length, maxLength}
 */
function validateCaptionLength(caption) {
  const length = caption.length;
  const valid = length <= MAX_CAPTION_LENGTH;

  if (!valid) {
    console.warn(`⚠️ Caption too long: ${length} chars (max: ${MAX_CAPTION_LENGTH})`);
  }

  return {
    valid,
    length,
    maxLength: MAX_CAPTION_LENGTH,
    trimmed: valid ? caption : caption.substring(0, MAX_CAPTION_LENGTH - 3) + '...'
  };
}

/**
 * Check daily post limit
 * @returns {Object} - {withinLimit, count, maxCount}
 */
function checkDailyPostLimit() {
  try {
    if (!fs.existsSync(postsLogFile)) {
      return { withinLimit: true, count: 0, maxCount: MAX_POSTS_PER_DAY };
    }

    const log = JSON.parse(fs.readFileSync(postsLogFile, 'utf-8'));

    // Count successful posts in last 24 hours
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    const recentSuccessfulPosts = log.filter(post => {
      const postTime = new Date(post.timestamp).getTime();
      return post.success && postTime > yesterday;
    });

    const count = recentSuccessfulPosts.length;
    const withinLimit = count < MAX_POSTS_PER_DAY;

    if (!withinLimit) {
      console.warn(`⚠️ Daily post limit reached: ${count}/${MAX_POSTS_PER_DAY}`);
    }

    return {
      withinLimit,
      count,
      maxCount: MAX_POSTS_PER_DAY
    };

  } catch (err) {
    console.error('⚠️ Error checking daily limit:', err.message);
    return { withinLimit: true, count: 0, maxCount: MAX_POSTS_PER_DAY };
  }
}

/**
 * Validate post content before posting
 * @param {Object} postData - {headline, content}
 * @param {string} caption - Facebook caption
 * @returns {Object} - {valid, errors, warnings}
 */
function validatePostContent(postData, caption) {
  const errors = [];
  const warnings = [];

  // Check for duplicates
  if (isDuplicateContent(postData.headline)) {
    errors.push('Duplicate content detected');
  }

  // Check profanity in headline
  const headlineProfanity = checkProfanity(postData.headline);
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

  // Check daily limit
  const dailyLimit = checkDailyPostLimit();
  if (!dailyLimit.withinLimit) {
    errors.push(`Daily post limit reached: ${dailyLimit.count}/${dailyLimit.maxCount}`);
  }

  // Check minimum content length
  if (postData.content && postData.content.length < 50) {
    errors.push('Content too short (minimum 50 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    captionValidation
  };
}

/**
 * Calculate estimated API cost for a cycle
 * @returns {Object} - Cost breakdown
 */
function estimateAPICost() {
  // Claude Haiku pricing (as of 2024)
  const inputCostPer1M = 0.25;  // $0.25 per 1M input tokens
  const outputCostPer1M = 1.25; // $1.25 per 1M output tokens

  // Estimated tokens per cycle
  const tokens = {
    contentGeneration: { input: 200, output: 400 },
    scoring: { input: 300, output: 150 },
    productMatch: { input: 400, output: 100 },
    caption: { input: 250, output: 150 },
    comment: { input: 150, output: 50 }
  };

  let totalInput = 0;
  let totalOutput = 0;

  Object.values(tokens).forEach(t => {
    totalInput += t.input;
    totalOutput += t.output;
  });

  const inputCost = (totalInput / 1000000) * inputCostPer1M;
  const outputCost = (totalOutput / 1000000) * outputCostPer1M;
  const totalCost = inputCost + outputCost;

  return {
    totalInput,
    totalOutput,
    costPerCycle: totalCost,
    costPerDay: totalCost * 12, // 12 posts per day
    costPerMonth: totalCost * 12 * 30,
    formatted: {
      perCycle: `$${totalCost.toFixed(4)}`,
      perDay: `$${(totalCost * 12).toFixed(4)}`,
      perMonth: `$${(totalCost * 12 * 30).toFixed(2)}`
    }
  };
}

/**
 * Get system statistics
 * @returns {Object} - Statistics from posts log
 */
function getSystemStats() {
  try {
    if (!fs.existsSync(postsLogFile)) {
      return {
        totalPosts: 0,
        successfulPosts: 0,
        failedPosts: 0,
        averageViralityScore: 0,
        last24Hours: 0
      };
    }

    const log = JSON.parse(fs.readFileSync(postsLogFile, 'utf-8'));

    const totalPosts = log.length;
    const successfulPosts = log.filter(p => p.success).length;
    const failedPosts = totalPosts - successfulPosts;

    const viralityScores = log.filter(p => p.virality_score).map(p => p.virality_score);
    const averageViralityScore = viralityScores.length > 0
      ? viralityScores.reduce((a, b) => a + b, 0) / viralityScores.length
      : 0;

    // Count posts in last 24 hours
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    const last24Hours = log.filter(post => {
      const postTime = new Date(post.timestamp).getTime();
      return postTime > yesterday;
    }).length;

    return {
      totalPosts,
      successfulPosts,
      failedPosts,
      averageViralityScore: Math.round(averageViralityScore),
      last24Hours,
      successRate: totalPosts > 0 ? ((successfulPosts / totalPosts) * 100).toFixed(1) : 0
    };

  } catch (err) {
    console.error('⚠️ Error getting stats:', err.message);
    return null;
  }
}

module.exports = {
  generateContentHash,
  isDuplicateContent,
  checkProfanity,
  validateCaptionLength,
  checkDailyPostLimit,
  validatePostContent,
  estimateAPICost,
  getSystemStats
};
