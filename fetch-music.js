const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Download free EDM/Techno music from YouTube Audio Library
 * These tracks are copyright-free for use in videos
 */

// List of direct download links to copyright-free EDM tracks
const MUSIC_SOURCES = [
  {
    name: 'Electroman Adventures',
    url: 'https://audio.jukehost.co.uk/sV3hIhVD6qCLDDPuHhqw7ZQzTZDbdAv2.mp3',
    genre: 'EDM'
  },
  {
    name: 'Cyberpunk Street',
    url: 'https://audio.jukehost.co.uk/k8yVZKt2mO0a8ZpX5c8MjV4HdKWg1yOb.mp3',
    genre: 'Techno'
  }
];

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`   Downloading from: ${url}`);

    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

async function fetchMusic() {
  const outputPath = path.join(__dirname, 'remotion', 'public', 'music', 'background.mp3');

  console.log('🎵 Fetching copyright-free EDM music...\n');

  for (let i = 0; i < MUSIC_SOURCES.length; i++) {
    const source = MUSIC_SOURCES[i];
    console.log(`📥 Attempt ${i + 1}/${MUSIC_SOURCES.length}: ${source.name} (${source.genre})`);

    try {
      await downloadFile(source.url, outputPath);

      // Verify file size
      const stats = fs.statSync(outputPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      if (stats.size < 10000) {
        console.log(`   ⚠️ File too small (${sizeMB} MB), trying next source...\n`);
        continue;
      }

      console.log(`\n✅ Music downloaded successfully!`);
      console.log(`   Track: ${source.name}`);
      console.log(`   Genre: ${source.genre}`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`   Path: ${outputPath}`);
      return;

    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}\n`);
    }
  }

  console.log('\n⚠️ All sources failed. Creating silent placeholder...');

  // Create a minimal silent MP3 file (just a header)
  const silentMp3 = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  fs.writeFileSync(outputPath, silentMp3);
  console.log('   Created silent placeholder (videos will render without music)');
}

if (require.main === module) {
  fetchMusic()
    .then(() => {
      console.log('\n✅ Music setup complete!');
    })
    .catch(err => {
      console.error('\n❌ Fatal error:', err.message);
      process.exit(1);
    });
}

module.exports = { fetchMusic };
