require('dotenv').config();
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ── Canvas dimensions (9:16 portrait, mobile-optimised) ─────────────────────
const W       = 1080;   // width
const H       = 1920;   // height (9:16)
const PHOTO_H = 960;    // photo fills top half

// ── Output directory ─────────────────────────────────────────────────────────
const outputDir = path.join(__dirname, 'generated_images');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// ── Brand config (set these in .env) ────────────────────────────────────────
const BRAND_NAME      = process.env.BRAND_NAME      || 'NEWS';
const BRAND_WEBSITE   = process.env.BRAND_WEBSITE   || 'www.smartly.sale';
const BRAND_INSTAGRAM = process.env.BRAND_INSTAGRAM || '@reelsdailydose';
const BRAND_FACEBOOK  = process.env.BRAND_FACEBOOK  || '@reelsdailydose';

// ── Layout constants ─────────────────────────────────────────────────────────
const CIRCLE_CY   = PHOTO_H;      // 960 — circles straddle photo / panel border
const YES_CX      = 310;
const NO_CX       = 760;
const CIRCLE_R    = 95;
const LABEL_Y     = CIRCLE_CY + CIRCLE_R + 42;   // 1097 — label below circle
const PANEL_END   = 1820;
const FOOTER_H    = H - PANEL_END;                // 100
const MARGIN      = 90;                            // left/right text margin (px)
const TEXT_W      = W - 2 * MARGIN;               // 900px available for text
const TEXT_TOP    = LABEL_Y + 35;                 // ~1132
const TEXT_BOTTOM = PANEL_END - 35;               // ~1785
const TEXT_CX     = W / 2;                        // 540 (horizontal centre)
const TEXT_CENTER = (TEXT_TOP + TEXT_BOTTOM) / 2; // vertical centre of text area

// ── Helpers ──────────────────────────────────────────────────────────────────
function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wrap question into lines using a char-budget that adapts to word length.
 * Tries 3-line wrap first; falls back to 4 lines for very long questions.
 * Last line gets '…' if still truncated.
 */
function wrapPollText(question) {
  // Try progressively larger budgets until we get ≤ 3 lines or hit the cap
  for (const maxChars of [18, 20, 22, 24, 26]) {
    const words = question.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if (!cur) { cur = w; }
      else if ((cur + ' ' + w).length <= maxChars) { cur += ' ' + w; }
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);

    if (lines.length <= 3) return lines;
    if (maxChars === 26) {
      // Hard cap at 4 lines with truncation
      const t = lines.slice(0, 4);
      const last = t[3];
      t[3] = last.length < 26 ? last + '…' : last.slice(0, 25) + '…';
      return t;
    }
  }
  return [question]; // fallback: single long line (font will auto-shrink)
}

/**
 * Compute the optimal font size and line height for the wrapped lines.
 *
 * Rules:
 *  - Base size depends on line count (fewer lines = bigger text)
 *  - Size is reduced further if the longest line's estimated pixel width
 *    would exceed TEXT_W (900px) — keeps text inside the margins
 *  - Arial Bold character width ≈ fontSize × 0.54 (conservative estimate)
 *  - Minimum font size: 54px
 */
function computeLayout(lines) {
  const n = Math.min(lines.length, 4);
  const maxByLines = { 1: 112, 2: 100, 3: 88, 4: 74 };
  const base = maxByLines[n] || 74;

  // Longest line drives the width constraint
  const longest = lines.reduce((a, b) => a.length > b.length ? a : b, '');
  const charWidthRatio = 0.54;   // Arial Bold px-per-char / fontSize
  const maxByWidth = Math.floor(TEXT_W / (longest.length * charWidthRatio));

  const fontSize   = Math.max(Math.min(base, maxByWidth), 54);
  const lineHeight = Math.round(fontSize * 1.26);

  return { fontSize, lineHeight };
}

// ── SVG builder ───────────────────────────────────────────────────────────────
/**
 * Build SVG overlay (1080 × 1920).
 * Always composited on top of a real photo in the top half.
 * Uses a gradient overlay (transparent → dark) so the photo shows through.
 *
 * Layout:
 *   y=0       → PHOTO_H(960)    Photo area  — gradient overlay + brand logo
 *   y=PHOTO_H → PANEL_END(1820) Dark panel  — emoji buttons + poll question
 *   y=1820    → H(1920)         Footer bar  — social handles
 */
function buildPollSvg(pollQuestion) {
  const lines              = wrapPollText(pollQuestion);
  const { fontSize, lineHeight } = computeLayout(lines);
  const n                  = lines.length;

  // Vertically centre the text block within the text area
  const blockH = (n - 1) * lineHeight + fontSize;
  const startY = Math.round(TEXT_CENTER - blockH / 2 + fontSize * 0.82);

  // Each line is centred at x=540; font size is already shrunk to honour margins
  const questionLines = lines.map((line, i) =>
    `<text x="${TEXT_CX}" y="${startY + i * lineHeight}" ` +
    `text-anchor="middle" fill="white" ` +
    `font-family="Arial, sans-serif" font-weight="bold" ` +
    `font-size="${fontSize}">${escapeXml(line)}</text>`
  ).join('\n  ');

  // Gradient overlay: photo visible at top, fades to dark at bottom (blends into panel)
  const topBg = `<defs>
    <linearGradient id="photoFade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   style="stop-color:#000000;stop-opacity:0.10"/>
      <stop offset="55%"  style="stop-color:#000000;stop-opacity:0.40"/>
      <stop offset="100%" style="stop-color:#000000;stop-opacity:0.82"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${W}" height="${PHOTO_H}" fill="url(#photoFade)"/>`;

  // ── YES button — red circle + white heart ────────────────────────────────
  const hx = YES_CX, hy = CIRCLE_CY;
  const heartPath =
    `M${hx} ${hy - 32} ` +
    `C${hx + 9} ${hy - 58} ${hx + 70} ${hy - 58} ${hx + 70} ${hy - 10} ` +
    `C${hx + 70} ${hy + 24} ${hx + 36} ${hy + 46} ${hx} ${hy + 66} ` +
    `C${hx - 36} ${hy + 46} ${hx - 70} ${hy + 24} ${hx - 70} ${hy - 10} ` +
    `C${hx - 70} ${hy - 58} ${hx - 9} ${hy - 58} ${hx} ${hy - 32} Z`;

  // ── NO button — yellow circle + laughing face ────────────────────────────
  // All coords relative to NO circle (cx=NO_CX=760, cy=CIRCLE_CY=960)
  const nx = NO_CX, ny = CIRCLE_CY;
  const eyeStroke  = 8;
  const leyL = nx - 56, leyR = nx - 16, leyCtrlX = nx - 36, leyCtrlY = ny - 38;
  const reyL = nx + 16, reyR = nx + 56, reyCtrlX = nx + 36, reyCtrlY = ny - 38;
  const mouthL = nx - 62, mouthR = nx + 62, mouthTopY = ny + 18;
  const mouthBotY = ny + 72, mouthMidCY = ny + 58;
  const teethH = 26;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">

  <!-- ── TOP AREA ──────────────────────────────────────────────── -->
  ${topBg}

  <!-- ── BRAND LOGO ────────────────────────────────────────────── -->
  <rect x="32" y="32" width="134" height="78" rx="9" fill="#e0163b"/>
  <text x="99" y="86" text-anchor="middle" fill="white"
        font-family="Arial, sans-serif" font-weight="bold" font-size="46">
    ${escapeXml(BRAND_NAME)}
  </text>

  <!-- ── DARK PANEL ────────────────────────────────────────────── -->
  <rect x="0" y="${PHOTO_H}" width="${W}" height="${PANEL_END - PHOTO_H}" fill="#111111"/>

  <!-- ── YES BUTTON ────────────────────────────────────────────── -->
  <circle cx="${YES_CX}" cy="${CIRCLE_CY}" r="${CIRCLE_R}" fill="#e0163b"/>
  <path d="${heartPath}" fill="white"/>
  <text x="${YES_CX}" y="${LABEL_Y}" text-anchor="middle" fill="white"
        font-family="Arial, sans-serif" font-weight="bold" font-size="46">Yes</text>

  <!-- ── NO BUTTON ─────────────────────────────────────────────── -->
  <circle cx="${NO_CX}" cy="${CIRCLE_CY}" r="${CIRCLE_R}" fill="#FFD700"/>
  <!-- squinting left eye -->
  <path d="M ${leyL} ${ny - 14} Q ${leyCtrlX} ${leyCtrlY} ${leyR} ${ny - 14}"
        stroke="#2d1a00" stroke-width="${eyeStroke}" fill="none" stroke-linecap="round"/>
  <!-- squinting right eye -->
  <path d="M ${reyL} ${ny - 14} Q ${reyCtrlX} ${reyCtrlY} ${reyR} ${ny - 14}"
        stroke="#2d1a00" stroke-width="${eyeStroke}" fill="none" stroke-linecap="round"/>
  <!-- open mouth (dark background) -->
  <path d="M ${mouthL} ${mouthTopY} Q ${nx} ${mouthBotY} ${mouthR} ${mouthTopY}
           L ${mouthR} ${mouthTopY + 22} Q ${nx} ${mouthMidCY} ${mouthL} ${mouthTopY + 22} Z"
        fill="#2d1a00"/>
  <!-- white teeth -->
  <rect x="${mouthL + 1}" y="${mouthTopY}" width="${mouthR - mouthL - 2}" height="${teethH}"
        rx="5" fill="white"/>
  <!-- rosy cheeks -->
  <ellipse cx="${nx - 76}" cy="${ny + 6}" rx="20" ry="13" fill="rgba(255,80,80,0.44)"/>
  <ellipse cx="${nx + 76}" cy="${ny + 6}" rx="20" ry="13" fill="rgba(255,80,80,0.44)"/>
  <text x="${NO_CX}" y="${LABEL_Y}" text-anchor="middle" fill="white"
        font-family="Arial, sans-serif" font-weight="bold" font-size="46">No</text>

  <!-- ── POLL QUESTION TEXT ─────────────────────────────────────── -->
  ${questionLines}

  <!-- ── FOOTER BAR ────────────────────────────────────────────── -->
  <rect x="0" y="${PANEL_END}" width="${W}" height="${FOOTER_H}" fill="#1a1a1a"/>
  <line x1="375" y1="${PANEL_END + 18}" x2="375" y2="${H - 18}"
        stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
  <line x1="705" y1="${PANEL_END + 18}" x2="705" y2="${H - 18}"
        stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
  <text x="187" y="${PANEL_END + 60}" text-anchor="middle"
        fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="26">
    ${escapeXml(BRAND_WEBSITE)}
  </text>
  <text x="540" y="${PANEL_END + 60}" text-anchor="middle"
        fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="26">
    ${escapeXml(BRAND_INSTAGRAM)}
  </text>
  <text x="893" y="${PANEL_END + 60}" text-anchor="middle"
        fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="26">
    ${escapeXml(BRAND_FACEBOOK)}
  </text>

</svg>`;
}

// ── Main image creator ────────────────────────────────────────────────────────
/**
 * Create a 9:16 portrait poll image (1080 × 1920).
 * Photo occupies the top 960px with a gradient overlay.
 * If no photo buffer is supplied, one is auto-fetched from Lorem Picsum.
 *
 * @param {string}      pollQuestion    - Tagalog YES/NO question (dynamic from news)
 * @param {Buffer|null} backgroundImage - Pexels photo buffer or null (auto-fetches Picsum)
 * @param {string|null} outputPath      - Custom path or null for auto-name
 * @returns {Promise<string>}           - Absolute path to PNG
 */
async function createPollImage(pollQuestion, backgroundImage = null, outputPath = null) {
  const filePath = outputPath || path.join(outputDir, `poll_${Date.now()}.png`);

  // ── Always ensure a photo for the top half ───────────────────────────────
  let photoBuffer = backgroundImage;
  if (!photoBuffer) {
    console.log('   📷 No photo provided — fetching from Lorem Picsum...');
    try {
      const seed = Math.floor(Math.random() * 1000);
      const resp = await axios.get(
        `https://picsum.photos/${W}/${PHOTO_H}?random=${seed}`,
        { responseType: 'arraybuffer', timeout: 15000, maxRedirects: 5 }
      );
      photoBuffer = Buffer.from(resp.data);
      console.log('   ✅ Picsum photo fetched');
    } catch (err) {
      console.warn('   ⚠️ Picsum fetch failed, using dark gradient fallback');
    }
  }

  const svgBuffer = Buffer.from(buildPollSvg(pollQuestion));

  if (photoBuffer) {
    // ── Photo path: top half = photo, bottom = dark panel ─────────────────
    // 1. Resize photo to exactly 1080 × 960
    const photoTop = await sharp(photoBuffer)
      .resize(W, PHOTO_H, { fit: 'cover', position: 'attention' })
      .png()
      .toBuffer();

    // 2. Full 1080 × 1920 dark canvas as base
    const canvas = await sharp({
      create: { width: W, height: H, channels: 3, background: { r: 17, g: 17, b: 17 } }
    }).png().toBuffer();

    // 3. Composite: dark base → photo at top → SVG overlay (gradient fade + UI)
    await sharp(canvas)
      .composite([
        { input: photoTop, top: 0, left: 0 },
        { input: svgBuffer, top: 0, left: 0, blend: 'over' }
      ])
      .png()
      .toFile(filePath);

  } else {
    // ── Pure gradient fallback (no network, rare) ──────────────────────────
    const fallbackSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   style="stop-color:#1a3a5c;stop-opacity:1"/>
      <stop offset="50%"  style="stop-color:#111111;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#0d0d0d;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
</svg>`;
    const bgBuf = await sharp(Buffer.from(fallbackSvg)).png().toBuffer();
    await sharp(bgBuf)
      .composite([{ input: svgBuffer, blend: 'over' }])
      .png()
      .toFile(filePath);
  }

  console.log(`✅ Poll image created: ${filePath}`);
  return filePath;
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
function cleanupOldPollImages(keepCount = 20) {
  try {
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('poll_') && f.endsWith('.png'))
      .map(f => ({ f, p: path.join(outputDir, f), t: fs.statSync(path.join(outputDir, f)).mtime.getTime() }))
      .sort((a, b) => b.t - a.t);
    if (files.length > keepCount) {
      files.slice(keepCount).forEach(({ p }) => fs.unlinkSync(p));
      console.log(`🗑️ Cleaned up ${files.length - keepCount} old poll images`);
    }
  } catch (err) {
    console.error('❌ Poll image cleanup error:', err.message);
  }
}

module.exports = { createPollImage, cleanupOldPollImages };

// ── Quick test ────────────────────────────────────────────────────────────────
// In production, pollQuestion is generated dynamically by generatePollQuestion()
// in ai-content-generator.js, based on the fetched trending news item.
// The backgroundImage is fetched by getNewsBackgroundImage() in image-search-service.js.
if (require.main === module) {
  const q = process.argv[2] || 'Sang-ayon ka ba sa ginawang pag-impeach ng House kay VP Sara?';
  console.log('🧪 Testing poll image generator (9:16 portrait)...\n');
  console.log(`Question: "${q}"`);
  console.log('Note: backgroundImage=null → will auto-fetch from Picsum\n');
  createPollImage(q, null)
    .then(p => console.log(`\n✅ Done: ${p}`))
    .catch(e => console.error('\n❌ Failed:', e.message));
}
