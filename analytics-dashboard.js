require('dotenv').config();
const fs = require('fs');
const path = require('path');

const postsLogFile = path.join(__dirname, 'posts-log.json');

/**
 * Load posts log
 */
function loadPostsLog() {
  try {
    if (!fs.existsSync(postsLogFile)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(postsLogFile, 'utf-8'));
  } catch (err) {
    console.error('❌ Error loading posts log:', err.message);
    return [];
  }
}

/**
 * Display analytics dashboard
 */
function displayDashboard() {
  const posts = loadPostsLog();

  if (posts.length === 0) {
    console.log('\n📊 ANALYTICS DASHBOARD\n');
    console.log('No posts yet. Run some automation cycles first!\n');
    return;
  }

  console.log('\n' + '═'.repeat(80));
  console.log('📊 AI CONTENT AUTOMATION - ANALYTICS DASHBOARD');
  console.log('═'.repeat(80) + '\n');

  // Overall Statistics
  const totalPosts = posts.length;
  const successfulPosts = posts.filter(p => p.success).length;
  const failedPosts = totalPosts - successfulPosts;
  const successRate = ((successfulPosts / totalPosts) * 100).toFixed(1);

  console.log('📈 OVERALL PERFORMANCE');
  console.log('─'.repeat(80));
  console.log(`Total Cycles:        ${totalPosts}`);
  console.log(`Successful Posts:    ${successfulPosts} (${successRate}%)`);
  console.log(`Failed/Skipped:      ${failedPosts}`);
  console.log('');

  // Virality Scores
  const viralityScores = posts.filter(p => p.virality_score).map(p => p.virality_score);
  if (viralityScores.length > 0) {
    const avgScore = (viralityScores.reduce((a, b) => a + b, 0) / viralityScores.length).toFixed(1);
    const maxScore = Math.max(...viralityScores);
    const minScore = Math.min(...viralityScores);

    console.log('🎯 VIRALITY SCORES');
    console.log('─'.repeat(80));
    console.log(`Average Score:       ${avgScore}/100`);
    console.log(`Highest Score:       ${maxScore}/100`);
    console.log(`Lowest Score:        ${minScore}/100`);
    console.log('');
  }

  // Recent Activity
  const now = Date.now();
  const last24h = posts.filter(p => (now - new Date(p.timestamp).getTime()) < 24 * 60 * 60 * 1000).length;
  const last7d = posts.filter(p => (now - new Date(p.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000).length;

  console.log('📅 RECENT ACTIVITY');
  console.log('─'.repeat(80));
  console.log(`Last 24 Hours:       ${last24h} cycles`);
  console.log(`Last 7 Days:         ${last7d} cycles`);
  console.log('');

  // Top Topics
  const topicCounts = {};
  posts.forEach(p => {
    if (p.topic) {
      topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1;
    }
  });

  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topTopics.length > 0) {
    console.log('🏆 TOP 5 TOPICS');
    console.log('─'.repeat(80));
    topTopics.forEach(([topic, count], i) => {
      const truncated = topic.length > 55 ? topic.substring(0, 52) + '...' : topic;
      console.log(`${i + 1}. ${truncated.padEnd(58)} (${count}x)`);
    });
    console.log('');
  }

  // Top Products
  const productCounts = {};
  posts.filter(p => p.product_name).forEach(p => {
    productCounts[p.product_name] = (productCounts[p.product_name] || 0) + 1;
  });

  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topProducts.length > 0) {
    console.log('🛍️ TOP 3 PRODUCTS PROMOTED');
    console.log('─'.repeat(80));
    topProducts.forEach(([product, count], i) => {
      const truncated = product.length > 55 ? product.substring(0, 52) + '...' : product;
      console.log(`${i + 1}. ${truncated.padEnd(58)} (${count}x)`);
    });
    console.log('');
  }

  // Recent Successful Posts
  const recentSuccessful = posts
    .filter(p => p.success && p.post_url)
    .slice(-5)
    .reverse();

  if (recentSuccessful.length > 0) {
    console.log('✅ RECENT SUCCESSFUL POSTS');
    console.log('─'.repeat(80));
    recentSuccessful.forEach((p, i) => {
      const date = new Date(p.timestamp).toLocaleString();
      const headline = p.content_headline || 'No headline';
      const truncated = headline.length > 50 ? headline.substring(0, 47) + '...' : headline;
      console.log(`${i + 1}. ${truncated}`);
      console.log(`   Virality: ${p.virality_score}/100 | ${date}`);
      console.log(`   URL: ${p.post_url}`);
      console.log('');
    });
  }

  // Failure Analysis
  const failures = posts.filter(p => !p.success && p.error);
  if (failures.length > 0) {
    const errorCounts = {};
    failures.forEach(p => {
      const errorType = p.error.split(':')[0]; // Get error type before colon
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    });

    const topErrors = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    console.log('❌ FAILURE ANALYSIS');
    console.log('─'.repeat(80));
    console.log(`Total Failures:      ${failures.length}`);
    console.log('\nTop Error Types:');
    topErrors.forEach(([error, count]) => {
      console.log(`   - ${error}: ${count}x`);
    });
    console.log('');
  }

  // Cost Analysis
  const estimatedCost = successfulPosts * 0.0014; // $0.0014 per successful post
  console.log('💰 COST ANALYSIS');
  console.log('─'.repeat(80));
  console.log(`Total Estimated Cost:  $${estimatedCost.toFixed(4)}`);
  console.log(`Cost per Post:         $0.0014`);
  console.log(`Projected Monthly:     $${(0.0014 * 360).toFixed(2)} (12 posts/day)`);
  console.log('');

  console.log('═'.repeat(80));
  console.log(`Last updated: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(80) + '\n');
}

/**
 * Export posts to CSV
 */
function exportToCSV() {
  const posts = loadPostsLog();

  if (posts.length === 0) {
    console.log('❌ No posts to export');
    return;
  }

  const csvPath = path.join(__dirname, 'posts-export.csv');
  const headers = [
    'Timestamp',
    'Success',
    'Topic',
    'Headline',
    'Virality Score',
    'Product Name',
    'Post URL',
    'Error'
  ];

  const rows = posts.map(p => [
    p.timestamp || '',
    p.success ? 'Yes' : 'No',
    p.topic || '',
    (p.content_headline || '').replace(/,/g, ';'),
    p.virality_score || 0,
    (p.product_name || '').replace(/,/g, ';'),
    p.post_url || '',
    (p.error || '').replace(/,/g, ';')
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  fs.writeFileSync(csvPath, csv);
  console.log(`✅ Exported ${posts.length} posts to ${csvPath}`);
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--export') || args.includes('-e')) {
  exportToCSV();
} else {
  displayDashboard();
}

module.exports = {
  loadPostsLog,
  displayDashboard,
  exportToCSV
};
