/**
 * news-highlight-automation.js
 *
 * Generates a high-end NewsHighlight animation from trending Duterte/PH politics
 * news and uploads it to Facebook as a Reel.
 *
 * Usage:
 *   node news-highlight-automation.js           # continuous loop
 *   node news-highlight-automation.js --single  # post once and exit
 *   node news-highlight-automation.js --dry-run # render only, skip upload
 */

require('dotenv').config();
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const express = require('express');

const { bundle }                          = require('@remotion/bundler');
const { renderMedia, selectComposition }  = require('@remotion/renderer');
const { fetchAllNews, addToPostedCache, isDuplicateNews } = require('./news-fetcher');
const { getNewsBackgroundImage }          = require('./image-search-service');
const { generateReelTitleAndDescription } = require('./ai-content-generator');
const { postVideoToFacebook }             = require('./facebook-video-poster');

// ── Paths ─────────────────────────────────────────────────────────────────────
const remotionRoot = path.join(__dirname, 'remotion/index.jsx');
const outputDir    = path.join(__dirname, 'generated_videos');
const bgDir        = path.join(__dirname, 'remotion/public/backgrounds');
const logFile      = path.join(__dirname, 'news-highlight-log.json');

[outputDir, bgDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Config ────────────────────────────────────────────────────────────────────
const MIN_WAIT      = parseInt(process.env.HIGHLIGHT_MIN_WAIT)    || 30 * 60 * 1000;  // 30 min
const MAX_WAIT      = parseInt(process.env.HIGHLIGHT_MAX_WAIT)    || 60 * 60 * 1000;  // 1 hr
const DAILY_LIMIT   = parseInt(process.env.HIGHLIGHT_DAILY_LIMIT) || Infinity;
const CONCURRENCY   = parseInt(process.env.RENDER_CONCURRENCY)    || 2; // lower on Render to save RAM
const PORT          = process.env.PORT || 3003;

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE  = args.includes('--single');

// ── Duterte keyword filter (same as poll-news-automation.js) ─────────────────
const DUTERTE_KEYWORDS = [
  'duterte', 'fprrd', 'sara duterte', 'rodrigo duterte',
  'president duterte', 'vp sara', 'vice president sara',
  'impeach', 'impeachment', 'bongbong', 'bbm', 'marcos',
];
const isDuterteItem = item => {
  const text = `${item.title} ${item.description || ''}`.toLowerCase();
  return DUTERTE_KEYWORDS.some(kw => text.includes(kw));
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function formatWait(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function getRandomWait() {
  return MIN_WAIT + Math.floor(Math.random() * (MAX_WAIT - MIN_WAIT));
}

// ── Log helpers ───────────────────────────────────────────────────────────────
function loadLog() {
  if (!fs.existsSync(logFile)) return [];
  try { return JSON.parse(fs.readFileSync(logFile, 'utf-8')); } catch { return []; }
}
function saveLog(entry) {
  const log = loadLog();
  log.push({ timestamp: new Date().toISOString(), ...entry });
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
}
function checkDailyLimit() {
  const log    = loadLog();
  const since  = Date.now() - 86400000;
  const count  = log.filter(e => e.success && new Date(e.timestamp).getTime() > since).length;
  return { ok: count < DAILY_LIMIT, count, max: DAILY_LIMIT };
}

// ── Fetch Duterte-focused news ────────────────────────────────────────────────
async function fetchDuterteNews() {
  const all = await fetchAllNews({ ph: 1.0, global: 0.0 });
  let candidates = all.filter(isDuterteItem).filter(i => !isDuplicateNews(i));
  if (!candidates.length) {
    console.log('⚠️  No Duterte news, falling back to any fresh PH news');
    candidates = all.filter(i => i.isPH && !isDuplicateNews(i));
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

// ── Build body lines from news item ──────────────────────────────────────────
// Splits by complete sentences so bullets are never mid-sentence fragments.
function buildBodyLines(newsItem) {
  const raw = (newsItem.description || '').trim();
  if (!raw) return [`Basahin ang buong balita sa ${newsItem.news_source || 'pinagmulan'}.`];

  // Split at sentence endings (. ! ?) followed by a space or end-of-string
  const sentences = raw
    .replace(/([.!?])\s+/g, '$1|||')
    .split('|||')
    .map(s => s.trim())
    .filter(s => s.length >= 20); // drop short fragments like "Rep." alone

  if (sentences.length === 0) {
    // No sentence boundaries found — use the whole description, truncated
    return [raw.length > 120 ? raw.slice(0, 117) + '…' : raw];
  }

  // Each bullet is one complete sentence; truncate very long ones with ellipsis
  return sentences.slice(0, 4).map(s => s.length > 110 ? s.slice(0, 107) + '…' : s);
}

// ── Save background image for Remotion ───────────────────────────────────────
async function fetchAndSaveBackground(newsItem) {
  const buffer = await getNewsBackgroundImage(newsItem);
  if (!buffer) return null;
  const hash     = crypto.createHash('md5').update(newsItem.title).digest('hex');
  const filename = `${hash}.jpg`;
  fs.writeFileSync(path.join(bgDir, filename), buffer);
  return filename;
}

// ── Render NewsHighlight video ────────────────────────────────────────────────
async function renderNewsHighlight(inputProps) {
  console.log('📦 Bundling Remotion compositions...');
  const bundleLocation = await bundle({
    entryPoint: remotionRoot,
    webpackOverride: config => config,
  });
  console.log('   ✅ Bundle ready');

  const composition = await selectComposition({
    serveUrl:   bundleLocation,
    id:         'NewsHighlight',
    inputProps,
  });

  const outputPath = path.join(outputDir, `highlight_${Date.now()}.mp4`);
  console.log('🎥 Rendering (900 frames @ 30fps = 30s)...');

  const start = Date.now();
  await renderMedia({
    composition,
    serveUrl:       bundleLocation,
    codec:          'h264',
    outputLocation: outputPath,
    inputProps,
    imageFormat:    'jpeg',
    concurrency:    CONCURRENCY,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
      process.stdout.write(`\r   [${bar}] ${pct}%  `);
    },
  });

  const secs   = ((Date.now() - start) / 1000).toFixed(1);
  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log(`\n   ✅ Rendered in ${secs}s  —  ${sizeMB} MB`);
  return outputPath;
}

// ── Single posting cycle ──────────────────────────────────────────────────────
async function runCycle() {
  console.log('\n' + '═'.repeat(64));
  console.log('🎬  NEWS HIGHLIGHT CYCLE');
  console.log('═'.repeat(64) + '\n');

  const logEntry = { success: false, news_title: null, video_path: null, post_url: null, error: null };

  try {
    // Step 1: Fetch news
    console.log('📡 Step 1: Fetching Duterte/PH news...\n');
    const newsItem = await fetchDuterteNews();
    if (!newsItem) {
      logEntry.error = 'No fresh Duterte news available';
      console.warn(`⚠️  ${logEntry.error}`);
      saveLog(logEntry);
      return false;
    }
    logEntry.news_title = newsItem.title;
    console.log(`   ✅ Selected: "${newsItem.title}"`);
    console.log(`   Source: ${newsItem.news_source}  |  Category: ${newsItem.category}\n`);

    // Step 2: Generate AI title + description (Taglish)
    console.log('🤖 Step 2: Generating AI title & caption...\n');
    const { title: reelTitle, description: reelDescription } =
      await generateReelTitleAndDescription(newsItem.title, newsItem.description || '');
    console.log(`   Title: ${reelTitle}\n`);

    // Step 3: Fetch background image
    console.log('🖼️  Step 3: Fetching topic-matched background image...\n');
    const backgroundImage = await fetchAndSaveBackground(newsItem);
    if (backgroundImage) {
      console.log(`   ✅ Background saved: ${backgroundImage}\n`);
    } else {
      console.log('   ⚠️  No image found — using animated gradient\n');
    }

    // Step 4: Build Remotion props
    const inputProps = {
      headline:        newsItem.title,
      bodyLines:       buildBodyLines(newsItem),
      source:          newsItem.news_source || newsItem.source || 'GDM News',
      category:        newsItem.category || 'politics',
      cta:             '❤️  I-like at i-share mo ito sa inyong mga kaibigan!',
      backgroundImage: backgroundImage || null,
    };

    // Step 5: Render video
    console.log('🎨 Step 4: Rendering video...\n');
    const videoPath = await renderNewsHighlight(inputProps);
    logEntry.video_path = videoPath;

    // Step 6: Post to Facebook (skip if dry run)
    if (DRY_RUN) {
      console.log('\n🧪 DRY RUN — skipping Facebook upload');
      console.log(`   Video: ${videoPath}`);
      logEntry.success = true;
      logEntry.error   = 'DRY_RUN';
      saveLog(logEntry);
      addToPostedCache(newsItem);
      return true;
    }

    console.log('\n📤 Step 5: Uploading to Facebook...\n');
    const result = await postVideoToFacebook(videoPath, reelDescription);

    if (!result.success) {
      logEntry.error = result.error || 'Facebook upload failed';
      console.error(`❌ ${logEntry.error}`);
      saveLog(logEntry);
      return false;
    }

    console.log(`✅ Posted!  ID: ${result.video_id}`);
    console.log(`   URL: ${result.url}\n`);

    logEntry.success  = true;
    logEntry.post_id  = result.video_id;
    logEntry.post_url = result.url;

    addToPostedCache(newsItem);
    saveLog(logEntry);

    // Cleanup old highlight videos (keep 10)
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('highlight_') && f.endsWith('.mp4'))
      .map(f => ({ f, t: fs.statSync(path.join(outputDir, f)).mtime.getTime() }))
      .sort((a, b) => b.t - a.t);
    files.slice(10).forEach(({ f }) => fs.unlinkSync(path.join(outputDir, f)));

    console.log('═'.repeat(64));
    console.log('✅  CYCLE COMPLETE');
    console.log('═'.repeat(64) + '\n');
    return true;

  } catch (err) {
    console.error('\n❌ Cycle error:', err.message);
    logEntry.error = err.message;
    saveLog(logEntry);
    return false;
  }
}

// ── Stats display ─────────────────────────────────────────────────────────────
function displayStats() {
  const log = loadLog();
  if (!log.length) { console.log('ℹ️  No highlight posts yet\n'); return; }
  const success = log.filter(e => e.success && e.error !== 'DRY_RUN').length;
  const since   = Date.now() - 86400000;
  const today   = log.filter(e => e.success && new Date(e.timestamp).getTime() > since).length;
  console.log('📊 HIGHLIGHT STATISTICS');
  console.log('═'.repeat(64));
  console.log(`Total: ${log.length}  |  Successful: ${success}  |  Today: ${today}/${DAILY_LIMIT}`);
  console.log('═'.repeat(64) + '\n');
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function start() {
  console.log('\n' + '═'.repeat(64));
  console.log('🎬  NEWS HIGHLIGHT AUTOMATION');
  console.log('═'.repeat(64));
  console.log(`
Mode:        ${DRY_RUN ? 'DRY RUN (no upload)' : SINGLE ? 'SINGLE POST' : 'CONTINUOUS'}
Daily limit: ${DAILY_LIMIT} videos/day
Interval:    ${formatWait(MIN_WAIT)} – ${formatWait(MAX_WAIT)} between posts
Output:      1080×1920  |  30s  |  H.264 MP4
  `);
  console.log('═'.repeat(64) + '\n');

  displayStats();

  if (SINGLE || DRY_RUN) {
    const ok = await runCycle();
    process.exit(ok ? 0 : 1);
  }

  // Continuous loop
  let cycle = 0;
  while (true) {
    try {
      cycle++;
      console.log(`\n🔄 Cycle #${cycle}\n`);

      const limit = checkDailyLimit();
      if (!limit.ok) {
        const now      = new Date();
        const midnight = new Date(now);
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);
        const wait = midnight.getTime() - now.getTime();
        console.log(`⏰ Daily limit reached (${limit.count}/${limit.max}). Waiting until midnight (${formatWait(wait)})...`);
        await sleep(wait);
        continue;
      }

      await runCycle();

      const wait = getRandomWait();
      const next = new Date(Date.now() + wait);
      console.log(`⏰ Next post: ${next.toLocaleString()} (in ${formatWait(wait)})\n`);
      await sleep(wait);

    } catch (err) {
      console.error('\n❌ Automation error:', err.message);
      console.log('⏰ Retrying in 15 minutes...\n');
      await sleep(15 * 60 * 1000);
    }
  }
}

// ── Health check server (required for Render.com keep-alive) ─────────────────
function startHealthServer() {
  const app = express();

  app.get('/', (req, res) => res.json({
    status:    'ok',
    service:   'news-highlight-automation',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
    daily:     checkDailyLimit(),
  }));

  app.get('/health', (req, res) => res.send('OK'));

  app.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
    console.log(`   Ping /health to keep Render alive\n`);
  });
}

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Shutting down...');
  displayStats();
  process.exit(0);
});

// Start health server first, then automation
startHealthServer();
start().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
