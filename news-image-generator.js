require('dotenv').config();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const outputDir = path.join(__dirname, 'generated_images');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Creative gradient color schemes - will be randomly selected
const CREATIVE_GRADIENTS = [
  // Blue variants
  ['#1e3a8a', '#3b82f6'],     // Deep blue to bright blue
  ['#1e40af', '#60a5fa'],     // Royal blue to sky blue
  ['#0c4a6e', '#0ea5e9'],     // Navy to cyan
  ['#1e293b', '#475569'],     // Slate dark to gray

  // Purple/Pink variants
  ['#581c87', '#a855f7'],     // Deep purple to bright purple
  ['#701a75', '#d946ef'],     // Magenta to pink
  ['#831843', '#ec4899'],     // Rose dark to pink

  // Red/Orange variants
  ['#dc2626', '#ef4444'],     // Red urgent
  ['#c2410c', '#f97316'],     // Orange dark to bright
  ['#991b1b', '#f87171'],     // Dark red to light red

  // Green/Teal variants
  ['#065f46', '#10b981'],     // Emerald
  ['#134e4a', '#14b8a6'],     // Teal
  ['#064e3b', '#34d399'],     // Green mint

  // Unique combinations
  ['#4c1d95', '#7c3aed'],     // Violet
  ['#6b21a8', '#a78bfa'],     // Purple light
  ['#92400e', '#fb923c'],     // Amber
  ['#713f12', '#fbbf24'],     // Yellow dark
];

// News category badges (emojis removed to avoid font rendering issues)
const NEWS_BADGES = {
  breaking: 'BREAKING NEWS!',
  politics: 'Breaking News!',
  global: 'Breaking News!',
  economy: 'Breaking News!',
  default: 'Breaking News!'
};

/**
 * Helper: Escape XML special characters
 */
function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a news quote image with gradient background
 * @param {string} headline - News headline
 * @param {string} newsCategory - Category: breaking, politics, global, economy
 * @param {string} outputPath - Optional custom output path
 * @returns {string} - Path to generated image
 */
async function createNewsQuoteImage(headline, newsCategory = 'default', outputPath = null) {
  try {
    // Get badge
    const badge = NEWS_BADGES[newsCategory] || NEWS_BADGES.default;

    // Randomly select a creative gradient for unique backgrounds
    const randomIndex = Math.floor(Math.random() * CREATIVE_GRADIENTS.length);
    const gradient = CREATIVE_GRADIENTS[randomIndex];

    // Randomly select gradient direction for more variety
    const directions = [
      { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },  // Diagonal top-left to bottom-right
      { x1: '100%', y1: '0%', x2: '0%', y2: '100%' },  // Diagonal top-right to bottom-left
      { x1: '0%', y1: '0%', x2: '100%', y2: '0%' },    // Horizontal left to right
      { x1: '0%', y1: '0%', x2: '0%', y2: '100%' },    // Vertical top to bottom
      { x1: '50%', y1: '0%', x2: '50%', y2: '100%' },  // Vertical center
    ];
    const direction = directions[Math.floor(Math.random() * directions.length)];

    // Don't truncate headline - let wrapping handle it
    // Max 150 chars to prevent extremely long headlines
    let formattedHeadline = headline;
    if (formattedHeadline.length > 150) {
      formattedHeadline = formattedHeadline.substring(0, 147) + '...';
    }

    // Combine badge and headline with proper spacing
    const fullText = `${badge}

${formattedHeadline}`;

    // Clean and escape text
    const cleanText = escapeXml(fullText);

    // Image dimensions - SQUARE format optimized for mobile (1:1 aspect ratio)
    const width = 1080;
    const height = 1080;

    // Wrap text to fit within image - FEWER chars per line for mobile readability
    const maxCharsPerLine = 30;  // Reduced from 50 to 30 for bigger text
    const textParts = cleanText.split('\n'); // Split by newlines first
    const lines = [];

    textParts.forEach(part => {
      if (part.trim() === '') {
        // Empty line - add a blank line for spacing
        lines.push('');
      } else {
        // Wrap this part into multiple lines if needed
        const words = part.split(' ');
        let currentLine = '';

        words.forEach(word => {
          if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        if (currentLine) lines.push(currentLine);
      }
    });

    // Limit to 8 lines max (increased from 6 since we have more vertical space)
    const displayLines = lines.slice(0, 8);

    // MOBILE-OPTIMIZED FONT SIZES (much larger!)
    const badgeFontSize = 68;   // Badge is EXTRA large (first line)
    const fontSize = 56;        // Headline text (regular)
    const badgeLineHeight = 90; // Extra spacing after badge
    const lineHeight = 75;      // Spacing between headline lines

    // Calculate total height and starting position
    const totalHeight = (displayLines.length > 1)
      ? badgeLineHeight + ((displayLines.length - 1) * lineHeight)
      : badgeLineHeight;
    const startY = (height - totalHeight) / 2 + 50;

    // Create SVG text elements with DIFFERENT sizes for badge vs headline
    const textElements = displayLines.map((line, i) => {
      let y, size, spacing;

      if (i === 0) {
        // First line is the badge - LARGER
        y = startY;
        size = badgeFontSize;
        spacing = badgeLineHeight;
      } else if (i === 1 && line.trim() === '') {
        // Skip empty line (spacing between badge and headline)
        return '';
      } else {
        // Headline lines - regular size
        const adjustedIndex = (displayLines[1] && displayLines[1].trim() === '') ? i - 1 : i;
        y = startY + badgeLineHeight + ((adjustedIndex - 1) * lineHeight);
        size = fontSize;
      }

      return `<text x="50%" y="${y}" text-anchor="middle" fill="white" font-size="${size}" font-family="Arial, sans-serif" font-weight="bold">${line}</text>`;
    }).filter(t => t !== '').join('\n    ');

    // Create SVG with dynamic gradient direction and text
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="${direction.x1}" y1="${direction.y1}" x2="${direction.x2}" y2="${direction.y2}">
      <stop offset="0%" style="stop-color:${gradient[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${gradient[1]};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad1)" />
  ${textElements}
  <text x="50%" y="${height - 50}" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="32" font-family="Arial, sans-serif" font-weight="bold">Philippines News</text>
</svg>`;

    // Determine output path
    if (!outputPath) {
      const timestamp = Date.now();
      outputPath = path.join(outputDir, `news_${timestamp}_${newsCategory}.png`);
    }

    // Convert SVG to PNG using Sharp
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✅ News quote image created: ${path.basename(outputPath)}`);
    console.log(`   Category: ${newsCategory} (${badge})`);

    return outputPath;

  } catch (err) {
    console.error('❌ News quote image creation error:', err.message);
    throw err;
  }
}

/**
 * Clean up old generated news images (keep last N)
 * @param {number} keepCount - Number of recent images to keep (default: 20)
 */
function cleanupOldNewsImages(keepCount = 20) {
  try {
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('news_') && f.endsWith('.png'))
      .map(f => ({
        name: f,
        path: path.join(outputDir, f),
        time: fs.statSync(path.join(outputDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort newest first

    // Keep only last N images
    if (files.length > keepCount) {
      const filesToDelete = files.slice(keepCount);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Deleted old news image: ${file.name}`);
      });

      console.log(`✅ Cleanup complete: Kept ${keepCount} recent images, deleted ${filesToDelete.length}`);
    } else {
      console.log(`ℹ️ No cleanup needed: ${files.length} images (limit: ${keepCount})`);
    }

  } catch (err) {
    console.error('❌ Cleanup error:', err.message);
  }
}

/**
 * Test function: Generate sample images for all categories
 */
async function testAllCategories() {
  console.log('🧪 Testing news image generator with all categories...\n');

  const testHeadlines = {
    breaking: 'Breaking: Major development in Manila traffic crisis',
    politics: 'Senate approves new infrastructure bill for 2026',
    global: 'ASEAN summit discusses regional security cooperation',
    economy: 'Philippine peso strengthens against US dollar'
  };

  for (const [category, headline] of Object.entries(testHeadlines)) {
    try {
      console.log(`\n📸 Generating ${category} image...`);
      await createNewsQuoteImage(headline, category);
    } catch (err) {
      console.error(`❌ Failed to create ${category} image:`, err.message);
    }
  }

  console.log('\n✅ Test complete! Check generated_images/ folder');
}

module.exports = {
  createNewsQuoteImage,
  cleanupOldNewsImages,
  testAllCategories
};

// Test if running directly
if (require.main === module) {
  testAllCategories()
    .then(() => {
      console.log('\n🎨 All test images created successfully!');
    })
    .catch(err => {
      console.error('\n❌ Test failed:', err.message);
    });
}
