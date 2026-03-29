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
const uploadedJsonPath = process.env.UPLOADED_JSON || path.join(__dirname, 'uploaded.json');
const removeAfterUpload = process.env.REMOVE_AFTER_UPLOAD !== 'false'; // default true

const FormData = require('form-data');

if (!facebookPageId || !accessToken) {
  console.error('❌ Please set FACEBOOK_PAGE_ID and FACEBOOK_ACCESS_TOKEN in your .env file');
  process.exit(1);
}

if (!fs.existsSync(outputDirectory)) fs.mkdirSync(outputDirectory, { recursive: true });

// 🔹 Helper: sleep
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const getRandomDelay = () => Math.floor(Math.random() * (40 - 30 + 1) * 60_000) + 30 * 60_000; // 30–40 min

// 🔹 Read/Write JSON helpers
const readJson = (filePath, defaultVal = []) => {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error reading JSON ${filePath}:`, err.message);
    return defaultVal;
  }
};

const writeJson = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`❌ Error writing JSON ${filePath}:`, err.message);
  }
};

// 🔹 Extract mp4 URL - updated to pick last format in formats array (preferring .mp4)
function getMp4UrlFromProduct(product) {
  try {
    const vil = product.batch_item_for_item_card_full?.video_info_list;
    if (!vil || !Array.isArray(vil) || vil.length === 0) return null;

    // find first video_info_list entry that has a non-empty formats array or default_format
    const vidObj = vil.find(v => Array.isArray(v.formats) && v.formats.length > 0) || vil[0];

    // If there are formats, pick the last one. Prefer last .mp4 if available.
    if (Array.isArray(vidObj.formats) && vidObj.formats.length > 0) {
      // prefer last format that has a .url
      const formats = vidObj.formats;
      // try last entry first
      let chosen = formats[formats.length - 1];
      if (!chosen?.url) {
        // fallback: find last format with a url
        for (let i = formats.length - 1; i >= 0; i--) {
          if (formats[i]?.url) { chosen = formats[i]; break; }
        }
      }
      // prefer .mp4 url if there are multiple candidates with url (choose one ending with .mp4)
      if (chosen && chosen.url) {
        // if chosen url isn't mp4, try to find a url that endsWith .mp4 in formats starting from last
        if (!chosen.url.endsWith('.mp4')) {
          const mp4Candidate = formats.slice().reverse().find(f => typeof f.url === 'string' && f.url.endsWith('.mp4'));
          if (mp4Candidate) chosen = mp4Candidate;
        }
        return chosen.url;
      }
    }

    // Fallback to default_format.url if present
    if (vidObj.default_format && vidObj.default_format.url) return vidObj.default_format.url;

    // final fallback: try any url fields inside vidObj
    if (vidObj.url) return vidObj.url;

    return null;
  } catch (err) {
    console.error('Error parsing video_info_list for mp4 url:', err?.message || err);
    return null;
  }
}

// 🔹 Download video
async function downloadMp4(url, destPath) {
  console.log(`⬇️  Downloading ${url} -> ${destPath}`);
  const writer = fs.createWriteStream(destPath);
  const res = await axios.get(url, { responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0 (Node.js)' }, timeout: 60_000 });
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => { console.log(`✅ Downloaded: ${destPath}`); resolve(destPath); });
    writer.on('error', reject);
    res.data.on('error', reject);
  });
}

// 🔹 Upload to Facebook
async function uploadToFacebookReels(videoPath, title = '', description = '') {
  console.log('🚀 Uploading to Facebook Reel:', path.basename(videoPath));
  try {
    const url = `https://graph.facebook.com/v19.0/${facebookPageId}/videos`;
    const form = new FormData();
    form.append('access_token', accessToken);
    form.append('title', title);
    form.append('description', description);
    form.append('source', fs.createReadStream(videoPath));

    const headers = form.getHeaders();
    headers['Content-Length'] = await new Promise((resolve, reject) => form.getLength((err, length) => err ? reject(err) : resolve(length)));

    const resp = await axios.post(url, form, { headers, maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 10 * 60_000 });
    const videoId = resp.data?.id || resp.data?.video_id;
    if (!videoId) return { success: false, resp: resp.data };

    console.log(`🎉 Uploaded! Video id: ${videoId}`);
    return { success: true, video_id: videoId, resp: resp.data };
  } catch (err) {
    console.error('❌ Upload failed:', err.response?.data || err.message);
    return { success: false, error: err };
  }
}

// 🔹 Comment on Facebook video
async function commentOnFacebookVideo(videoId, message) {
  if (!videoId || !message) return;
  try {
    const url = `https://graph.facebook.com/v19.0/${videoId}/comments`;
    const resp = await axios.post(url, null, {
      params: { access_token: accessToken, message },
    });
    console.log(`💬 Commented on video ${videoId}: ${message}`);
    return resp.data;
  } catch (err) {
    console.error(`❌ Failed to comment on video ${videoId}:`, err.response?.data || err.message);
  }
}

// 🔹 Main process
async function processAll() {
  let products = readJson(productsJsonPath);
  let uploadedList = readJson(uploadedJsonPath); // store URLs or item_ids

  for (const p of products) {
    const itemId = p.item_id || p.batch_item_for_item_card_full?.itemid || Date.now();
    const mp4Url = getMp4UrlFromProduct(p);
    if (!mp4Url) {
      console.warn(`⚠️ No mp4 url for item ${itemId} - skipping`);
      continue;
    }

    // ✅ Skip if already uploaded
    if (uploadedList.includes(mp4Url) || uploadedList.includes(itemId)) {
      console.log(`⏩ Already uploaded: item ${itemId}`);
      continue;
    }

    const safeName = p.batch_item_for_item_card_full?.name?.trim() || `Shopee Item ${itemId}`;
    const desc = p.productOfferLink ? `${safeName}: ${p.productOfferLink}` : safeName;
    const destPath = path.join(outputDirectory, `shopee_${itemId}.mp4`);

    try { await downloadMp4(mp4Url, destPath); } 
    catch (err) { console.error(`❌ Failed download item ${itemId}:`, err.message); continue; }

    const result = await uploadToFacebookReels(destPath, safeName, desc);
    if (result.success) {
      uploadedList.push(mp4Url);
      uploadedList.push(itemId);
      writeJson(uploadedJsonPath, uploadedList);
      console.log(`✅ Stored item ${itemId} in uploaded list`);

      // 💬 Comment productOfferLink after upload using the returned video_id
      if (p.productOfferLink) {
        await commentOnFacebookVideo(result.video_id, `🛒 Buy here: ${p.productOfferLink}`);
      }

      // remove from products array & write
      products = products.filter(x => x !== p);
      writeJson(productsJsonPath, products);
    }

    if (removeAfterUpload) {
      try { fs.unlinkSync(destPath); console.log('🧹 Removed local file:', destPath); } 
      catch { }
    }

    const delay = getRandomDelay();
    console.log(`⏳ Waiting ${(delay / 60000).toFixed(1)} minutes...`);
    await sleep(delay);
  }

  console.log('🏁 All items processed.');
}

// Run
processAll().catch(err => console.error('❌ Fatal error:', err));
