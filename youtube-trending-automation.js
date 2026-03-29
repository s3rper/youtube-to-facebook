require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const express = require('express');

// Import YouTube API utility
const {
  searchTrendingVideos,
  enrichVideosWithStats,
  isAcceptableLanguage,
  isShortVideo,
  parseDuration,
  filterByTrendingThresholds,
} = require('./utils/youtube-api');

/**
 * Initialize YouTube cookies from environment variable
 * This is needed because Render free tier doesn't have Shell access
 */
function initializeYouTubeCookies() {
  const cookiesPath = path.join(__dirname, 'youtube-cookies.txt');
  const cookiesBase64 = process.env.YOUTUBE_COOKIES_BASE64;

  if (cookiesBase64 && !fs.existsSync(cookiesPath)) {
    try {
      console.log('🍪 Decoding YouTube cookies from environment variable...');
      const cookiesContent = Buffer.from(cookiesBase64, 'base64').toString('utf-8');
      fs.writeFileSync(cookiesPath, cookiesContent);
      console.log('✅ YouTube cookies file created successfully');
    } catch (error) {
      console.error('❌ Failed to decode cookies:', error.message);
    }
  } else if (fs.existsSync(cookiesPath)) {
    console.log('✅ YouTube cookies file already exists');
  } else if (!cookiesBase64) {
    console.warn('⚠️ No YOUTUBE_COOKIES_BASE64 environment variable found');
    console.warn('💡 Add this variable in Render dashboard to enable authenticated downloads');
  }
}

// Initialize cookies on startup
initializeYouTubeCookies();

// Configuration - properly handle 0 values from .env
const CONFIG = {
  minViews: process.env.TRENDING_MIN_VIEWS !== undefined ? parseInt(process.env.TRENDING_MIN_VIEWS) : 10000,
  minViewVelocity: process.env.TRENDING_MIN_VIEW_VELOCITY !== undefined ? parseInt(process.env.TRENDING_MIN_VIEW_VELOCITY) : 1000,
  minEngagementRate: process.env.TRENDING_MIN_ENGAGEMENT_RATE !== undefined ? parseFloat(process.env.TRENDING_MIN_ENGAGEMENT_RATE) : 0.05,
  maxVideoAgeHours: process.env.TRENDING_MAX_VIDEO_AGE_HOURS !== undefined ? parseInt(process.env.TRENDING_MAX_VIDEO_AGE_HOURS) : 24,
  dailyPostLimit: process.env.TRENDING_DAILY_POST_LIMIT !== undefined ? parseInt(process.env.TRENDING_DAILY_POST_LIMIT) : 12,
  minWaitTime: process.env.TRENDING_MIN_WAIT_TIME !== undefined ? parseInt(process.env.TRENDING_MIN_WAIT_TIME) : 3600000,
  maxWaitTime: process.env.TRENDING_MAX_WAIT_TIME !== undefined ? parseInt(process.env.TRENDING_MAX_WAIT_TIME) : 3600000,
  acceptedLanguages: (process.env.TRENDING_ACCEPTED_LANGUAGES || 'en,tl,fil').split(','),
};

// Facebook configuration
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

// File paths
const OUTPUT_FILE_NAME = 'trending_youtube_video.mp4';
const OUTPUT_PATH = path.join(__dirname, OUTPUT_FILE_NAME);
const TRACKING_FILE = path.join(__dirname, 'trending-videos-log.json');
const UPLOADED_VIDEOS_FILE = path.join(__dirname, 'uploadedVideos.json'); // youtube_upload.js tracking

// Shopee links (same as youtube_upload.js)
const SHOPEE_LIST_FILE = path.join(__dirname, 'duterte-shopee-list.json');
const FALLBACK_COMMENT_MESSAGE = 'Please follow and subscribe https://www.facebook.com/reelsdailydose';
let cachedShopeeLinks = [];

// CLI flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE_POST = args.includes('--single');

/**
 * Load Shopee links from file
 */
function loadShopeeLinks() {
  try {
    if (!fs.existsSync(SHOPEE_LIST_FILE)) {
      console.warn('⚠️ Shopee list file not found:', SHOPEE_LIST_FILE);
      return [];
    }

    const raw = fs.readFileSync(SHOPEE_LIST_FILE, 'utf-8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      parsed = null;
    }

    const links = new Set();

    function extractFromObject(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (!val) continue;
        if (typeof val === 'string') {
          if (key.toLowerCase().includes('productofferlink')) {
            if (val.includes('shopee')) links.add(val);
          }
          const urlMatch = val.match(/https?:\/\/[^\s"'\\]+shopee\.[^\s"'\\]+/gi);
          if (urlMatch) urlMatch.forEach(u => links.add(u));
        } else if (Array.isArray(val)) {
          val.forEach(item => extractFromObject(item));
        } else if (typeof val === 'object') {
          extractFromObject(val);
        }
      }
    }

    if (parsed) {
      if (Array.isArray(parsed)) {
        parsed.forEach(item => extractFromObject(item));
      } else {
        extractFromObject(parsed);
      }
    }

    const rawMatches = raw.match(/https?:\/\/[^\s"'\\]+shopee\.[^\s"'\\]+/gi);
    if (rawMatches) rawMatches.forEach(u => links.add(u));

    return Array.from(links);
  } catch (err) {
    console.error('❌ Failed to load shopee list file:', err.message || err);
    return [];
  }
}

/**
 * Get random Shopee link
 */
function getRandomShopeeLink() {
  if (!cachedShopeeLinks || cachedShopeeLinks.length === 0) {
    cachedShopeeLinks = loadShopeeLinks();
  }
  if (cachedShopeeLinks && cachedShopeeLinks.length > 0) {
    return cachedShopeeLinks[Math.floor(Math.random() * cachedShopeeLinks.length)];
  }
  return null;
}

/**
 * Load tracking log
 */
function loadTrackingLog() {
  if (!fs.existsSync(TRACKING_FILE)) {
    return {
      uploadedVideos: [],
      stats: {
        totalUploaded: 0,
        lastUploadTime: null,
        uploadsToday: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
      },
    };
  }

  try {
    return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
  } catch (err) {
    console.error('⚠️ Error loading tracking log:', err.message);
    return {
      uploadedVideos: [],
      stats: {
        totalUploaded: 0,
        lastUploadTime: null,
        uploadsToday: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
      },
    };
  }
}

/**
 * Save to tracking log
 */
function saveToTrackingLog(video, success, facebookPostId = null) {
  try {
    const log = loadTrackingLog();
    const today = new Date().toISOString().split('T')[0];

    // Reset daily count if new day
    if (log.stats.lastResetDate !== today) {
      log.stats.uploadsToday = 0;
      log.stats.lastResetDate = today;
    }

    if (success) {
      log.stats.totalUploaded++;
      log.stats.uploadsToday++;
      log.stats.lastUploadTime = new Date().toISOString();
    }

    log.uploadedVideos.push({
      youtubeId: video.id.videoId || video.id,
      title: video.snippet.title,
      language: video.snippet.defaultAudioLanguage || video.snippet.defaultLanguage || 'unknown',
      uploadedAt: new Date().toISOString(),
      views: parseInt(video.statistics?.viewCount || '0', 10),
      likes: parseInt(video.statistics?.likeCount || '0', 10),
      comments: parseInt(video.statistics?.commentCount || '0', 10),
      viewVelocity: video.viewVelocity || 0,
      engagementRate: video.engagementRate || 0,
      trendingScore: video.trendingScore || 0,
      facebookPostId,
      success,
    });

    fs.writeFileSync(TRACKING_FILE, JSON.stringify(log, null, 2));
    console.log('💾 Saved to tracking log');

  } catch (err) {
    console.error('❌ Error saving to tracking log:', err.message);
  }
}

/**
 * Check if daily limit reached
 */
function checkDailyLimit() {
  const log = loadTrackingLog();
  const today = new Date().toISOString().split('T')[0];

  // Reset if new day
  if (log.stats.lastResetDate !== today) {
    return { withinLimit: true, count: 0, maxCount: CONFIG.dailyPostLimit };
  }

  const withinLimit = log.stats.uploadsToday < CONFIG.dailyPostLimit;
  return {
    withinLimit,
    count: log.stats.uploadsToday,
    maxCount: CONFIG.dailyPostLimit,
  };
}

/**
 * Check if video already uploaded (both tracking systems)
 */
function isDuplicate(youtubeId) {
  // Check trending automation tracking
  const trendingLog = loadTrackingLog();
  if (trendingLog.uploadedVideos.some(v => v.youtubeId === youtubeId)) {
    return true;
  }

  // Check youtube_upload.js tracking
  if (fs.existsSync(UPLOADED_VIDEOS_FILE)) {
    try {
      const uploadedVideos = JSON.parse(fs.readFileSync(UPLOADED_VIDEOS_FILE, 'utf-8'));
      if (uploadedVideos.includes(youtubeId)) {
        return true;
      }
    } catch (err) {
      console.error('⚠️ Error checking uploaded videos:', err.message);
    }
  }

  return false;
}

/**
 * Clear old video file
 */
function clearOldVideo() {
  if (fs.existsSync(OUTPUT_PATH)) {
    fs.unlinkSync(OUTPUT_PATH);
    console.log('🗑️ Old video removed:', OUTPUT_FILE_NAME);
  }
}

/**
 * Download YouTube video with cookie authentication
 */
function downloadYouTubeVideo(videoUrl) {
  return new Promise((resolve, reject) => {
    clearOldVideo();
    console.log('⬇️ Downloading video:', videoUrl);

    // Check if cookies file exists (for authenticated downloads)
    const cookiesPath = path.join(__dirname, 'youtube-cookies.txt');
    const hasCookies = fs.existsSync(cookiesPath);

    if (!hasCookies) {
      console.warn('⚠️ No cookies file found. Downloads may fail due to bot detection.');
      console.warn('💡 Add youtube-cookies.txt file to authenticate downloads.');
    }

    // Enhanced yt-dlp command with cookie authentication and proxy support
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

    const command = [
      'yt-dlp',
      '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"',  // Prefer MP4, fallback to any format
      '--merge-output-format mp4',
      hasCookies ? `--cookies "${cookiesPath}"` : '',  // Use cookies if available
      proxyUrl ? `--proxy "${proxyUrl}"` : '',  // Use proxy if available (CRITICAL for Render)
      '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
      // CRITICAL: Don't use android client with cookies (it doesn't support cookies)
      hasCookies ? '--extractor-args "youtube:player_client=web"' : '--extractor-args "youtube:player_client=android"',
      '--no-check-certificates',
      '--sleep-requests 1',
      '--retries 10',  // More retries
      '--fragment-retries 10',
      '--socket-timeout 30',
      '--referer "https://www.youtube.com/"',
      '--add-header "Accept-Language:en-US,en;q=0.9"',
      '--add-header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"',
      `-o "${OUTPUT_PATH}"`,
      `"${videoUrl}"`
    ].filter(Boolean).join(' ');  // Remove empty strings

    console.log('🔧 Using proxy:', proxyUrl ? 'YES ✅' : 'NO ⚠️ (downloads may fail)');
    console.log('🔧 Using cookies:', hasCookies ? 'YES ✅' : 'NO ⚠️');

    exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error downloading video: ${stderr}`);
        if (stderr.includes('Sign in to confirm') || stderr.includes('429')) {
          console.error('');
          console.error('🚨 AUTHENTICATION REQUIRED:');
          console.error('YouTube is blocking downloads. You need to add cookies.');
          console.error('');
          console.error('📖 How to fix:');
          console.error('1. Go to https://youtube.com and log in');
          console.error('2. Export cookies using browser extension: "Get cookies.txt LOCALLY"');
          console.error('3. Save as youtube-cookies.txt');
          console.error('4. Upload to Render service root directory');
          console.error('5. Redeploy service');
          console.error('');
        }
        return reject(error);
      }
      console.log(`✅ Download complete: ${OUTPUT_PATH}`);
      resolve(OUTPUT_PATH);
    });
  });
}

/**
 * Comment on Facebook video
 */
async function commentOnFacebookVideo(videoId, message) {
  try {
    const url = `https://graph.facebook.com/v19.0/${videoId}/comments`;
    const res = await axios.post(url, null, {
      params: { access_token: ACCESS_TOKEN, message },
    });
    console.log(`💬 Comment posted on video ${videoId}: "${message}"`);
    return res.data;
  } catch (err) {
    console.error(`❌ Failed to post comment on ${videoId}:`, err.response?.data || err.message);
    return null;
  }
}

/**
 * Upload to Facebook Reels
 */
async function uploadToFacebookReels(videoPath, title, description) {
  try {
    console.log('🚀 Uploading to Facebook Reels...');
    const fileSize = fs.statSync(videoPath).size;
    const startUrl = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/video_reels`;

    // Start upload session
    const startResponse = await axios.post(startUrl, {
      access_token: ACCESS_TOKEN,
      upload_phase: 'start'
    });

    if (!startResponse.data.video_id) throw new Error('Missing video_id from Facebook API!');

    const { video_id } = startResponse.data;
    const uploadUrl = `https://rupload.facebook.com/video-upload/v19.0/${video_id}`;
    const videoBuffer = fs.readFileSync(videoPath);

    // Upload binary file
    await axios.post(uploadUrl, videoBuffer, {
      headers: {
        Authorization: `OAuth ${ACCESS_TOKEN}`,
        offset: '0',
        'file_size': fileSize,
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream'
      }
    });

    // Finish upload and publish
    const finishParams = {
      access_token: ACCESS_TOKEN,
      video_id: video_id,
      upload_phase: 'finish',
      video_state: 'PUBLISHED',
      title,
      description
    };

    const finishResponse = await axios.post(startUrl, null, { params: finishParams });

    // Check for success:false response
    if (finishResponse?.data && finishResponse.data.success === false) {
      const errMsg = finishResponse.data.error?.message || JSON.stringify(finishResponse.data);
      console.warn('⚠️ Facebook returned success:false on finish:', errMsg);

      if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('supplied user is not the creator')) {
        console.warn('↪️ Skipping this video because the page is not the creator of the video.');
        return { skipImmediate: true };
      }

      return null;
    }

    console.log(`🎉 Reel uploaded successfully! Video ID: ${video_id}`);
    console.log(`🔗 View: https://www.facebook.com/${FACEBOOK_PAGE_ID}/videos/${video_id}`);

    // Comment with Shopee link
    try {
      const shopeeLink = getRandomShopeeLink();
      const message = shopeeLink ? `Support Duterte ${shopeeLink}` : FALLBACK_COMMENT_MESSAGE;
      await commentOnFacebookVideo(video_id, message);
    } catch (e) {
      console.error('❌ Commenting failed but continuing:', e.message || e);
    }

    return { video_id };
  } catch (err) {
    const fbErrData = err.response?.data;
    if (fbErrData) {
      const possibleMsg = fbErrData.error?.message || fbErrData.message || JSON.stringify(fbErrData);
      console.error('❌ Error uploading to Facebook:', possibleMsg);

      if (typeof possibleMsg === 'string' && possibleMsg.toLowerCase().includes('supplied user is not the creator')) {
        console.warn('↪️ Detected "not the creator" error — skipping this video immediately.');
        return { skipImmediate: true };
      }
    } else {
      console.error('❌ Error uploading to Facebook (no response data):', err.message || err);
    }

    return null;
  }
}

/**
 * Get random wait interval
 */
function getRandomInterval() {
  const minWait = CONFIG.minWaitTime;
  const maxWait = CONFIG.maxWaitTime;
  return minWait + Math.floor(Math.random() * (maxWait - minWait));
}

/**
 * Format wait time for display
 */
function formatWaitTime(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

/**
 * Sleep helper
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Main function: Find and upload trending video
 */
async function findAndUploadTrendingVideo() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔥 TRENDING VIDEO AUTOMATION');
    console.log('='.repeat(60));

    // 1. Check daily limit
    const dailyLimit = checkDailyLimit();
    if (!dailyLimit.withinLimit) {
      console.error(`❌ Daily limit reached: ${dailyLimit.count}/${dailyLimit.maxCount}`);
      console.log('⏰ Waiting until midnight...');

      // Wait until midnight
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const msUntilMidnight = tomorrow - now;

      await sleep(msUntilMidnight);
      return;
    }

    console.log(`✅ Daily limit: ${dailyLimit.count}/${dailyLimit.maxCount}`);

    // 2. Search trending videos (English and Tagalog)
    console.log('\n🔍 Searching for trending videos...');
    const videos = await searchTrendingVideos({
      maxResults: 50,
      regionCode: 'PH',
      videoDuration: 'medium',
      hoursAgo: CONFIG.maxVideoAgeHours,
    });

    if (videos.length === 0) {
      console.error('❌ No trending videos found');
      return;
    }

    console.log(`   Found ${videos.length} videos from last ${CONFIG.maxVideoAgeHours} hours`);

    // 3. Enrich with statistics and language info
    console.log('\n📊 Enriching videos with statistics...');
    const enriched = await enrichVideosWithStats(videos);

    if (enriched.length === 0) {
      console.error('❌ No videos after enrichment');
      return;
    }

    // 4. Filter by language (English or Tagalog only)
    console.log('\n🌐 Filtering by language (en/tl/fil)...');
    const languageFiltered = enriched.filter(video => {
      const acceptable = isAcceptableLanguage(video);
      if (!acceptable && !DRY_RUN) {
        const lang = video.snippet?.defaultAudioLanguage || video.snippet?.defaultLanguage || 'unknown';
        console.log(`   ❌ Rejected: "${video.snippet.title}" (language: ${lang})`);
      }
      return acceptable;
    });

    console.log(`   ${languageFiltered.length} videos after language filtering`);

    if (languageFiltered.length === 0) {
      console.error('❌ No videos with acceptable language (en/tl/fil)');
      return;
    }

    // 5. Filter by duration (Shorts - under 2 minutes)
    console.log('\n⏱️ Filtering for Shorts (under 2 minutes)...');
    const durationFiltered = languageFiltered.filter(video => {
      const isShort = isShortVideo(video);
      const duration = video.contentDetails?.duration || 'unknown';
      const seconds = parseDuration(duration);

      console.log(`   ${isShort ? '✅' : '❌'} "${video.snippet.title.substring(0, 50)}..." (${Math.floor(seconds / 60)}m ${seconds % 60}s)`);

      return isShort;
    });

    console.log(`   ${durationFiltered.length} videos are Shorts (under 2 minutes)`);

    if (durationFiltered.length === 0) {
      console.error('❌ No videos under 2 minutes found');
      return;
    }

    // 6. Calculate trending scores and filter by thresholds
    console.log('\n🎯 Filtering by trending thresholds...');
    const trending = filterByTrendingThresholds(durationFiltered, {
      minViews: CONFIG.minViews,
      minViewVelocity: CONFIG.minViewVelocity,
      minEngagementRate: CONFIG.minEngagementRate,
      maxVideoAgeHours: CONFIG.maxVideoAgeHours,
    });

    if (trending.length === 0) {
      console.error('❌ No videos meet trending thresholds');
      console.log(`   Thresholds: ${CONFIG.minViews} views, ${CONFIG.minViewVelocity} views/hr, ${CONFIG.minEngagementRate * 100}% engagement`);
      return;
    }

    console.log(`   ${trending.length} videos meet thresholds`);

    // 7. Check duplicates and find first non-duplicate
    console.log('\n🔍 Checking for duplicates...');
    let selectedVideo = null;
    for (const video of trending) {
      const videoId = video.id.videoId || video.id;
      if (!isDuplicate(videoId)) {
        selectedVideo = video;
        break;
      } else {
        console.log(`   ⏭️ Skipping duplicate: "${video.snippet.title}"`);
      }
    }

    if (!selectedVideo) {
      console.error('❌ All trending videos are duplicates');
      return;
    }

    // Display selected video
    const videoId = selectedVideo.id.videoId || selectedVideo.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const lang = selectedVideo.snippet?.defaultAudioLanguage || selectedVideo.snippet?.defaultLanguage || 'unknown';

    console.log('\n🏆 Selected trending video:');
    console.log('─'.repeat(60));
    console.log(`   Title: ${selectedVideo.snippet.title}`);
    console.log(`   Language: ${lang}`);
    console.log(`   Views: ${parseInt(selectedVideo.statistics.viewCount).toLocaleString()}`);
    console.log(`   View Velocity: ${selectedVideo.viewVelocity.toLocaleString()} views/hour`);
    console.log(`   Engagement Rate: ${(selectedVideo.engagementRate * 100).toFixed(2)}%`);
    console.log(`   Trending Score: ${selectedVideo.trendingScore.toLocaleString()}`);
    console.log(`   URL: ${videoUrl}`);
    console.log('─'.repeat(60));

    // DRY RUN: Stop here
    if (DRY_RUN) {
      console.log('\n✅ [DRY RUN] Would download and upload this video');
      return;
    }

    // 8. Download with yt-dlp
    console.log('\n⬇️ Downloading video...');
    const videoPath = await downloadYouTubeVideo(videoUrl);

    // 9. Upload to Facebook
    console.log('\n🚀 Uploading to Facebook Reels...');
    const title = selectedVideo.snippet.title;
    const description = selectedVideo.snippet.description || '';
    const uploadResult = await uploadToFacebookReels(videoPath, title, description);

    // 10. Track in trending-videos-log.json
    if (uploadResult && uploadResult.video_id) {
      saveToTrackingLog(selectedVideo, true, uploadResult.video_id);
      console.log('✅ Upload cycle completed!');
    } else if (uploadResult && uploadResult.skipImmediate) {
      saveToTrackingLog(selectedVideo, false, null);
      console.log('↪️ Skipped due to "not the creator" error');
    } else {
      saveToTrackingLog(selectedVideo, false, null);
      console.log('❌ Upload failed');
    }

  } catch (err) {
    console.error('❌ Error in findAndUploadTrendingVideo:', err.message || err);
    if (err.stack) console.error(err.stack);
  }
}

/**
 * HTTP Health Check Server (for Render keep-alive)
 */
function startHealthCheckServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'YouTube Trending Automation',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health', (req, res) => {
    res.send('OK');
  });

  app.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
  });
}

/**
 * Main entry point
 */
async function main() {
  // Start health check server for Render
  startHealthCheckServer();

  // Load Shopee links at startup
  cachedShopeeLinks = loadShopeeLinks();
  if (cachedShopeeLinks.length === 0) {
    console.info('ℹ️ No Shopee links found — will use fallback comment message.');
  } else {
    console.info(`ℹ️ Loaded ${cachedShopeeLinks.length} Shopee link(s)`);
  }

  console.log('\n🚀 Starting Trending Video Automation');
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Single: ${SINGLE_POST ? 'YES' : 'NO'}`);
  console.log(`   Daily Limit: ${CONFIG.dailyPostLimit} videos`);
  console.log(`   Wait Time: ${formatWaitTime(CONFIG.minWaitTime)} - ${formatWaitTime(CONFIG.maxWaitTime)}`);
  console.log(`   Min Views: ${CONFIG.minViews.toLocaleString()}`);
  console.log(`   Min View Velocity: ${CONFIG.minViewVelocity.toLocaleString()} views/hour`);
  console.log(`   Min Engagement: ${(CONFIG.minEngagementRate * 100).toFixed(1)}%`);
  console.log(`   Max Video Age: ${CONFIG.maxVideoAgeHours} hours`);
  console.log(`   Languages: ${CONFIG.acceptedLanguages.join(', ')}`);

  if (SINGLE_POST) {
    await findAndUploadTrendingVideo();
  } else {
    while (true) {
      await findAndUploadTrendingVideo();

      const interval = getRandomInterval();
      console.log(`\n⏳ Waiting ${formatWaitTime(interval)} until next cycle...`);
      await sleep(interval);
    }
  }
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err.message || err);
  process.exit(1);
});
