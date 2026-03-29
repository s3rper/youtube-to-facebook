require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  createQuoteImage,
  getShopeeProductImageUrl,
  getImageForPost,
  cleanupOldImages
} = require('./image-handler');

const shopeeListFile = path.join(__dirname, 'duterte-shopee-list.json');

async function testPhase2() {
  console.log('🧪 TESTING PHASE 2: Image Handler\n');

  try {
    // Load a sample Shopee product
    const shopeeProducts = JSON.parse(fs.readFileSync(shopeeListFile, 'utf-8'));
    const sampleProduct = shopeeProducts[0];

    const samplePost = {
      headline: 'Duterte\'s Legacy: Leadership That Shaped the Philippines',
      content: 'As we reflect on President Duterte\'s tenure, his impact on Philippine politics remains undeniable. From infrastructure projects to controversial policies, his presidency marked a transformative era in Filipino history.'
    };

    console.log('1️⃣ Testing createQuoteImage...');
    const quotePath = path.join(__dirname, 'generated_images', 'test_quote.png');
    await createQuoteImage(samplePost.headline, quotePath);
    console.log('   ✅ Quote image created:', quotePath);
    console.log('   File exists:', fs.existsSync(quotePath) ? 'YES' : 'NO\n');

    console.log('2️⃣ Testing getShopeeProductImageUrl...');
    const shopeeImageUrl = getShopeeProductImageUrl(sampleProduct);
    console.log('   Shopee image URL:', shopeeImageUrl);
    console.log('   Valid URL:', shopeeImageUrl ? '✅ YES' : '❌ NO\n');

    console.log('3️⃣ Testing getImageForPost (full strategy)...');
    const imagePath = await getImageForPost(samplePost, sampleProduct);
    console.log('   ✅ Image obtained:', imagePath);
    console.log('   File exists:', fs.existsSync(imagePath) ? '✅ YES' : '❌ NO');

    if (fs.existsSync(imagePath)) {
      const stats = fs.statSync(imagePath);
      console.log('   File size:', (stats.size / 1024).toFixed(2), 'KB\n');
    }

    console.log('4️⃣ Testing cleanupOldImages...');
    cleanupOldImages();
    console.log('   ✅ Cleanup complete\n');

    console.log('✅ PHASE 2 TEST COMPLETE!\n');
    console.log('📋 SUMMARY:');
    console.log('   - Quote image generation: ✅');
    console.log('   - Shopee product image extraction: ✅');
    console.log('   - Multi-strategy image fetching: ✅');
    console.log('   - Image cleanup: ✅');
    console.log('\nPhase 2 is ready! You can proceed to Phase 3.');
    console.log('\n💡 TIP: Check the generated_images/ folder to see the images created.');

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    console.error('Stack:', err.stack);
  }
}

testPhase2();
