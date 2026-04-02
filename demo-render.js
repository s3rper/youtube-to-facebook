/**
 * demo-render.js
 * Renders a demo of the high-end NewsHighlightComposition to a local MP4.
 * No API keys or external services needed — pure animation demo.
 *
 * Usage:
 *   node demo-render.js
 */

require('dotenv').config();
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const { bundle }                         = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const { getNewsBackgroundImage }         = require('./image-search-service');

const remotionRoot = path.join(__dirname, 'remotion/index.jsx');
const outputDir    = path.join(__dirname, 'generated_videos');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// ── Demo content (hardcoded so no API calls needed) ──────────────────────────
const DEMO_PROPS = {
  headline:   'Duterte Ipinagtanggol ang Giyera sa Droga sa Senate Hearing',
  bodyLines:  [
    'Inamin ng dating Pangulo na may kamalian sa proseso ng kampanya',
    'Sinabi niya na tama ang layunin — labanan ang krimen at droga',
    'Higit sa 6,000 ang namatay ayon sa opisyal na talaan ng PNP',
  ],
  source:   'Philippine Daily Inquirer',
  category: 'politics',
  cta:      '❤️  I-like at i-share mo ito sa inyong mga kaibigan!',
  backgroundImage: null, // no photo needed for demo — animated gradient bg
};

async function renderDemo() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  🎬  NEWS HIGHLIGHT — Demo Render');
  console.log('════════════════════════════════════════════════════════\n');
  console.log(`  Headline : ${DEMO_PROPS.headline}`);
  console.log(`  Category : ${DEMO_PROPS.category}`);
  console.log(`  Duration : 30 seconds (900 frames @ 30 fps)`);
  console.log(`  Size     : 1080 × 1920  (9:16 portrait)\n`);

  // ── Step 1: Fetch topic-matched background image ────────────────────────
  console.log('🖼️  Fetching topic-matched background image...');
  const bgBuffer = await getNewsBackgroundImage({
    title:       DEMO_PROPS.headline,
    description: DEMO_PROPS.bodyLines.join(' '),
    category:    DEMO_PROPS.category,
    image_url:   null,
  });

  let backgroundImage = null;
  if (bgBuffer) {
    const hash       = crypto.createHash('md5').update(DEMO_PROPS.headline).digest('hex');
    const bgFilename = `${hash}.jpg`;
    const bgDir      = path.join(__dirname, 'remotion/public/backgrounds');
    if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true });
    fs.writeFileSync(path.join(bgDir, bgFilename), bgBuffer);
    backgroundImage = bgFilename;
    console.log(`   ✅ Background image saved: ${bgFilename}\n`);
  } else {
    console.log('   ⚠️  No image found — using animated gradient background\n');
  }

  // Inject into props
  const props = { ...DEMO_PROPS, backgroundImage };

  // ── Step 2: Bundle ──────────────────────────────────────────────────────
  console.log('📦 Bundling Remotion compositions...');
  const bundleLocation = await bundle({
    entryPoint: remotionRoot,
    webpackOverride: (config) => config,
  });
  console.log('   ✅ Bundle ready\n');

  // ── Step 3: Select composition ──────────────────────────────────────────
  const composition = await selectComposition({
    serveUrl:   bundleLocation,
    id:         'NewsHighlight',
    inputProps: props,
  });

  // ── Step 4: Render ──────────────────────────────────────────────────────
  const timestamp  = Date.now();
  const outputPath = path.join(outputDir, `demo_${timestamp}.mp4`);

  console.log('🎥 Rendering video...');
  console.log('   (This typically takes 2–5 minutes depending on your machine)\n');

  const renderStart = Date.now();

  await renderMedia({
    composition,
    serveUrl:       bundleLocation,
    codec:          'h264',
    outputLocation: outputPath,
    inputProps:     props,
    imageFormat:    'jpeg',
    concurrency:    4,
    onProgress: ({ progress }) => {
      const pct  = Math.round(progress * 100);
      const bar  = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
      process.stdout.write(`\r   [${bar}] ${pct}%  `);
    },
  });

  const secs     = ((Date.now() - renderStart) / 1000).toFixed(1);
  const sizeMB   = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);

  console.log(`\n\n════════════════════════════════════════════════════════`);
  console.log(`  ✅  Render complete in ${secs}s`);
  console.log(`  📁  ${outputPath}`);
  console.log(`  📦  ${sizeMB} MB`);
  console.log(`════════════════════════════════════════════════════════\n`);
  console.log('  Open the file to review the animation.');
  console.log('  Run  node demo-render.js  again for a fresh render.\n');

  return outputPath;
}

renderDemo().catch(err => {
  console.error('\n❌ Demo render failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
