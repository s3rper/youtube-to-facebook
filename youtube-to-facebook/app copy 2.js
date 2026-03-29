// shopee_video_upload.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');

const facebookPageId = process.env.FACEBOOK_PAGE_ID;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const productsJsonPath = process.env.PRODUCTS_JSON || path.join(__dirname, 'shopee-list.json');
const outputDirectory = process.env.OUTPUT_DIR || path.join(__dirname, 'downloads');
const removeAfterUpload = process.env.REMOVE_AFTER_UPLOAD !== 'false'; // default true

// Install: npm i form-data
const FormData = require('form-data');

if (!facebookPageId || !accessToken) {
  console.error('❌ Please set FACEBOOK_PAGE_ID and FACEBOOK_ACCESS_TOKEN in your .env file');
  process.exit(1);
}

if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

// Helper: read products JSON
function readProducts(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('Products JSON must be an array');
    return data;
  } catch (err) {
    console.error('❌ Error reading products JSON:', err.message);
    process.exit(1);
  }
}

// Helper: pick mp4 url from product object
function getMp4UrlFromProduct(product) {
  try {
    const vil = product.batch_item_for_item_card_full && product.batch_item_for_item_card_full.video_info_list;
    if (!vil || !vil.length) return null;

    const vidObj = vil[0]; // choose first video_info entry
    // prefer formats[0].url if exists and looks like mp4
    if (vidObj.formats && vidObj.formats.length) {
      const fmt = vidObj.formats.find(f => f.url && f.url.endsWith('.mp4')) || vidObj.formats[0];
      if (fmt && fmt.url) return fmt.url;
    }
    // fallback: default_format.url
    if (vidObj.default_format && vidObj.default_format.url) return vidObj.default_format.url;
    // fallback: video_id (not a full url) - ignore
    return null;
  } catch (err) {
    console.warn('⚠️ Error extracting mp4 url for item:', product.item_id, err.message);
    return null;
  }
}

// Download mp4 via streaming axios -> file
async function downloadMp4(url, destPath) {
  console.log(`⬇️  Downloading ${url} -> ${destPath}`);
  const writer = fs.createWriteStream(destPath);

  const res = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    // some shopee cdn endpoints may require headers (referer, user-agent). Add if necessary:
    headers: {
      'User-Agent': 'Mozilla/5.0 (Node.js)'
    },
    timeout: 60_000
  });

  const total = res.headers['content-length'] ? parseInt(res.headers['content-length'], 10) : null;
  let received = 0;
  res.data.on('data', chunk => {
    received += chunk.length;
    if (total) {
      const pct = ((received / total) * 100).toFixed(1);
      process.stdout.write(`\r  Downloaded ${pct}% (${(received / 1024 / 1024).toFixed(2)} MB)`);
    }
  });

  res.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      process.stdout.write('\n');
      console.log(`✅ Downloaded: ${destPath}`);
      resolve(destPath);
    });
    writer.on('error', err => {
      writer.close();
      reject(err);
    });
    res.data.on('error', err => {
      writer.close();
      reject(err);
    });
  });
}

// Upload to Facebook Reels (resumable-ish flow similar to your original)
async function uploadToFacebookReels(videoPath, title = '', description = '') {
    console.log('🚀 Starting Facebook Reel Upload (multipart) for', path.basename(videoPath));
    try {
      const url = `https://graph.facebook.com/v19.0/${facebookPageId}/videos`;
  
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
  
      const form = new FormData();
      form.append('access_token', accessToken);
      form.append('title', title);
      form.append('description', description || '');
      // `source` is the field Facebook expects for the file
      form.append('source', fs.createReadStream(videoPath));
  
      // If you need to set published to true immediately:
      // form.append('published', 'true');
  
      // Axios needs the headers from form
      const headers = form.getHeaders();
      // include content-length to help some servers
      headers['Content-Length'] = await new Promise((resolve, reject) => {
        form.getLength((err, length) => err ? reject(err) : resolve(length));
      });
  
      console.log('⬆️  Uploading to Graph API (multipart)...');
      const resp = await axios.post(url, form, {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 10 * 60_000
      });
  
      // Graph API returns an id for the uploaded video
      const videoId = resp.data && (resp.data.id || resp.data.video_id);
      console.log('✅ Facebook response:', resp.data);
  
      if (!videoId) {
        console.warn('⚠️ No video id returned. Response:', resp.data);
        return { success: false, resp: resp.data };
      }
  
      console.log(`🎉 Uploaded! Video id: ${videoId}`);
      console.log(`▶️ View (may take a few minutes to be published): https://www.facebook.com/${facebookPageId}/videos/${videoId}`);
      return { success: true, video_id: videoId, resp: resp.data };
    } catch (err) {
      // prefer usable error message
      console.error('❌ Error uploading to Facebook (multipart):', err.response ? err.response.data : err.message);
      return { success: false, error: err };
    }
  }

// Main runner: process all products with a video url
async function processAll() {
  const products = readProducts(productsJsonPath);

  for (const p of products) {
    const itemId = p.item_id || (p.batch_item_for_item_card_full && p.batch_item_for_item_card_full.itemid) || Date.now();
    const name = p.batch_item_for_item_card_full && p.batch_item_for_item_card_full.name ? p.batch_item_for_item_card_full.name : `Shopee Item ${itemId}`;
    const desc = p.product_link || p.long_link || '';

    const mp4Url = getMp4UrlFromProduct(p);
    if (!mp4Url) {
      console.warn(`⚠️ No mp4 url found for item ${itemId} - skipping.`);
      continue;
    }

    // choose a safe output filename
    const filename = `shopee_${itemId}.mp4`;
    const destPath = path.join(outputDirectory, filename);

    try {
      await downloadMp4(mp4Url, destPath);
    } catch (err) {
      console.error(`❌ Failed to download item ${itemId}:`, err.message || err);
      continue; // next product
    }

    // Upload to FB
    try {
      const uploadResult = await uploadToFacebookReels(destPath, name, desc);
      if (!uploadResult.success) {
        console.error('❌ Upload failed for', destPath);
      } else {
        console.log('✅ Upload success for', destPath);
      }
    } catch (err) {
      console.error('❌ Unexpected upload error:', err);
    }

    // cleanup
    if (removeAfterUpload) {
      try {
        fs.unlinkSync(destPath);
        console.log('🧹 Removed local file:', destPath);
      } catch (err) {
        console.warn('⚠️ Could not remove file:', destPath, err.message || err);
      }
    }
  }

  console.log('🏁 All items processed.');
}

// Run
processAll().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
