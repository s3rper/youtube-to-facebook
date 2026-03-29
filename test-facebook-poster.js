require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  postImageToFacebook,
  postTextToFacebook,
  commentOnPost,
  getPostDetails,
  deletePost
} = require('./facebook-poster');
const { createQuoteImage } = require('./image-handler');

async function testPhase3() {
  console.log('🧪 TESTING PHASE 3: Facebook Poster\n');
  console.log('⚠️ WARNING: This will post to your REAL Facebook Page!');
  console.log('   Page ID:', process.env.FACEBOOK_PAGE_ID);
  console.log('   You can delete the test post after verification.\n');

  let testPostId = null;

  try {
    // Create a test image
    console.log('1️⃣ Creating test image...');
    const testImagePath = path.join(__dirname, 'generated_images', 'facebook_test.png');
    await createQuoteImage('🧪 TEST POST - Philippines Political News Automation System', testImagePath);
    console.log('   ✅ Test image created:', testImagePath, '\n');

    // Test image posting
    console.log('2️⃣ Testing postImageToFacebook...');
    const testCaption = `🧪 TEST POST - AI Content Automation System

This is a test of the automated content posting system for Philippines politics and news.

Features:
✅ AI-generated original content
✅ Viral optimization scoring
✅ Smart product matching
✅ Automated image handling
✅ Facebook posting

#Philippines #Politics #Automation #Test`;

    const imagePostResult = await postImageToFacebook(testImagePath, testCaption);

    if (imagePostResult.success) {
      console.log('   ✅ Image post successful!');
      console.log('   Post ID:', imagePostResult.post_id);
      console.log('   URL:', imagePostResult.url, '\n');
      testPostId = imagePostResult.post_id;
    } else {
      console.log('   ❌ Image post failed:', imagePostResult.error, '\n');
      throw new Error('Image posting failed');
    }

    // Wait a moment before commenting
    console.log('   ⏳ Waiting 3 seconds before commenting...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test commenting
    console.log('3️⃣ Testing commentOnPost...');
    const testComment = '💬 This is a test comment with an affiliate link: https://shopee.ph';
    const commentResult = await commentOnPost(testPostId, testComment);

    if (commentResult.success) {
      console.log('   ✅ Comment posted successfully!');
      console.log('   Comment ID:', commentResult.comment_id, '\n');
    } else {
      console.log('   ❌ Comment failed:', commentResult.error, '\n');
    }

    // Get post details
    console.log('4️⃣ Testing getPostDetails...');
    const details = await getPostDetails(testPostId);

    if (details.success) {
      console.log('   ✅ Post details retrieved:');
      console.log('   Created:', details.data.created_time);
      console.log('   Permalink:', details.data.permalink_url);
      console.log('   Likes:', details.data.likes?.summary?.total_count || 0);
      console.log('   Comments:', details.data.comments?.summary?.total_count || 0, '\n');
    }

    console.log('✅ PHASE 3 TEST COMPLETE!\n');
    console.log('📋 SUMMARY:');
    console.log('   - Image posting: ✅');
    console.log('   - Auto-commenting: ✅');
    console.log('   - Post details retrieval: ✅');
    console.log('\nPhase 3 is ready! You can proceed to Phase 4.');
    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Visit your Facebook Page to verify the test post');
    console.log('   2. Check that the image and caption appear correctly');
    console.log('   3. Verify the comment with affiliate link is posted');
    console.log('   4. You can manually delete the test post from Facebook');
    console.log(`   5. Or run: node -e "require('./facebook-poster').deletePost('${testPostId}')"`);

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    console.error('Stack:', err.stack);

    if (testPostId) {
      console.log('\n⚠️ Test post was created:', testPostId);
      console.log('   You may want to delete it manually from your Facebook Page');
    }
  }
}

testPhase3();
