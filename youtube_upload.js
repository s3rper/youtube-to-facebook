require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const express = require('express');

//const API_KEY = 'AIzaSyCkhnbr6qOos1cUEEbRHHsevakJJte5CYo';
//const API_KEY = 'AIzaSyAgfCknsb2EjgK0TvvGKZAoQpwksLmgD1Y';
const API_KEY = 'AIzaSyC1WOaBUki-QmXnkeGUdTW1t-sq3PiBiCU';

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


const topics = [
  'duterte+shorts', 'FPRRD+shorts', 'duterte+speech+shorts', 'duterte+quotes+shorts',
  'duterte+news+shorts', 'duterte+policies+shorts', 'duterte+interview+shorts', 'duterte+rally+shorts',
  'duterte+reaction+shorts', 'duterte+funny+moments+shorts', 'duterte+viral+shorts', 'duterte+short+clips+shorts',
  'duterte+trending+shorts', 'duterte+highlights+shorts', 'duterte+latest+shorts', 'duterte+updates+shorts',
  'duterte+FPRRD+shorts', 'duterte+announcements+shorts', 'duterte+address+shorts', 'duterte+debates+shorts'
];

const maxResults = 50;
const relevanceLanguage = 'en';
const regionCode = 'US';
const outputFileName = "youtube_video.mp4";
const outputPath = path.join(__dirname, outputFileName);
const facebookPageId = process.env.FACEBOOK_PAGE_ID;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const uploadedDbFile = path.join(__dirname, 'uploadedVideos.json');

// Original fallback comment used if no shopeed link found
const FALLBACK_COMMENT_MESSAGE = "Please follow and subscribe https://www.facebook.com/reelsdailydose";

// Shopee list file (expected in same folder)
const shopeeListFile = path.join(__dirname, 'duterte-shopee-list.json');

// Cache of extracted Shopee links
let cachedShopeeLinks = [];

/**
 * Load and parse duterte-shopee-list.json and extract productOfferLink values.
 * Also scans for any Shopee URLs in the file content as a fallback.
 */
function loadShopeeLinks() {
  try {
    if (!fs.existsSync(shopeeListFile)) {
      console.warn('⚠️ Shopee list file not found:', shopeeListFile);
      return [];
    }

    const raw = fs.readFileSync(shopeeListFile, 'utf-8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // If it's not valid JSON, still attempt to find URLs inside the raw text
      parsed = null;
    }

    const links = new Set();

    // If parsed is an array or object, try to pull productOfferLink recursively
    function extractFromObject(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (!val) continue;
        if (typeof val === 'string') {
          // common property name
          if (key.toLowerCase().includes('productofferlink')) {
            if (val.includes('shopee')) links.add(val);
          }
          // also check if string contains a shopee url
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

    // Fallback: scan raw file for any shopee links (works if JSON keys are different)
    const rawMatches = raw.match(/https?:\/\/[^\s"'\\]+shopee\.[^\s"'\\]+/gi);
    if (rawMatches) rawMatches.forEach(u => links.add(u));

    // Convert to array and return
    return Array.from(links);
  } catch (err) {
    console.error('❌ Failed to load or parse shopee list file:', err.message || err);
    return [];
  }
}

// Initialize cache once at startup
cachedShopeeLinks = loadShopeeLinks();
if (cachedShopeeLinks.length === 0) {
  console.info('ℹ️ No Shopee links found in duterte-shopee-list.json — will use fallback comment message.');
} else {
  console.info(`ℹ️ Loaded ${cachedShopeeLinks.length} Shopee link(s) from duterte-shopee-list.json`);
}

// Load previously uploaded video IDs
function loadUploadedVideos() {
  if (fs.existsSync(uploadedDbFile)) {
    return JSON.parse(fs.readFileSync(uploadedDbFile, 'utf-8'));
  }
  return [];
}

// Save newly uploaded video ID
function saveUploadedVideo(videoId) {
  const uploaded = loadUploadedVideos();
  uploaded.push(videoId);
  fs.writeFileSync(uploadedDbFile, JSON.stringify(uploaded, null, 2));
}

// Remove URLs from text
function removeLinks(text) {
  if (!text) return '';
  return text.replace(/https?:\/\/[^\s]+/g, '').trim();
}

// Pick random topic & fetch Shorts
async function fetchRandomShort() {
  const uploaded = loadUploadedVideos();
  let attempts = 0;

  while (attempts < 5) {
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const query = `${randomTopic}`;

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}&relevanceLanguage=${relevanceLanguage}&regionCode=${regionCode}&key=${API_KEY}`;

    const res = await axios.get(url);
    const items = res.data.items;

    if (!items || items.length === 0) {
      attempts++;
      continue;
    }

    const video = items.find(item => !uploaded.includes(item.id.videoId));
    if (video) {
      const videoUrl = `https://www.youtube.com/shorts/${video.id.videoId}`;
      const title = video.snippet.title;
      // Clean description from links
      const description = removeLinks(video.snippet.description);
      return { videoId: video.id.videoId, videoUrl, title, description };
    }

    attempts++;
  }

  throw new Error('No new Shorts found after multiple attempts.');
}

// Delete old video before downloading new one
function clearOldVideo() {
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log('🗑️ Old video removed:', outputFileName);
  }
}

// Download YouTube video with cookie authentication
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

    // Enhanced yt-dlp command with cookie authentication
    const command = [
      'yt-dlp',
      '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"',  // Prefer MP4
      '--merge-output-format mp4',
      hasCookies ? `--cookies "${cookiesPath}"` : '',  // Use cookies if available
      '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
      '--extractor-args "youtube:player_client=android,web"',  // Try multiple clients
      '--no-check-certificates',
      '--sleep-requests 1',
      '--retries 10',  // More retries
      '--fragment-retries 10',
      '--socket-timeout 30',
      '--referer "https://www.youtube.com/"',
      '--add-header "Accept-Language:en-US,en;q=0.9"',
      '--add-header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"',
      `-o "${outputPath}"`,
      `"${videoUrl}"`
    ].filter(Boolean).join(' ');  // Remove empty strings

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
      console.log(`✅ Download complete: ${outputPath}`);
      resolve(outputPath);
    });
  });
}

// Find MP4 file
function findMP4File() {
  if (!fs.existsSync(outputPath)) throw new Error('No .mp4 file found!');
  return outputPath;
}

// Helper: get a random shopee link from cache (or reload if cache empty)
function getRandomShopeeLink() {
  if (!cachedShopeeLinks || cachedShopeeLinks.length === 0) {
    // attempt to reload once
    cachedShopeeLinks = loadShopeeLinks();
  }
  if (cachedShopeeLinks && cachedShopeeLinks.length > 0) {
    return cachedShopeeLinks[Math.floor(Math.random() * cachedShopeeLinks.length)];
  }
  return null;
}

// 💬 Comment on Facebook video
async function commentOnFacebookVideo(videoId, message) {
  try {
    const url = `https://graph.facebook.com/v19.0/${videoId}/comments`;
    const res = await axios.post(url, null, {
      params: { access_token: accessToken, message },
    });
    console.log(`💬 Comment posted on video ${videoId}: "${message}"`);
    return res.data;
  } catch (err) {
    console.error(`❌ Failed to post comment on ${videoId}:`, err.response?.data || err.message);
    // don't throw — a comment failure should not stop the cycle
    return null;
  }
}

// Upload to Facebook Reels
// RETURNS:
//  - { video_id: '...' } on success
//  - { skipImmediate: true } when the "Supplied user is not the creator..." error is detected (skip without waiting)
//  - null for other failures (causes normal wait)
async function uploadToFacebookReels(videoPath, title, description) {
  try {
    console.log('🚀 Uploading to Facebook Reels...');
    const fileSize = fs.statSync(videoPath).size;
    const startUrl = `https://graph.facebook.com/v19.0/${facebookPageId}/video_reels`;

    // Start upload session
    const startResponse = await axios.post(startUrl, {
      access_token: accessToken,
      upload_phase: 'start'
    });

    if (!startResponse.data.video_id) throw new Error('Missing video_id from Facebook API!');

    const { video_id } = startResponse.data;
    const uploadUrl = `https://rupload.facebook.com/video-upload/v19.0/${video_id}`;
    const videoBuffer = fs.readFileSync(videoPath);

    // Upload binary file
    await axios.post(uploadUrl, videoBuffer, {
      headers: {
        Authorization: `OAuth ${accessToken}`,
        offset: '0',
        'file_size': fileSize,
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream'
      }
    });

    // Finish upload and publish
    const finishParams = {
      access_token: accessToken,
      video_id: video_id,
      upload_phase: 'finish',
      video_state: 'PUBLISHED',
      title,
      description
    };

    const finishResponse = await axios.post(startUrl, null, { params: finishParams });

    // If Facebook returns a structured error like: { success:false, error:{ message: "Supplied user is not the creator..." } }
    if (finishResponse?.data && finishResponse.data.success === false) {
      const errMsg = finishResponse.data.error?.message || JSON.stringify(finishResponse.data);
      console.warn('⚠️ Facebook returned success:false on finish:', errMsg);

      // detect specific not-creator message (case-insensitive)
      if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('supplied user is not the creator')) {
        console.warn('↪️ Skipping this video because the page is not the creator of the video.');
        // special signal: skip and continue immediately (no wait)
        return { skipImmediate: true };
      }

      // for other success:false cases treat as failure and skip (normal wait)
      return null;
    }

    console.log(`🎉 Reel uploaded successfully! Video ID: ${video_id}`);
    console.log(`🔗 View: https://www.facebook.com/${facebookPageId}/videos/${video_id}`);

    // 💬 Comment automatically after upload (protected)
    try {
      // build comment message using a random Shopee link if available
      const shopeeLink = getRandomShopeeLink();
      const message = shopeeLink ? `Support Duterte ${shopeeLink}` : FALLBACK_COMMENT_MESSAGE;
      await commentOnFacebookVideo(video_id, message);
    } catch (e) {
      console.error('❌ Commenting failed but continuing:', e.message || e);
    }

    return { video_id };
  } catch (err) {
    // inspect Facebook structured error in response body
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

    // For any other error return null so caller can continue to next video after waiting
    return null;
  }
}

// Main loop
async function startLoop() {
  while (true) {
    try {
      const { videoId, videoUrl, title, description } = await fetchRandomShort();
      await downloadYouTubeVideo(videoUrl);
      const videoPath = findMP4File();
      const uploadResult = await uploadToFacebookReels(videoPath, title, description);

      if (uploadResult && uploadResult.video_id) {
        // successful upload
        saveUploadedVideo(videoId);
        console.log('✅ Upload cycle completed and comment added!');
      } else if (uploadResult && uploadResult.skipImmediate) {
        // special case: skip and immediately continue to next video WITHOUT waiting
        console.log('➡️ Skipped this video due to "not the creator" error — continuing immediately to next video.');
        continue; // go to next iteration with no delay
      } else {
        // upload was skipped or failed in a recoverable way — do NOT save the YouTube ID so it can be retried later if desired
        console.log('ℹ️ Upload skipped or failed for this video — will wait normal interval then move to next one.');
      }
    } catch (err) {
      console.error('❌ Cycle failed:', err.message || err);
    }

    // Normal wait interval when not skipping immediately
    const interval = 600000 + Math.floor(Math.random() * 600000); // 10–20 min
    console.log(`⏳ Waiting ${Math.floor(interval / 1000)} seconds until next upload...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * HTTP Health Check Server (for Render keep-alive)
 */
function startHealthCheckServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'YouTube Upload Automation',
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

// Start health check server for Render
startHealthCheckServer();

// Start continuous uploads
startLoop();
