require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  generatePoliticalPost,
  scoreViralPotential,
  matchProduct,
  generateCaption,
  generatePersuasiveComment,
  optimizeForVirality
} = require('./ai-content-generator');

const shopeeListFile = path.join(__dirname, 'duterte-shopee-list.json');

async function testPhase1() {
  console.log('🧪 TESTING PHASE 1: AI Content Generator\n');

  try {
    console.log('1️⃣ Testing generatePoliticalPost...');
    const postData = await generatePoliticalPost('Duterte legacy analysis');
    console.log('   Headline:', postData.headline);
    console.log('   Emotion:', postData.emotion);
    console.log('   Content preview:', postData.content.substring(0, 100) + '...\n');

    console.log('2️⃣ Testing scoreViralPotential...');
    const score = await scoreViralPotential(postData);
    console.log('   Score:', score.score);
    console.log('   Reason:', score.reason);
    console.log('   Pass threshold (>= 60)?', score.score >= 60 ? '✅ YES' : '❌ NO\n');

    if (score.score < 60) {
      console.log('3️⃣ Testing optimizeForVirality (score was low)...');
      const optimized = await optimizeForVirality(postData);
      console.log('   Optimized headline:', optimized.headline);

      const newScore = await scoreViralPotential(optimized);
      console.log('   New score:', newScore.score, '\n');

      Object.assign(postData, optimized);
    }

    console.log('4️⃣ Testing matchProduct...');
    const shopeeProducts = JSON.parse(fs.readFileSync(shopeeListFile, 'utf-8'));
    const match = await matchProduct(postData, shopeeProducts);
    console.log('   Selected product:', match.product.batch_item_for_item_card_full?.name);
    console.log('   Match reason:', match.reason, '\n');

    console.log('5️⃣ Testing generateCaption...');
    const caption = await generateCaption(postData, match.product);
    console.log('   Caption:', caption.caption);
    console.log('   Hashtags:', caption.hashtags, '\n');

    console.log('6️⃣ Testing generatePersuasiveComment...');
    const comment = await generatePersuasiveComment(match.product);
    console.log('   Comment:', comment, '\n');

    console.log('✅ PHASE 1 TEST COMPLETE!\n');
    console.log('📋 SUMMARY:');
    console.log('   - AI content generation: ✅');
    console.log('   - Virality scoring: ✅');
    console.log('   - Product matching: ✅');
    console.log('   - Caption generation: ✅');
    console.log('   - Comment generation: ✅');
    console.log('\nPhase 1 is ready! You can proceed to Phase 2.');

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    console.error('Stack:', err.stack);
    console.log('\n⚠️ Make sure ANTHROPIC_API_KEY is set in your .env file');
  }
}

testPhase1();
