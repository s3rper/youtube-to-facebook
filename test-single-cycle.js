require('dotenv').config();
const { runContentCycle } = require('./content-automation');

console.log('🧪 TESTING PHASE 4: Single Content Cycle\n');
console.log('⚠️ This will create ONE real post on your Facebook Page!\n');
console.log('The test will:');
console.log('  1. Generate AI content about Philippines politics');
console.log('  2. Score it for virality (must be >= 60)');
console.log('  3. Match it with a Shopee product');
console.log('  4. Create/fetch an image');
console.log('  5. Post to Facebook with optimized caption');
console.log('  6. Add affiliate comment');
console.log('  7. Log everything to posts-log.json\n');

async function test() {
  try {
    const success = await runContentCycle();

    console.log('\n' + '='.repeat(80));
    if (success) {
      console.log('✅ PHASE 4 TEST COMPLETE - SINGLE CYCLE SUCCESSFUL!');
      console.log('='.repeat(80));
      console.log('\n📋 What was tested:');
      console.log('   ✅ AI content generation');
      console.log('   ✅ Virality scoring and optimization');
      console.log('   ✅ Product matching');
      console.log('   ✅ Caption generation');
      console.log('   ✅ Image handling');
      console.log('   ✅ Facebook posting');
      console.log('   ✅ Affiliate commenting');
      console.log('   ✅ Logging to posts-log.json');
      console.log('\n📝 NEXT STEPS:');
      console.log('   1. Check your Facebook Page to verify the post');
      console.log('   2. Verify image, caption, and comment look good');
      console.log('   3. Check posts-log.json for the logged data');
      console.log('   4. If everything looks good, you can start full automation:');
      console.log('      node content-automation.js');
      console.log('\n✨ Phase 4 is ready! Proceed to Phase 5 for safety features.');
    } else {
      console.log('⚠️ CYCLE COMPLETED BUT POST WAS SKIPPED');
      console.log('='.repeat(80));
      console.log('\nThis is normal if:');
      console.log('   - Virality score was below 60 even after optimization');
      console.log('   - Run the test again to try with a different topic');
    }

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    console.error('Stack:', err.stack);
  }
}

test();
