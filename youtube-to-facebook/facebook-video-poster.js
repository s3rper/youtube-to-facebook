require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

const facebookPageId = process.env.FACEBOOK_PAGE_ID;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

/**
 * Post video to Facebook Page as Reel
 * Based on working 3-phase upload implementation from youtube_upload.js
 *
 * @param {string} videoPath - Path to MP4 video file
 * @param {string} caption - Caption text (with hashtags)
 * @returns {Promise<Object>} - {success, video_id, url, error}
 */
async function postVideoToFacebook(videoPath, caption) {
  try {
    console.log('📤 Uploading video to Facebook Reels...');

    // Validate file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const fileSize = fs.statSync(videoPath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    console.log(`   File size: ${fileSizeMB} MB`);

    // Validate file size (< 1GB)
    if (fileSize > 1024 * 1024 * 1024) {
      throw new Error('Video exceeds 1GB size limit');
    }

    const startUrl = `https://graph.facebook.com/v19.0/${facebookPageId}/video_reels`;

    // ============================================
    // PHASE 1: START - Initialize upload session
    // ============================================
    console.log('   Phase 1: Starting upload session...');

    const startResponse = await axios.post(startUrl, {
      access_token: accessToken,
      upload_phase: 'start'
    });

    if (!startResponse.data.video_id) {
      throw new Error('No video_id returned from Facebook API');
    }

    const { video_id } = startResponse.data;
    console.log(`   Video ID: ${video_id}`);

    // ============================================
    // PHASE 2: RUPLOAD - Upload binary data
    // ============================================
    console.log('   Phase 2: Uploading binary data...');

    const uploadUrl = `https://rupload.facebook.com/video-upload/v19.0/${video_id}`;
    const videoBuffer = fs.readFileSync(videoPath);

    await axios.post(uploadUrl, videoBuffer, {
      headers: {
        'Authorization': `OAuth ${accessToken}`,
        'offset': '0',
        'file_size': fileSize,
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 180000 // 3 minutes timeout
    });

    console.log('   Upload complete');

    // ============================================
    // PHASE 3: FINISH - Publish video
    // ============================================
    console.log('   Phase 3: Publishing video...');

    const finishParams = {
      access_token: accessToken,
      video_id: video_id,
      upload_phase: 'finish',
      video_state: 'PUBLISHED',
      description: caption
    };

    const finishResponse = await axios.post(startUrl, null, {
      params: finishParams
    });

    // Check for Facebook API errors
    if (finishResponse?.data?.success === false) {
      const errMsg = finishResponse.data.error?.message || JSON.stringify(finishResponse.data);
      throw new Error(`Facebook API error: ${errMsg}`);
    }

    const postUrl = `https://www.facebook.com/${facebookPageId}/videos/${video_id}`;

    console.log(`✅ Video posted successfully!`);
    console.log(`   Video ID: ${video_id}`);
    console.log(`   URL: ${postUrl}`);

    return {
      success: true,
      video_id: video_id,
      url: postUrl
    };

  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error('❌ Error posting video to Facebook:', errorMsg);

    return {
      success: false,
      error: errorMsg
    };
  }
}

module.exports = {
  postVideoToFacebook
};

// Test if running directly
if (require.main === module) {
  console.log('🧪 Testing Facebook Video Poster...\\n');

  // Check for test video argument
  const testVideoPath = process.argv[2];

  if (!testVideoPath) {
    console.error('❌ Usage: node facebook-video-poster.js <path-to-test-video.mp4>');
    process.exit(1);
  }

  if (!fs.existsSync(testVideoPath)) {
    console.error(`❌ Video file not found: ${testVideoPath}`);
    process.exit(1);
  }

  const testCaption = `Test video upload for Duterte politics automation.

#Duterte #FPRRD #Philippines #Politics #Test`;

  postVideoToFacebook(testVideoPath, testCaption)
    .then(result => {
      if (result.success) {
        console.log('\\n✅ Test complete!');
        console.log(`Video posted: ${result.url}`);
      } else {
        console.error('\\n❌ Test failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('\\n❌ Test failed:', err.message);
      process.exit(1);
    });
}
