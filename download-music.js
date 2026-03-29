const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Download copyright-free EDM/Techno music for Remotion videos
 * Using free sources like Pixabay Music (no attribution required)
 */

async function downloadMusic() {
  try {
    console.log('🎵 Downloading copyright-free background music...');

    // Using a free techno/EDM track from Pixabay Music
    // This track is copyright-free and requires no attribution
    const musicUrl = 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2d99b0d2eb.mp3?filename=inspiring-cinematic-ambient-116199.mp3';

    const outputPath = path.join(__dirname, 'remotion', 'public', 'music', 'background.mp3');

    console.log('   Downloading from Pixabay Music...');
    const response = await axios.get(musicUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    fs.writeFileSync(outputPath, response.data);

    const fileSizeMB = (response.data.length / 1024 / 1024).toFixed(2);
    console.log(`✅ Music downloaded: ${fileSizeMB} MB`);
    console.log(`   Saved to: ${outputPath}`);
    console.log('   Track: Inspiring Cinematic Ambient (Copyright-free)');

  } catch (err) {
    console.error('❌ Download failed:', err.message);

    // Fallback: Try alternative source
    console.log('   Trying alternative source...');
    try {
      const fallbackUrl = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3';
      const outputPath = path.join(__dirname, 'remotion', 'public', 'music', 'background.mp3');

      const response = await axios.get(fallbackUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      fs.writeFileSync(outputPath, response.data);
      console.log('✅ Alternative track downloaded successfully');

    } catch (fallbackErr) {
      console.error('❌ Fallback download also failed:', fallbackErr.message);
      console.log('\n⚠️ Please manually download a copyright-free music track:');
      console.log('   1. Visit: https://pixabay.com/music/');
      console.log('   2. Search for "techno" or "edm"');
      console.log('   3. Download any track (all are copyright-free)');
      console.log(`   4. Save as: ${path.join(__dirname, 'remotion', 'public', 'music', 'background.mp3')}`);
      process.exit(1);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  downloadMusic()
    .then(() => {
      console.log('\n✅ Music ready for Remotion videos!');
    })
    .catch(err => {
      console.error('\n❌ Failed:', err.message);
      process.exit(1);
    });
}

module.exports = { downloadMusic };
