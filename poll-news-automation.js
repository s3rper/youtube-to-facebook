require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ── Imports ─────────────────────────────────────────────────────────────────
const { fetchAllNews, addToPostedCache, isDuplicateNews } = require('./news-fetcher');
const { createPollImage, cleanupOldPollImages } = require('./poll-image-generator');
const { getNewsBackgroundImage } = require('./image-search-service');
const { generatePollQuestion } = require('./ai-content-generator');
const { postImageToFacebook } = require('./facebook-poster');
const {
  isDuplicateContent,
  checkProfanity,
  validateCaptionLength
} = require('./safety-validator');

// ── Configuration ────────────────────────────────────────────────────────────
const POLL_MIN_WAIT    = parseInt(process.env.POLL_MIN_WAIT)    || 30 * 60 * 1000;  // 30 min
const POLL_MAX_WAIT    = parseInt(process.env.POLL_MAX_WAIT)    || 2 * 60 * 60 * 1000; // 2 hr
const POLL_DAILY_LIMIT = parseInt(process.env.POLL_DAILY_LIMIT) || 12;
const TOPIC_MIX        = { ph: 1.0, global: 0.0 };

// Duterte-topic keywords for poll focus
const DUTERTE_KEYWORDS = [
  'duterte', 'fprrd', 'sara duterte', 'rodrigo duterte',
  'president duterte', 'vp sara', 'vice president sara',
  'impeach', 'impeachment', 'bongbong', 'bbm', 'marcos'
];

/**
 * Fetch and select a Duterte/PH-politics-focused news item for poll generation.
 * Priority: Duterte keywords > isPriority > recency score.
 * Falls back to any PH news if no Duterte items are available.
 */
async function fetchDuterteNews() {
  const allNews = await fetchAllNews(TOPIC_MIX);
  if (!allNews.length) return null;

  const isDuterteItem = item => {
    const text = `${item.title} ${item.description || ''}`.toLowerCase();
    return DUTERTE_KEYWORDS.some(kw => text.includes(kw));
  };

  // Filter to Duterte-specific items that haven't been posted yet
  let candidates = allNews.filter(isDuterteItem).filter(item => !isDuplicateNews(item));

  // Fallback: any PH news not yet posted
  if (!candidates.length) {
    console.log('⚠️ No fresh Duterte news, falling back to PH politics news');
    candidates = allNews.filter(item => item.isPH && !isDuplicateNews(item));
  }

  if (!candidates.length) {
    console.log('⚠️ No candidate news available');
    return null;
  }

  // Sort by score descending and pick the top item
  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates[0];

  console.log(`\n🏆 Selected Duterte/PH news for poll:`);
  console.log(`   Title:    ${selected.title}`);
  console.log(`   Source:   ${selected.source} (${selected.news_source})`);
  console.log(`   Category: ${selected.category}`);
  console.log(`   Score:    ${selected.score.toFixed(2)}`);
  console.log(`   Duterte:  ${isDuterteItem(selected) ? 'Yes' : 'No (PH fallback)'}\n`);

  return selected;
}

// ── Log file ─────────────────────────────────────────────────────────────────
const logFile = path.join(__dirname, 'poll-posts-log.json');

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const SINGLE    = args.includes('--single');

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function getRandomInterval() {
  return POLL_MIN_WAIT + Math.floor(Math.random() * (POLL_MAX_WAIT - POLL_MIN_WAIT));
}

function formatWaitTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ── Log helpers ───────────────────────────────────────────────────────────────
function loadLog() {
  if (!fs.existsSync(logFile)) return [];
  try { return JSON.parse(fs.readFileSync(logFile, 'utf-8')); }
  catch { return []; }
}

function saveLog(entry) {
  try {
    const log = loadLog();
    log.push({ timestamp: new Date().toISOString(), ...entry });
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  } catch (err) {
    console.error('❌ Error saving log:', err.message);
  }
}

// ── Daily limit check ─────────────────────────────────────────────────────────
function checkDailyLimit() {
  const log = loadLog();
  const since = Date.now() - 86400000;
  const count = log.filter(p => p.success && new Date(p.timestamp).getTime() > since).length;
  return { withinLimit: count < POLL_DAILY_LIMIT, count, max: POLL_DAILY_LIMIT };
}

async function waitUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const wait = midnight.getTime() - now.getTime();
  console.log(`⏰ Daily limit reached. Waiting until midnight (${formatWaitTime(wait)})...`);
  await sleep(wait);
  console.log('🌅 New day! Resuming poll automation...');
}

// ── Stats display ─────────────────────────────────────────────────────────────
function displayStats() {
  const log = loadLog();
  if (!log.length) { console.log('ℹ️ No poll posts yet\n'); return; }
  const success = log.filter(p => p.success && p.error !== 'DRY_RUN').length;
  const since   = Date.now() - 86400000;
  const today   = log.filter(p => p.success && new Date(p.timestamp).getTime() > since).length;
  console.log('📊 POLL STATISTICS');
  console.log('='.repeat(70));
  console.log(`Total: ${log.length}  |  Successful: ${success}  |  Today: ${today}/${POLL_DAILY_LIMIT}`);
  console.log('='.repeat(70) + '\n');
}

// ── Main posting cycle ────────────────────────────────────────────────────────
async function runPollCycle() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 STARTING POLL POSTING CYCLE');
  console.log('='.repeat(70) + '\n');

  const logEntry = {
    success: false,
    news_title: null,
    news_category: null,
    poll_question: null,
    post_url: null,
    error: null
  };

  try {
    // ── Step 1: Fetch Duterte/PH politics news ───────────────────
    console.log('📡 Step 1: Fetching Duterte/PH politics news...\n');
    const newsItem = await fetchDuterteNews();

    if (!newsItem) {
      logEntry.error = 'No trending news available';
      console.log(`⚠️ ${logEntry.error}`);
      saveLog(logEntry);
      return false;
    }

    logEntry.news_title    = newsItem.title;
    logEntry.news_category = newsItem.category;

    // ── Step 2: Generate poll question ───────────────────────────
    console.log('🤖 Step 2: Generating Tagalog poll question...\n');
    const { question, hashtags } = await generatePollQuestion(newsItem);
    logEntry.poll_question = question;

    // Facebook caption encourages engagement
    const fullCaption =
      `${question}\n\n` +
      `Type YES o NO sa comments! 👇\n` +
      `❤️ = Oo / Yes\n` +
      `😆 = Hindi / No\n\n` +
      `${hashtags}`;

    console.log(`\n📝 Poll Question: ${question}`);
    console.log(`📝 Caption preview:\n${fullCaption}\n`);

    // ── Step 3: Validate ─────────────────────────────────────────
    console.log('🔍 Step 3: Validating content...\n');

    const limitOk = checkDailyLimit();
    if (!limitOk.withinLimit) {
      logEntry.error = `Daily limit reached: ${limitOk.count}/${limitOk.max}`;
      console.error(`❌ ${logEntry.error}`);
      saveLog(logEntry);
      return false;
    }

    if (isDuplicateContent(newsItem.title)) {
      logEntry.error = 'Duplicate news headline already posted';
      console.warn(`⚠️ ${logEntry.error}`);
      saveLog(logEntry);
      return false;
    }

    const headlineProfanity = checkProfanity(newsItem.title);
    if (headlineProfanity.hasProfanity) {
      logEntry.error = `Profanity in headline: ${headlineProfanity.words.join(', ')}`;
      console.error(`❌ ${logEntry.error}`);
      saveLog(logEntry);
      return false;
    }

    const captionCheck = validateCaptionLength(fullCaption);
    if (!captionCheck.valid) {
      console.warn(`⚠️ Caption length warning: ${captionCheck.length} chars`);
    }

    console.log('✅ Validation passed\n');

    // ── Step 4: Fetch background + create poll image ──────────────
    console.log('🎨 Step 4: Creating poll image...\n');

    const backgroundImage = await getNewsBackgroundImage(newsItem);
    if (backgroundImage) {
      console.log('✅ Background image fetched successfully');
    } else {
      console.log('⚠️ Using dark gradient fallback');
    }

    const imagePath = await createPollImage(question, backgroundImage, null);
    console.log(`✅ Poll image created: ${imagePath}\n`);

    // ── Step 5: Post to Facebook ──────────────────────────────────
    if (DRY_RUN) {
      console.log('🧪 DRY RUN: skipping Facebook post\n');
      console.log(`   News:     ${newsItem.title}`);
      console.log(`   Question: ${question}`);
      console.log(`   Image:    ${imagePath}`);
      logEntry.success = true;
      logEntry.error   = 'DRY_RUN';
      saveLog(logEntry);
      return true;
    }

    console.log('📤 Step 5: Posting to Facebook...\n');
    const result = await postImageToFacebook(imagePath, fullCaption);

    if (!result.success) {
      logEntry.error = result.error || 'Unknown Facebook API error';
      console.error(`❌ Facebook posting failed: ${logEntry.error}`);
      saveLog(logEntry);
      return false;
    }

    console.log(`✅ Poll posted!`);
    console.log(`   Post ID: ${result.post_id}`);
    console.log(`   URL:     ${result.url}\n`);

    logEntry.success  = true;
    logEntry.post_id  = result.post_id;
    logEntry.post_url = result.url;

    // ── Step 6: Post-posting cleanup ─────────────────────────────
    addToPostedCache(newsItem);
    saveLog(logEntry);
    cleanupOldPollImages(20);

    console.log('='.repeat(70));
    console.log('✅ POLL CYCLE COMPLETE');
    console.log('='.repeat(70) + '\n');

    return true;

  } catch (err) {
    console.error('\n❌ Cycle error:', err.message);
    logEntry.error = err.message;
    saveLog(logEntry);
    return false;
  }
}

// ── Automation loop ───────────────────────────────────────────────────────────
async function startPollAutomation() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 POLL NEWS AUTOMATION SYSTEM');
  console.log('='.repeat(70));
  console.log(`
Mode:        ${DRY_RUN ? 'DRY RUN (no posting)' : SINGLE ? 'SINGLE POST' : 'CONTINUOUS'}
Topic Mix:   ${TOPIC_MIX.ph * 100}% Philippines / ${TOPIC_MIX.global * 100}% Global
Daily Limit: ${POLL_DAILY_LIMIT} polls/day
Interval:    ${formatWaitTime(POLL_MIN_WAIT)} – ${formatWaitTime(POLL_MAX_WAIT)}
Style:       YES (❤️) / NO (😆) interactive poll images
  `);
  console.log('='.repeat(70) + '\n');

  displayStats();

  if (SINGLE) {
    console.log('🎯 Single-post mode...\n');
    const ok = await runPollCycle();
    process.exit(ok ? 0 : 1);
  }

  console.log('🔄 Starting continuous poll automation...\n');
  let cycle = 0;

  while (true) {
    try {
      cycle++;
      console.log(`\n🔄 Poll Cycle #${cycle}\n`);

      const limit = checkDailyLimit();
      if (!limit.withinLimit) {
        await waitUntilMidnight();
        continue;
      }

      await runPollCycle();

      const wait = getRandomInterval();
      const next = new Date(Date.now() + wait);
      console.log(`\n⏰ Next poll: ${next.toLocaleString()} (in ${formatWaitTime(wait)})\n`);
      await sleep(wait);

    } catch (err) {
      console.error('\n❌ Automation error:', err.message);
      console.log('⏰ Retrying in 10 minutes...\n');
      await sleep(10 * 60 * 1000);
    }
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Shutting down poll automation...');
  displayStats();
  process.exit(0);
});

// ── Entry point ───────────────────────────────────────────────────────────────
if (require.main === module) {
  startPollAutomation().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { runPollCycle, checkDailyLimit };
