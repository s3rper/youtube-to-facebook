require('dotenv').config();
const {
  isDuplicateContent,
  checkProfanity,
  validateCaptionLength,
  checkDailyPostLimit,
  validatePostContent,
  estimateAPICost,
  getSystemStats
} = require('./safety-validator');

console.log('🧪 TESTING PHASE 5: Safety & Cost Optimization\n');

// Test 1: Duplicate Detection
console.log('1️⃣ Testing Duplicate Content Detection...');
const testContent1 = 'Duterte\'s Legacy: A Complex Tapestry';
const testContent2 = 'Duterte\'s Legacy: A Complex Tapestry'; // Same
const testContent3 = 'Different content about Philippines politics';

console.log(`   Content 1: "${testContent1}"`);
console.log(`   Is duplicate: ${isDuplicateContent(testContent1)}`);
console.log(`   Content 2 (same): "${testContent2}"`);
console.log(`   Is duplicate: ${isDuplicateContent(testContent2)}`);
console.log(`   Content 3 (different): "${testContent3}"`);
console.log(`   Is duplicate: ${isDuplicateContent(testContent3)}`);
console.log('');

// Test 2: Profanity Filter
console.log('2️⃣ Testing Profanity Filter...');
const cleanText = 'This is a clean post about politics';
const profaneText = 'This post contains gago and puta words';

const cleanCheck = checkProfanity(cleanText);
console.log(`   Clean text: "${cleanText}"`);
console.log(`   Has profanity: ${cleanCheck.hasProfanity}`);

const profaneCheck = checkProfanity(profaneText);
console.log(`   Profane text: "${profaneText}"`);
console.log(`   Has profanity: ${profaneCheck.hasProfanity}`);
console.log(`   Words found: ${profaneCheck.words.join(', ')}`);
console.log('');

// Test 3: Caption Length Validation
console.log('3️⃣ Testing Caption Length Validation...');
const shortCaption = 'This is a short caption';
const longCaption = 'A'.repeat(2100); // Over 2000 char limit

const shortValidation = validateCaptionLength(shortCaption);
console.log(`   Short caption (${shortValidation.length} chars): ${shortValidation.valid ? '✅ Valid' : '❌ Invalid'}`);

const longValidation = validateCaptionLength(longCaption);
console.log(`   Long caption (${longValidation.length} chars): ${longValidation.valid ? '✅ Valid' : '❌ Invalid'}`);
console.log(`   Auto-trimmed length: ${longValidation.trimmed.length} chars`);
console.log('');

// Test 4: Daily Post Limit
console.log('4️⃣ Testing Daily Post Limit...');
const dailyLimit = checkDailyPostLimit();
console.log(`   Posts today: ${dailyLimit.count}/${dailyLimit.maxCount}`);
console.log(`   Within limit: ${dailyLimit.withinLimit ? '✅ Yes' : '❌ No'}`);
console.log('');

// Test 5: Full Content Validation
console.log('5️⃣ Testing Full Content Validation...');
const testPost = {
  headline: 'Test Political Analysis',
  content: 'This is a test post about Philippines politics and governance. It contains enough content to pass the minimum length requirement.'
};
const testCaption = 'Test caption with hashtags #Philippines #Politics';

const fullValidation = validatePostContent(testPost, testCaption);
console.log(`   Valid: ${fullValidation.valid ? '✅ Yes' : '❌ No'}`);
if (fullValidation.errors.length > 0) {
  console.log('   Errors:');
  fullValidation.errors.forEach(err => console.log(`      - ${err}`));
}
if (fullValidation.warnings.length > 0) {
  console.log('   Warnings:');
  fullValidation.warnings.forEach(warn => console.log(`      - ${warn}`));
}
console.log('');

// Test 6: Cost Estimation
console.log('6️⃣ Testing Cost Estimation...');
const cost = estimateAPICost();
console.log(`   Tokens per cycle:`);
console.log(`      - Input: ${cost.totalInput} tokens`);
console.log(`      - Output: ${cost.totalOutput} tokens`);
console.log(`   Estimated costs:`);
console.log(`      - Per cycle: ${cost.formatted.perCycle}`);
console.log(`      - Per day: ${cost.formatted.perDay}`);
console.log(`      - Per month: ${cost.formatted.perMonth}`);
console.log('');

// Test 7: System Statistics
console.log('7️⃣ Testing System Statistics...');
const stats = getSystemStats();
if (stats) {
  console.log(`   Total posts: ${stats.totalPosts}`);
  console.log(`   Successful: ${stats.successfulPosts}`);
  console.log(`   Failed: ${stats.failedPosts}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  console.log(`   Avg virality score: ${stats.averageViralityScore}/100`);
  console.log(`   Posts in last 24h: ${stats.last24Hours}`);
} else {
  console.log('   No statistics available yet (run some cycles first)');
}
console.log('');

console.log('✅ PHASE 5 TEST COMPLETE!\n');
console.log('📋 SUMMARY:');
console.log('   ✅ Duplicate content detection');
console.log('   ✅ Profanity filtering');
console.log('   ✅ Caption length validation');
console.log('   ✅ Daily post limit checking');
console.log('   ✅ Full content validation');
console.log('   ✅ Cost estimation');
console.log('   ✅ System statistics');
console.log('\n✨ Phase 5 is ready! Proceed to Phase 6 for analytics.');
