// facebook_reel_random_scraper.js
require('dotenv').config();
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const axios = require('axios');

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const apiVersion = process.env.GRAPH_API_VERSION || 'v24.0';
const outputDir = process.env.OUTPUT_DIR || path.join(__dirname, 'reels_output');
const pagesFile = process.env.PAGES_FILE || path.join(__dirname, 'pages.json'); // array of page ids or urls
const perPage = parseInt(process.env.PER_PAGE || '25', 10);
const requestDelayMs = parseInt(process.env.REQUEST_DELAY_MS || '500', 10);

if (!accessToken) {
  console.error('❌ Please set FACEBOOK_ACCESS_TOKEN in .env');
  process.exit(1);
}
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

function normalizePageId(input) {
  if (!input) return null;
  try {
    // If they provided a full url like https://www.facebook.com/SomePageName
    if (input.startsWith('http')) {
      const u = new URL(input);
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return seg || null;
    }
    return String(input).trim();
  } catch (e) {
    return String(input).trim();
  }
}

async function graphGetRelative(path, params = {}) {
  const url = `https://graph.facebook.com/${apiVersion}/${path}`;
  const fullParams = { access_token: accessToken, ...params };
  const resp = await axios.get(url, { params: fullParams, timeout: 30000, headers: { 'User-Agent': 'facebook-reel-random-scraper/1.0' }});
  return resp.data;
}

function buildFields(limit) {
  const fields = [
    'id',
    'title',
    'description',
    'permalink_url',
    'created_time',
    'length',
    'thumbnails',
    'status'
  ];
  return `video_reels?fields=${encodeURIComponent(fields.join(','))}&limit=${limit}`;
}

async function fetchReelsByPageId(pageId) {
  const collected = [];
  let nextUrl = null;

  // initial request (relative)
  let endpoint = buildFields(perPage);
  try {
    let resp = await graphGetRelative(`${pageId}/${endpoint}`);
    if (!resp || !resp.data) return collected;
    collected.push(...resp.data.map(d => ({ id: d.id, permalink: d.permalink_url, raw: d })));
    nextUrl = resp.paging && resp.paging.next ? resp.paging.next : null;

    while (nextUrl) {
      // nextUrl is full URL; use axios.get directly
      const r = await axios.get(nextUrl, { params: { access_token: accessToken }, timeout: 30000, headers: { 'User-Agent': 'facebook-reel-random-scraper/1.0' } });
      const pageData = r.data;
      if (!pageData || !pageData.data) break;
      collected.push(...pageData.data.map(d => ({ id: d.id, permalink: d.permalink_url, raw: d })));
      nextUrl = pageData.paging && pageData.paging.next ? pageData.paging.next : null;
      await sleep(requestDelayMs);
    }
  } catch (err) {
    console.error(`❌ Error fetching reels for page ${pageId}:`, (err.response && err.response.data) || err.message || err);
  }
  return collected;
}

async function runOnce() {
  // load pages
  let pages = [];
  try {
    pages = JSON.parse(fs.readFileSync(pagesFile, 'utf8'));
    if (!Array.isArray(pages) || pages.length === 0) {
      throw new Error('pages.json must be an array with at least one entry');
    }
  } catch (e) {
    console.error('❌ Could not load pages.json:', e.message || e);
    process.exit(1);
  }

  // pick a random page
  const raw = pages[Math.floor(Math.random() * pages.length)];
  const pageId = normalizePageId(raw);
  if (!pageId) {
    console.error('❌ Could not determine page id from:', raw);
    process.exit(1);
  }
  console.log(`🎯 Selected page: ${pageId}`);

  const reels = await fetchReelsByPageId(pageId);
  const outPath = path.join(outputDir, `${pageId.replace(/[^a-z0-9_-]/gi,'_')}.json`);
  await fsp.writeFile(outPath, JSON.stringify({ fetched_at: new Date().toISOString(), page: pageId, count: reels.length, reels }, null, 2), 'utf8');
  console.log(`✅ Wrote ${reels.length} reels to ${outPath}`);
  return { page: pageId, count: reels.length, path: outPath };
}

(async () => {
  try {
    const result = await runOnce();
    console.log('Done ->', result);
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
