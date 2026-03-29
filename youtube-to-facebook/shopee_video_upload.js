// shopee_image_upload.js
require('dotenv').config();
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

const facebookPageId = process.env.FACEBOOK_PAGE_ID;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const productsJsonPath = process.env.PRODUCTS_JSON || path.join(__dirname, 'shopee-list.json');
const outputDirectory = process.env.OUTPUT_DIR || path.join(__dirname, 'downloads'); // temp files
const uploadedJsonPath = process.env.UPLOADED_JSON || path.join(__dirname, 'uploaded.json');
const removeAfterUpload = process.env.REMOVE_AFTER_UPLOAD !== 'false'; // default true

if (!facebookPageId || !accessToken) {
  console.error('❌ Please set FACEBOOK_PAGE_ID and FACEBOOK_ACCESS_TOKEN in your .env file');
  process.exit(1);
}

if (!fs.existsSync(outputDirectory)) fs.mkdirSync(outputDirectory, { recursive: true });

// ---------------- Config for compression ----------------
const MAX_SIZE_MB = parseFloat(process.env.MAX_SIZE_MB) || 9.5; // keep a little under 10MB
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;
const START_QUALITY = parseInt(process.env.START_QUALITY || '80', 10);
const MIN_QUALITY = parseInt(process.env.MIN_QUALITY || '40', 10);
const QUALITY_STEP = parseInt(process.env.QUALITY_STEP || '10', 10);
const MAX_WIDTH = parseInt(process.env.MAX_WIDTH || '1280', 10); // resize width if needed

// ---------------- Helpers ----------------
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const getRandomDelay = () => Math.floor(Math.random() * (40 - 30 + 1) * 60_000) + 30 * 60_000; // 30–40 min

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

// Build full image URLs using the base you specified
function buildImageUrlsFromProduct(product) {
  const base = 'https://down-zl-ph.img.susercontent.com/';
  const batch = product.batch_item_for_item_card_full || product.batch_item;
  if (batch && Array.isArray(batch.images) && batch.images.length > 0) {
    return batch.images
      .filter(Boolean)
      .map(k => (typeof k === 'string' && (k.startsWith('http://') || k.startsWith('https://'))) ? k : `${base}${k}.webp`);
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images
      .filter(Boolean)
      .map(k => (typeof k === 'string' && (k.startsWith('http://') || k.startsWith('https://'))) ? k : `${base}${k}.webp`);
  }

  return [];
}

// Download remote image into a Buffer
async function downloadImageToBuffer(url, timeoutMs = 60_000) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: timeoutMs, headers: { 'User-Agent': 'Mozilla/5.0 (Node.js)' } });
    return Buffer.from(res.data);
  } catch (err) {
    throw new Error(`Download failed: ${err.message || err}`);
  }
}

// Compress/convert buffer to JPEG and write to outFile.
// Tries progressive steps: quality -> resizing until <= MAX_BYTES or fail.
async function compressImageBufferToJpeg(buffer, outFile) {
  let quality = START_QUALITY;
  let attempt = 0;
  // Start with conversion (resize to MAX_WIDTH if larger)
  while (quality >= MIN_QUALITY) {
    attempt++;
    try {
      let pipeline = sharp(buffer).rotate(); // rotate based on EXIF
      const meta = await pipeline.metadata();
      if (meta.width && meta.width > MAX_WIDTH) {
        pipeline = pipeline.resize({ width: MAX_WIDTH });
      }
      // output jpeg with current quality
      const outBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      if (outBuffer.length <= MAX_BYTES) {
        await fsp.writeFile(outFile, outBuffer);
        return { success: true, size: outBuffer.length, quality, attempts: attempt };
      }
      // if still too big, reduce quality
      quality -= QUALITY_STEP;
    } catch (err) {
      // if sharp fails for some format, try converting to PNG then to jpeg as fallback
      console.warn('⚠️ Sharp compress attempt failed:', err.message || err);
      quality -= QUALITY_STEP;
    }
  }

  // If still too large after reducing quality, try additional downscale steps
  // progressive resizing attempts
  let currentWidth = MAX_WIDTH;
  for (let scaleAttempt = 0; scaleAttempt < 3; scaleAttempt++) {
    currentWidth = Math.floor(currentWidth * 0.75); // 75% scale
    let q = Math.max(MIN_QUALITY, START_QUALITY - (scaleAttempt + 1) * QUALITY_STEP);
    try {
      let pipeline = sharp(buffer).rotate().resize({ width: currentWidth });
      const outBuffer = await pipeline.jpeg({ quality: q, mozjpeg: true }).toBuffer();
      if (outBuffer.length <= MAX_BYTES) {
        await fsp.writeFile(outFile, outBuffer);
        return { success: true, size: outBuffer.length, quality: q, attempts: attempt + scaleAttempt + 1 };
      }
    } catch (err) {
      console.warn('⚠️ Resize compress attempt failed:', err.message || err);
    }
  }

  // final attempt: write best-effort with MIN_QUALITY and smaller width
  try {
    const pipeline = sharp(buffer).rotate().resize({ width: Math.floor(MAX_WIDTH * 0.5) });
    const outBuffer = await pipeline.jpeg({ quality: MIN_QUALITY, mozjpeg: true }).toBuffer();
    await fsp.writeFile(outFile, outBuffer);
    return { success: outBuffer.length <= MAX_BYTES, size: outBuffer.length, quality: MIN_QUALITY, attempts: attempt + 4 };
  } catch (err) {
    return { success: false, error: err.message || err };
  }
}

// Upload local file as multipart to Facebook page /photos with published=false; returns media_fbid (photo id)
async function uploadPhotoFileUnpublished(filePath) {
  try {
    const url = `https://graph.facebook.com/v19.0/${facebookPageId}/photos`;
    const form = new FormData();
    form.append('access_token', accessToken);
    form.append('published', 'false');
    form.append('source', fs.createReadStream(filePath));

    const headers = form.getHeaders();
    // axios post
    const resp = await axios.post(url, form, { headers, maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 120_000 });
    if (resp.data && (resp.data.id || resp.data.post_id)) {
      return resp.data.id || resp.data.post_id;
    }
    console.warn('⚠️ Unexpected response uploading file:', resp.data);
    return null;
  } catch (err) {
    console.error('❌ Upload photo file failed:', err.response?.data || err.message);
    return null;
  }
}

// Publish feed post attaching media fbids
async function publishPostWithPhotos(mediaFbids = [], message = '') {
  try {
    if (!Array.isArray(mediaFbids) || mediaFbids.length === 0) throw new Error('No media fbids provided');
    const url = `https://graph.facebook.com/v19.0/${facebookPageId}/feed`;
    const params = { access_token: accessToken, message };
    mediaFbids.forEach((id, idx) => {
      params[`attached_media[${idx}]`] = JSON.stringify({ media_fbid: id });
    });
    const resp = await axios.post(url, null, { params, timeout: 120_000 });
    if (resp.data && resp.data.id) return resp.data.id;
    console.warn('⚠️ Unexpected response when publishing feed post:', resp.data);
    return null;
  } catch (err) {
    console.error('❌ Failed to publish feed post with photos:', err.response?.data || err.message);
    return null;
  }
}

async function commentOnPost(postId, message) {
  try {
    if (!postId || !message) return;
    const url = `https://graph.facebook.com/v19.0/${postId}/comments`;
    const resp = await axios.post(url, null, { params: { access_token: accessToken, message }, timeout: 60_000 });
    return resp.data;
  } catch (err) {
    console.error('❌ Failed to comment on post:', err.response?.data || err.message);
    return null;
  }
}

// ---------------- Main processing ----------------
async function processAll() {
  let products = readJson(productsJsonPath);
  let uploadedList = readJson(uploadedJsonPath);

  for (const p of [...products]) {
    const itemId = p.item_id || p.batch_item_for_item_card_full?.itemid || p.batch_item_for_item_card_full?.itemid_str || Date.now();

    if (uploadedList.includes(itemId)) {
      console.log(`⏩ Already uploaded (by id): ${itemId}`);
      continue;
    }

    const images = buildImageUrlsFromProduct(p);
    if (!images || images.length === 0) {
      console.warn(`⚠️ No images found for item ${itemId} - skipping`);
      continue;
    }

    const primaryImage = images[0];
    if (uploadedList.includes(primaryImage)) {
      console.log(`⏩ Already uploaded (by image): ${primaryImage} for item ${itemId}`);
      continue;
    }

    const safeName = p.batch_item_for_item_card_full?.name?.trim() || p.name || `Shopee Item ${itemId}`;
    const desc = p.productOfferLink ? `${safeName}: ${p.productOfferLink}` : safeName;

    console.log(`ℹ️ Processing item ${itemId} - will upload up to ${images.length} images`);

    // Directory for this item temp files
    const itemTempDir = path.join(outputDirectory, `item_${itemId}`);
    try {
      if (!fs.existsSync(itemTempDir)) await fsp.mkdir(itemTempDir, { recursive: true });
    } catch (e) { /* ignore */ }

    const mediaFbids = [];
    for (let i = 0; i < images.length; i++) {
      const imgUrl = images[i];
      const tmpDownloadedPath = path.join(itemTempDir, `raw_${i}${path.extname(new URL(imgUrl).pathname) || '.img'}`);
      const tmpCompressedPath = path.join(itemTempDir, `compressed_${i}.jpg`);

      try {
        // download to buffer
        const buf = await downloadImageToBuffer(imgUrl);
        // write raw buffer optionally for debugging (not necessary)
        await fsp.writeFile(tmpDownloadedPath, buf);

        // compress to JPG file under MAX_BYTES
        const compResult = await compressImageBufferToJpeg(buf, tmpCompressedPath);

        if (!compResult.success) {
          console.warn(`⚠️ Compression failed or file still too large for ${imgUrl} — result:`, compResult);
          // still attempt to upload the best-effort file if present
          if (!fs.existsSync(tmpCompressedPath)) {
            // fallback: write original as JPEG quickly (may be large and fail)
            try {
              await sharp(buf).rotate().resize({ width: Math.floor(MAX_WIDTH * 0.5) }).jpeg({ quality: MIN_QUALITY }).toFile(tmpCompressedPath);
            } catch (e) {
              console.warn('⚠️ Final fallback compression also failed:', e.message || e);
              continue; // skip this image
            }
          }
        }

        // confirm file exists and size
        const stat = await fsp.stat(tmpCompressedPath);
        console.log(`✅ Compressed image written: ${tmpCompressedPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
        if (stat.size > MAX_BYTES) {
          console.warn(`⚠️ Compressed size still > ${MAX_SIZE_MB} MB — it may be rejected by Facebook.`);
        }

        // upload compressed file
        const photoId = await uploadPhotoFileUnpublished(tmpCompressedPath);
        if (photoId) {
          mediaFbids.push(photoId);
        } else {
          console.warn(`⚠️ Upload failed for compressed file ${tmpCompressedPath}`);
        }
      } catch (err) {
        console.error(`❌ Error processing image ${imgUrl}:`, err.message || err);
      } finally {
        // small delay between images
        await sleep(1000);
      }
    } // images loop

    if (mediaFbids.length === 0) {
      console.error(`❌ No photos uploaded successfully for item ${itemId} - skipping post creation`);
      // cleanup item temp dir
      try { await fsp.rm(itemTempDir, { recursive: true, force: true }); } catch (e) {}
      continue;
    }

    // Publish the multi-photo post
    const postId = await publishPostWithPhotos(mediaFbids, desc);
    if (!postId) {
      console.error(`❌ Failed to publish post for item ${itemId}`);
      try { await fsp.rm(itemTempDir, { recursive: true, force: true }); } catch (e) {}
      continue;
    }

    console.log(`🎉 Post published for item ${itemId} -> post id: ${postId}`);

    if (p.productOfferLink) {
      try {
        await commentOnPost(postId, `🛒 Buy here: ${p.productOfferLink}`);
      } catch (e) {}
    }

    // Record uploaded
    uploadedList.push(itemId);
    uploadedList.push(primaryImage);
    writeJson(uploadedJsonPath, uploadedList);
    console.log(`✅ Stored item ${itemId} in uploaded list`);

    // remove processed product from products array and write back
    products = products.filter(x => x !== p);
    writeJson(productsJsonPath, products);

    // cleanup item temp dir
    if (removeAfterUpload) {
      try { await fsp.rm(itemTempDir, { recursive: true, force: true }); } catch (e) {}
    }

    const delay = getRandomDelay();
    console.log(`⏳ Waiting ${(delay / 60000).toFixed(1)} minutes before next item...`);
    await sleep(delay);
  } // products loop

  console.log('🏁 All items processed.');
}

// Run
processAll().catch(err => {
  console.error('❌ Fatal error:', err);
});
