require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const API_KEY = 'AIzaSyBaG8pewmNW84w3nw4VG3rY_jL0Slp0ckY';
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
const outputDirectory = __dirname;
const facebookPageId = process.env.FACEBOOK_PAGE_ID;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const uploadedDbFile = path.join(__dirname, 'uploadedVideos.json');

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

// Upload to Facebook Reels
async function uploadToFacebookReels(videoPath, title, description) {
  try {
    console.log('🚀 Uploading to Facebook Reels...');
    const fileSize = fs.statSync(videoPath).size;
    const startUrl = `https://graph.facebook.com/v19.0/${facebookPageId}/video_reels`;

    const startResponse = await axios.post(startUrl, {
      access_token: accessToken,
      upload_phase: 'start'
    });

    if (!startResponse.data.video_id) throw new Error('Missing video_id from Facebook API!');

    const { video_id } = startResponse.data;
    const uploadUrl = `https://rupload.facebook.com/video-upload/v19.0/${video_id}`;
    const videoBuffer = fs.readFileSync(videoPath);

    await axios.post(uploadUrl, videoBuffer, {
      headers: {
        Authorization: `OAuth ${accessToken}`,
        offset: '0',
        'file_size': fileSize,
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream'
      }
    });

    const finishParams = {
      access_token: accessToken,
      video_id: video_id,
      upload_phase: 'finish',
      video_state: 'PUBLISHED',
      title,
      description
    };
    await axios.post(startUrl, null, { params: finishParams });
    console.log(`🎉 Reel uploaded successfully! View: https://www.facebook.com/${facebookPageId}/videos/${video_id}`);
  } catch (err) {
    console.error('❌ Error uploading to Facebook:', err.response ? err.response.data : err.message);
  }
}

// Main loop
async function startLoop() {
  while (true) {
    try {
      const { videoId, videoUrl, title, description } = await fetchRandomShort();
      await downloadYouTubeVideo(videoUrl);
      const videoPath = findMP4File();
      await uploadToFacebookReels(videoPath, title, description);

      saveUploadedVideo(videoId);

      console.log('✅ Upload cycle completed!');
    } catch (err) {
      console.error('❌ Cycle failed:', err.message);
    }

    const interval = 600000 + Math.floor(Math.random() * 600000); // 10–20 min
    console.log(`⏳ Waiting ${Math.floor(interval / 1000)} seconds until next upload...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

// Start continuous uploads
startLoop();
