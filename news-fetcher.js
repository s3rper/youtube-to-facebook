require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { detectRedditTrending, detectNewsTrending } = require('./trending-detector');

const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;

// Cache file paths
const newsFetchCacheFile = path.join(__dirname, 'news-fetch-cache.json');
const newsCacheFile = path.join(__dirname, 'news-cache.json');

/**
 * Classify news category based on title and description
 * @param {string} title - News title
 * @param {string} description - News description
 * @returns {string} - Category: politics, global, economy, breaking
 */
function classifyNewsCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // Breaking news keywords
  if (text.includes('breaking') || text.includes('urgent') || text.includes('just in')) {
    return 'breaking';
  }

  // Politics keywords (including Duterte topics)
  if (text.includes('politics') || text.includes('government') || text.includes('president') ||
      text.includes('congress') || text.includes('election') || text.includes('senator') ||
      text.includes('mayor') || text.includes('governor') || text.includes('duterte') ||
      text.includes('sara duterte') || text.includes('fprrd') || text.includes('impeachment') ||
      text.includes('marcos')) {
    return 'politics';
  }

  // War/Conflict keywords (Iran-Israel)
  if (text.includes('war') || text.includes('iran') || text.includes('israel') ||
      text.includes('conflict') || text.includes('military') || text.includes('attack') ||
      text.includes('middle east')) {
    return 'global';
  }

  // Economy keywords (including oil crisis)
  if (text.includes('economy') || text.includes('business') || text.includes('gdp') ||
      text.includes('inflation') || text.includes('peso') || text.includes('stock') ||
      text.includes('trade') || text.includes('investment') || text.includes('oil crisis') ||
      text.includes('oil price') || text.includes('crude oil')) {
    return 'economy';
  }

  // Default to global
  return 'global';
}

/**
 * Check if title contains Philippines-related keywords or priority topics
 * @param {string} title - News title
 * @param {string} description - News description
 * @returns {boolean}
 */
function isPhilippinesRelated(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // Priority topics (Duterte-related)
  const priorityKeywords = [
    'duterte', 'fprrd', 'sara duterte', 'rodrigo duterte'
  ];

  // General PH keywords
  const phKeywords = [
    'philippines', 'filipino', 'pilipinas', 'manila', 'marcos',
    'ph ', 'pinoy', 'pinay', 'philippine', 'cebu', 'davao'
  ];

  return priorityKeywords.some(keyword => text.includes(keyword)) ||
         phKeywords.some(keyword => text.includes(keyword));
}

/**
 * Check if news matches priority topics
 * @param {string} title - News title
 * @param {string} description - News description
 * @returns {number} - Priority score (0-100)
 */
function getPriorityScore(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // High priority topics
  const highPriority = [
    'duterte', 'fprrd', 'sara duterte', 'rodrigo duterte',
    'iran israel', 'israel iran', 'middle east war',
    'oil crisis', 'oil price'
  ];

  // Count matches
  let matches = 0;
  highPriority.forEach(keyword => {
    if (text.includes(keyword)) matches++;
  });

  // Return score: 100 for direct match, 0 for no match
  return matches > 0 ? 100 : 0;
}

/**
 * Fetch news from NewsData.io API
 * @param {string} type - 'philippines' or 'global'
 * @returns {Array} - News articles
 */
async function fetchNewsDataIO(type = 'philippines') {
  if (!NEWSDATA_API_KEY || NEWSDATA_API_KEY === 'your_newsdata_io_api_key_here') {
    console.warn('⚠️ NewsData.io API key not configured');
    return [];
  }

  try {
    let params = {
      apikey: NEWSDATA_API_KEY,
      language: 'en'
    };

    // Specific topics to focus on
    const phTopics = 'Duterte OR FPRRD OR "Sara Duterte" OR "Rodrigo Duterte" OR "President Duterte"';
    const globalTopics = '"Iran Israel war" OR "Israel Iran" OR "Middle East war" OR "oil crisis" OR "oil prices"';

    if (type === 'philippines') {
      // Philippines-specific news - Focus on Duterte topics
      params.country = 'ph';
      params.q = phTopics;
    } else {
      // Global news - Focus on Iran-Israel war and oil crisis
      params.q = globalTopics;
    }

    console.log(`🔍 Fetching ${type} news from NewsData.io...`);

    const response = await axios.get('https://newsdata.io/api/1/news', {
      params,
      timeout: 15000
    });

    if (!response.data.results || response.data.results.length === 0) {
      console.log(`ℹ️ No ${type} news found`);
      return [];
    }

    const articles = response.data.results.map(article => {
      // Calculate recency score (0-100, decays 10 points per hour)
      const articleAge = (Date.now() - new Date(article.pubDate).getTime()) / (1000 * 60 * 60); // hours
      const recencyScore = Math.max(0, 100 - (articleAge * 10));

      // Priority topic score (100 if matches Duterte/Iran-Israel/Oil Crisis topics)
      const priorityScore = getPriorityScore(article.title, article.description || '');

      // Authority score (basic - could be enhanced)
      const authorityScore = 50;

      // Determine if PH-related
      // If fetching from 'philippines' type, always mark as PH
      // If fetching from 'global' type, check keywords
      const isPH = type === 'philippines' ? true : isPhilippinesRelated(article.title, article.description || '');

      // PH relevance score
      const phRelevanceScore = isPH ? 100 : 30;

      // Final score - HEAVILY weighted towards priority topics
      const finalScore =
        (priorityScore * 0.5) +        // 50% - Priority topics (Duterte, Iran-Israel, Oil)
        (recencyScore * 0.25) +        // 25% - How recent
        (authorityScore * 0.15) +      // 15% - Source credibility
        (phRelevanceScore * 0.1);      // 10% - PH relevance

      return {
        title: article.title,
        description: article.description || article.content || '',
        source: 'newsdata',
        url: article.link,
        image_url: article.image_url || null,   // real news photo from NewsData.io
        score: finalScore,
        category: classifyNewsCategory(article.title, article.description || ''),
        timestamp: article.pubDate,
        news_source: article.source_id,
        isPH: isPH,
        isPriority: priorityScore > 0
      };
    });

    console.log(`✅ Fetched ${articles.length} ${type} news articles`);
    return articles;

  } catch (err) {
    console.error(`❌ NewsData.io ${type} fetch failed:`, err.response?.data || err.message);
    return [];
  }
}

/**
 * Fetch news from Reddit using existing trending-detector
 * @returns {Array} - Reddit posts as news items
 */
async function fetchRedditNews() {
  try {
    console.log('🔍 Fetching news from Reddit...');

    const redditPosts = await detectRedditTrending();

    if (!redditPosts || redditPosts.length === 0) {
      console.log('ℹ️ No Reddit posts found');
      return [];
    }

    // Convert Reddit format to our news format
    const newsItems = redditPosts.map(post => ({
      title: post.title,
      description: '',
      source: 'reddit',
      url: post.source_url,
      score: post.score,
      category: classifyNewsCategory(post.title, ''),
      timestamp: post.timestamp,
      news_source: `r/${post.subreddit}`,
      isPH: isPhilippinesRelated(post.title, '')
    }));

    console.log(`✅ Fetched ${newsItems.length} Reddit posts`);
    return newsItems;

  } catch (err) {
    console.error('❌ Reddit fetch failed:', err.message);
    return [];
  }
}

/**
 * Load news fetch cache
 * @returns {Object} - Cached data with expiry info
 */
function loadNewsFetchCache() {
  if (!fs.existsSync(newsFetchCacheFile)) {
    return null;
  }

  try {
    const cache = JSON.parse(fs.readFileSync(newsFetchCacheFile, 'utf-8'));
    const cacheAge = Date.now() - new Date(cache.cached_at).getTime();
    const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

    if (cacheAge > CACHE_EXPIRY) {
      console.log('⏰ News fetch cache expired');
      return null;
    }

    console.log(`✅ Using cached news (${Math.floor(cacheAge / 1000 / 60)} minutes old)`);
    return cache;

  } catch (err) {
    console.warn('⚠️ Failed to load news fetch cache:', err.message);
    return null;
  }
}

/**
 * Save news fetch cache
 * @param {Array} news - News items to cache
 */
function saveNewsFetchCache(news) {
  try {
    const cache = {
      cached_at: new Date().toISOString(),
      news
    };

    fs.writeFileSync(newsFetchCacheFile, JSON.stringify(cache, null, 2));
    console.log('💾 Saved news fetch cache');

  } catch (err) {
    console.error('❌ Failed to save news fetch cache:', err.message);
  }
}

/**
 * Load posted news cache for duplicate detection
 * @returns {Array} - Posted news items (7-day window)
 */
function loadPostedNewsCache() {
  if (!fs.existsSync(newsCacheFile)) {
    return [];
  }

  try {
    const cache = JSON.parse(fs.readFileSync(newsCacheFile, 'utf-8'));
    const CACHE_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoffTime = Date.now() - CACHE_WINDOW;

    // Filter out entries older than 7 days
    return cache.filter(entry => {
      const entryTime = new Date(entry.posted_at).getTime();
      return entryTime > cutoffTime;
    });

  } catch (err) {
    console.warn('⚠️ Failed to load posted news cache:', err.message);
    return [];
  }
}

/**
 * Add news to posted cache
 * @param {Object} newsItem - News item that was posted
 */
function addToPostedCache(newsItem) {
  try {
    let cache = loadPostedNewsCache();

    cache.push({
      title: newsItem.title,
      url: newsItem.url,
      posted_at: new Date().toISOString()
    });

    fs.writeFileSync(newsCacheFile, JSON.stringify(cache, null, 2));
    console.log('💾 Added news to posted cache');

  } catch (err) {
    console.error('❌ Failed to save to posted cache:', err.message);
  }
}

/**
 * Check if news is duplicate (already posted)
 * @param {Object} newsItem - News item to check
 * @returns {boolean}
 */
function isDuplicateNews(newsItem) {
  const cache = loadPostedNewsCache();

  return cache.some(cached => {
    // Exact URL match
    if (newsItem.url && cached.url && newsItem.url === cached.url) {
      return true;
    }

    // Similar title match (70% similarity)
    const title1 = newsItem.title.toLowerCase();
    const title2 = cached.title.toLowerCase();

    // Simple similarity check
    if (title1 === title2) {
      return true;
    }

    // Check if one title is substring of another
    if (title1.includes(title2) || title2.includes(title1)) {
      return true;
    }

    return false;
  });
}

/**
 * Fetch trending news from all sources
 * @param {Object} topicMix - {ph: 0.70, global: 0.30}
 * @returns {Array} - All news items
 */
async function fetchAllNews(topicMix = {ph: 0.70, global: 0.30}) {
  // Check cache first
  const cachedData = loadNewsFetchCache();
  if (cachedData && cachedData.news) {
    return cachedData.news;
  }

  console.log('📰 Fetching fresh news from all sources...\n');

  try {
    // Fetch from all sources in parallel
    const [phNews, globalNews, redditNews] = await Promise.all([
      fetchNewsDataIO('philippines'),
      fetchNewsDataIO('global'),
      fetchRedditNews()
    ]);

    // Combine all news
    let allNews = [...phNews, ...globalNews, ...redditNews];

    console.log(`\n📊 Total news items fetched: ${allNews.length}`);
    console.log(`   - PH news: ${phNews.length}`);
    console.log(`   - Global news: ${globalNews.length}`);
    console.log(`   - Reddit: ${redditNews.length}\n`);

    // Save to cache
    saveNewsFetchCache(allNews);

    return allNews;

  } catch (err) {
    console.error('❌ Failed to fetch news:', err.message);
    return [];
  }
}

/**
 * Select top trending news based on topic mix and filters
 * @param {Object} topicMix - {ph: 0.70, global: 0.30}
 * @returns {Object|null} - Selected news item or null
 */
async function fetchTrendingNews(topicMix = {ph: 0.70, global: 0.30}) {
  try {
    console.log('🔍 Starting trending news selection...\n');

    // Fetch all news
    const allNews = await fetchAllNews(topicMix);

    if (allNews.length === 0) {
      console.log('⚠️ No news items available');
      return null;
    }

    // Separate PH and global news
    const phNews = allNews.filter(item => item.isPH);
    const globalNews = allNews.filter(item => !item.isPH);

    console.log(`📊 News breakdown:`);
    console.log(`   - PH-related: ${phNews.length}`);
    console.log(`   - Global: ${globalNews.length}\n`);

    // Decide whether to pick PH or global based on mix ratio
    const rand = Math.random();
    const shouldPickPH = rand < topicMix.ph;

    let candidateNews = shouldPickPH ? phNews : globalNews;

    // Fallback to other category if selected category is empty
    if (candidateNews.length === 0) {
      console.log(`⚠️ No ${shouldPickPH ? 'PH' : 'global'} news, switching to ${shouldPickPH ? 'global' : 'PH'}`);
      candidateNews = shouldPickPH ? globalNews : phNews;
    }

    if (candidateNews.length === 0) {
      console.log('⚠️ No candidate news available');
      return null;
    }

    // Filter out duplicates
    const uniqueNews = candidateNews.filter(item => !isDuplicateNews(item));

    console.log(`📊 After duplicate filter: ${uniqueNews.length} unique news items`);

    if (uniqueNews.length === 0) {
      console.log('⚠️ All news items are duplicates (already posted)');
      return null;
    }

    // Sort by score (descending)
    uniqueNews.sort((a, b) => b.score - a.score);

    // Select top item
    const selectedNews = uniqueNews[0];

    console.log(`\n🏆 Selected news:`);
    console.log(`   Title: ${selectedNews.title}`);
    console.log(`   Source: ${selectedNews.source} (${selectedNews.news_source})`);
    console.log(`   Category: ${selectedNews.category}`);
    console.log(`   Score: ${selectedNews.score.toFixed(2)}`);
    console.log(`   Type: ${selectedNews.isPH ? 'Philippines' : 'Global'}`);
    console.log(`   URL: ${selectedNews.url}\n`);

    return selectedNews;

  } catch (err) {
    console.error('❌ Error selecting trending news:', err.message);
    return null;
  }
}

module.exports = {
  fetchTrendingNews,
  fetchAllNews,
  addToPostedCache,
  isDuplicateNews,
  loadPostedNewsCache,
  classifyNewsCategory
};

// Test if running directly
if (require.main === module) {
  console.log('🧪 Testing News Fetcher...\n');

  fetchTrendingNews({ph: 0.70, global: 0.30})
    .then(news => {
      if (news) {
        console.log('✅ Test complete! Selected news item shown above.');
      } else {
        console.log('⚠️ No news selected. Check your NewsData.io API key in .env');
      }
    })
    .catch(err => {
      console.error('❌ Test failed:', err.message);
    });
}
