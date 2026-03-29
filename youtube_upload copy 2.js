require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const API_KEY = 'AIzaSyCkhnbr6qOos1cUEEbRHHsevakJJte5CYo';
const topics = [
  'duterte+shorts', 'FPRRD+shorts', 'duterte+speech+shorts', 'duterte+quotes+shorts',
  'duterte+news+shorts', 'duterte+policies+shorts', 'duterte+interview+shorts', 'duterte+rally+shorts',
  'duterte+reaction+shorts', 'duterte+funny+moments+shorts', 'duterte+viral+shorts', 'duterte+short+clips+shorts',
  'duterte+trending+shorts', 'duterte+highlights+shorts', 'duterte+latest+shorts', 'duterte+updates+shorts',
  'duterte+FPRRD+shorts', 'duterte+announcements+shorts', 'duterte+address+shorts', 'duterte+debates+shorts'
];

// const topics = [
//   // Politics & Current Events
//   'duterte+latest+shorts', 'duterte+news+today+shorts', 'duterte+speech+shorts', 
//   'duterte+reaction+shorts', 'duterte+funny+moments+shorts', 'marcos+jr+shorts', 
//   'sara+duterte+shorts', 'bbm+latest+shorts', 'philippine+politics+shorts', 
//   'senate+hearing+shorts', 'duterte+vs+bbm+shorts', 'trillanes+shorts', 'bong+go+shorts',

//   // Trending & Viral Topics
//   'trending+shorts+philippines', 'viral+tiktok+shorts', 'filipino+funny+shorts', 
//   'pinoy+memes+shorts', 'pinoy+reaction+shorts', 'celebrity+news+philippines+shorts', 
//   'showbiz+balita+shorts', 'trending+news+shorts', 'latest+viral+video+shorts',
  
//   // Tech & AI
//   'ai+trending+shorts', 'chatgpt+shorts', 'ai+filipino+shorts', 
//   'artificial+intelligence+news+shorts', 'ai+tools+shorts',
  
//   // Motivation & Lifestyle
//   'motivational+speech+shorts', 'life+advice+shorts', 'success+story+shorts', 
//   'pinoy+entrepreneur+shorts', 'street+interview+philippines+shorts',
  
//   // Funny & Entertainment
//   'pinoy+prank+shorts', 'pinoy+funny+clips+shorts', 'filipino+vlog+shorts', 
//   'pinoy+comedy+shorts', 'funny+animal+shorts', 'viral+reaction+shorts'
// ];


const maxResults = 50;
const relevanceLanguage = 'en';
const regionCode = 'US';
const outputFileName = "youtube_video.mp4";
const outputPath = path.join(__dirname, outputFileName);
const facebookPageId = process.env.FACEBOOK_PAGE_ID;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const uploadedDbFile = path.join(__dirname, 'uploadedVideos.json');
const COMMENT_MESSAGE = "Please follow and subscribe https://www.facebook.com/reelsdailydose";

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

// Download YouTube video
function downloadYouTubeVideo(videoUrl) {
  return new Promise((resolve, reject) => {
    clearOldVideo();
    console.log('⬇️ Downloading video:', videoUrl);
    const command = `yt-dlp -f "bestvideo+bestaudio" --merge-output-format mp4 -o "${outputPath}" ${videoUrl}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error downloading video: ${stderr}`);
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
      await commentOnFacebookVideo(video_id, COMMENT_MESSAGE);
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

// Start continuous uploads
startLoop();
