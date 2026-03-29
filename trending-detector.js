require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USERNAME = process.env.REDDIT_USERNAME;
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD;
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyCkhnbr6qOos1cUEEbRHHsevakJJte5CYo';

// Cache file paths
const trendingCacheFile = path.join(__dirname, 'trending-cache.json');
const configFile = path.join(__dirname, 'trending-config.json');

// Load configuration
let config = {
  detection: {
    sources: {
      reddit: {
        enabled: true,
        subreddits: ['Philippines', 'Duterte'],
        min_score: 50,
        timeframe_hours: 6,
        weight: 0.4
      },
      news: {
        enabled: true,
        keywords: ['Duterte', 'FPRRD', 'Rodrigo Duterte'],
        timeframe_hours: 6,
        weight: 0.4
      },
      youtube: {
        enabled: true,
        search_terms: ['Duterte latest', 'Duterte news'],
        min_views: 1000,
        weight: 0.2
      }
    }
  }
};

// Try to load config from file if it exists
if (fs.existsSync(configFile)) {
  try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  } catch (err) {
    console.warn('⚠️ Failed to load trending-config.json, using defaults');
  }
}

/**
 * Get Reddit OAuth2 access token
 */
async function getRedditAccessToken() {
  try {
    const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=password&username=' + REDDIT_USERNAME + '&password=' + REDDIT_PASSWORD,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TrendingDetector/1.0'
        }
      }
    );

    return response.data.access_token;
  } catch (err) {
    console.error('❌ Reddit OAuth failed:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Detect trending topics from Reddit
 */
async function detectRedditTrending() {
  if (!config.detection.sources.reddit.enabled) {
    console.log('ℹ️ Reddit detection disabled in config');
    return [];
  }

  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
    console.warn('⚠️ Reddit credentials not configured, skipping Reddit detection');
    return [];
  }

  try {
    console.log('🔍 Detecting trending topics from Reddit...');

    // Get access token
    const accessToken = await getRedditAccessToken();
    if (!accessToken) {
      throw new Error('Failed to get Reddit access token');
    }

    const subreddits = config.detection.sources.reddit.subreddits;
    const minScore = config.detection.sources.reddit.min_score;
    const timeframeHours = config.detection.sources.reddit.timeframe_hours;
    const duterteKeywords = ['duterte', 'fprrd', 'rodrigo', 'digong'];

    const trendingTopics = [];

    // Check each subreddit
    for (const subreddit of subreddits) {
      try {
        const response = await axios.get(
          `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=50`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': 'TrendingDetector/1.0'
            }
          }
        );

        const posts = response.data.data.children;

        for (const post of posts) {
          const data = post.data;
          const title = data.title.toLowerCase();
          const selftext = (data.selftext || '').toLowerCase();
          const combined = title + ' ' + selftext;

          // Check if post mentions Duterte
          const mentionsDuterte = duterteKeywords.some(keyword => combined.includes(keyword));

          if (!mentionsDuterte) continue;

          // Check if post is recent enough
          const postAge = (Date.now() - data.created_utc * 1000) / (1000 * 60 * 60); // hours
          if (postAge > timeframeHours) continue;

          // Calculate trending score
          const score = (data.ups * 0.5) + (data.num_comments * 0.3) + ((data.total_awards_received || 0) * 0.2);

          if (score < minScore) continue;

          trendingTopics.push({
            title: data.title,
            source: 'reddit',
            source_url: `https://reddit.com${data.permalink}`,
            score: score,
            raw_score: {
              upvotes: data.ups,
              comments: data.num_comments,
              awards: data.total_awards_received || 0
            },
            timestamp: new Date(data.created_utc * 1000).toISOString(),
            subreddit: subreddit
          });
        }
      } catch (err) {
        console.error(`❌ Error checking r/${subreddit}:`, err.message);
      }
    }

    console.log(`✅ Found ${trendingTopics.length} trending topics on Reddit`);
    return trendingTopics;

  } catch (err) {
    console.error('❌ Reddit trending detection failed:', err.message);
    return [];
  }
}

/**
 * Detect trending topics from news sources
 */
async function detectNewsTrending() {
  if (!config.detection.sources.news.enabled) {
    console.log('ℹ️ News detection disabled in config');
    return [];
  }

  if (!NEWSDATA_API_KEY || NEWSDATA_API_KEY === 'your_newsdata_io_api_key_here') {
    console.warn('⚠️ NewsData.io API key not configured, skipping news detection');
    return [];
  }

  try {
    console.log('🔍 Detecting trending topics from news sources...');

    const keywords = config.detection.sources.news.keywords.join(' OR ');
    const timeframeHours = config.detection.sources.news.timeframe_hours;

    // Calculate time window
    const fromTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000).toISOString();

    const response = await axios.get('https://newsdata.io/api/1/news', {
      params: {
        apikey: NEWSDATA_API_KEY,
        q: 'Duterte',
        country: 'ph',
        language: 'en',
        from_date: fromTime.split('T')[0] // YYYY-MM-DD format
      }
    });

    if (!response.data.results || response.data.results.length === 0) {
      console.log('ℹ️ No recent news articles found');
      return [];
    }

    const trendingTopics = response.data.results.map(article => {
      // Calculate recency score (more recent = higher score)
      const articleAge = (Date.now() - new Date(article.pubDate).getTime()) / (1000 * 60 * 60); // hours
      const recencyScore = Math.max(0, 100 - (articleAge * 10)); // Decays over time

      // Source authority score (basic heuristic)
      const authorityScore = 50; // Could be enhanced with source reputation data

      return {
        title: article.title,
        source: 'news',
        source_url: article.link,
        score: recencyScore + authorityScore,
        raw_score: {
          recency: recencyScore,
          authority: authorityScore
        },
        timestamp: article.pubDate,
        news_source: article.source_id,
        description: article.description
      };
    });

    console.log(`✅ Found ${trendingTopics.length} trending news articles`);
    return trendingTopics;

  } catch (err) {
    console.error('❌ News trending detection failed:', err.response?.data || err.message);
    return [];
  }
}

/**
 * Detect trending topics from YouTube
 */
async function detectYouTubeTrending() {
  if (!config.detection.sources.youtube.enabled) {
    console.log('ℹ️ YouTube detection disabled in config');
    return [];
  }

  try {
    console.log('🔍 Detecting trending topics from YouTube...');

    const searchTerms = config.detection.sources.youtube.search_terms;
    const minViews = config.detection.sources.youtube.min_views;
    const trendingTopics = [];

    // Search for each term
    for (const searchTerm of searchTerms) {
      try {
        // Calculate time window (last 24 hours)
        const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: searchTerm,
            type: 'video',
            order: 'date',
            publishedAfter: publishedAfter,
            maxResults: 10,
            key: YOUTUBE_API_KEY,
            relevanceLanguage: 'en',
            regionCode: 'PH'
          }
        });

        if (!response.data.items || response.data.items.length === 0) {
          continue;
        }

        // Get video statistics for each result
        const videoIds = response.data.items.map(item => item.id.videoId).join(',');

        const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            part: 'statistics,contentDetails',
            id: videoIds,
            key: YOUTUBE_API_KEY
          }
        });

        for (let i = 0; i < response.data.items.length; i++) {
          const video = response.data.items[i];
          const stats = statsResponse.data.items[i]?.statistics;

          if (!stats) continue;

          const viewCount = parseInt(stats.viewCount || 0);
          if (viewCount < minViews) continue;

          // Calculate hours since published
          const publishedTime = new Date(video.snippet.publishedAt).getTime();
          const hoursSincePublished = (Date.now() - publishedTime) / (1000 * 60 * 60);

          if (hoursSincePublished === 0) continue; // Avoid division by zero

          // Calculate velocity score (views per hour)
          const viewVelocity = viewCount / hoursSincePublished;

          // Calculate engagement rate
          const likeCount = parseInt(stats.likeCount || 0);
          const commentCount = parseInt(stats.commentCount || 0);
          const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

          // Combined trending score
          const trendingScore = (viewVelocity * 0.7) + (engagementRate * 0.3);

          trendingTopics.push({
            title: video.snippet.title,
            source: 'youtube',
            source_url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            score: trendingScore,
            raw_score: {
              views: viewCount,
              view_velocity: viewVelocity,
              engagement_rate: engagementRate,
              likes: likeCount,
              comments: commentCount
            },
            timestamp: video.snippet.publishedAt,
            video_id: video.id.videoId,
            channel: video.snippet.channelTitle
          });
        }
      } catch (err) {
        console.error(`❌ Error searching YouTube for "${searchTerm}":`, err.message);
      }
    }

    console.log(`✅ Found ${trendingTopics.length} trending YouTube videos`);
    return trendingTopics;

  } catch (err) {
    console.error('❌ YouTube trending detection failed:', err.message);
    return [];
  }
}

/**
 * Load trending cache to avoid duplicates
 */
function loadTrendingCache() {
  if (fs.existsSync(trendingCacheFile)) {
    try {
      const cache = JSON.parse(fs.readFileSync(trendingCacheFile, 'utf-8'));
      // Filter out expired entries (older than 24 hours)
      const expiryTime = Date.now() - 24 * 60 * 60 * 1000;
      return cache.filter(entry => new Date(entry.cached_at).getTime() > expiryTime);
    } catch (err) {
      console.warn('⚠️ Failed to load trending cache:', err.message);
      return [];
    }
  }
  return [];
}

/**
 * Add topic to trending cache
 */
function addToTrendingCache(topic) {
  const cache = loadTrendingCache();

  cache.push({
    title: topic.title,
    source: topic.source,
    cached_at: new Date().toISOString()
  });

  fs.writeFileSync(trendingCacheFile, JSON.stringify(cache, null, 2));
}

/**
 * Check if topic is in cache (duplicate detection)
 */
function isTopicCached(topic) {
  const cache = loadTrendingCache();

  // Check for similar titles (case-insensitive, partial match)
  return cache.some(cached => {
    const similarity = topic.title.toLowerCase().includes(cached.title.toLowerCase()) ||
                      cached.title.toLowerCase().includes(topic.title.toLowerCase());
    return similarity;
  });
}

/**
 * Get top trending topics from all sources
 */
async function getTopTrendingTopics(limit = 5) {
  console.log('\n🔍 Starting trending topic detection...\n');

  try {
    // Detect from all sources in parallel
    const [redditTopics, newsTopics, youtubeTopics] = await Promise.all([
      detectRedditTrending(),
      detectNewsTrending(),
      detectYouTubeTrending()
    ]);

    // Merge all topics
    let allTopics = [
      ...redditTopics.map(t => ({ ...t, weighted_score: t.score * config.detection.sources.reddit.weight })),
      ...newsTopics.map(t => ({ ...t, weighted_score: t.score * config.detection.sources.news.weight })),
      ...youtubeTopics.map(t => ({ ...t, weighted_score: t.score * config.detection.sources.youtube.weight }))
    ];

    console.log(`\n📊 Total topics found: ${allTopics.length}`);
    console.log(`   - Reddit: ${redditTopics.length}`);
    console.log(`   - News: ${newsTopics.length}`);
    console.log(`   - YouTube: ${youtubeTopics.length}\n`);

    // Filter out cached topics
    const uncachedTopics = allTopics.filter(topic => !isTopicCached(topic));
    console.log(`✅ Topics after cache filter: ${uncachedTopics.length}`);

    if (uncachedTopics.length === 0) {
      console.log('ℹ️ No new trending topics found (all cached)');
      return [];
    }

    // Sort by weighted score
    uncachedTopics.sort((a, b) => b.weighted_score - a.weighted_score);

    // Return top N
    const topTopics = uncachedTopics.slice(0, limit);

    console.log(`\n🏆 Top ${topTopics.length} trending topics:\n`);
    topTopics.forEach((topic, index) => {
      console.log(`${index + 1}. [${topic.source.toUpperCase()}] ${topic.title}`);
      console.log(`   Score: ${topic.weighted_score.toFixed(2)} | ${topic.source_url}`);
    });
    console.log('');

    return topTopics;

  } catch (err) {
    console.error('❌ Failed to get trending topics:', err.message);
    return [];
  }
}

// Export functions
module.exports = {
  detectRedditTrending,
  detectNewsTrending,
  detectYouTubeTrending,
  getTopTrendingTopics,
  addToTrendingCache,
  loadTrendingCache,
  isTopicCached
};

// If running directly (for testing)
if (require.main === module) {
  console.log('🧪 Testing Trending Detector...\n');
  getTopTrendingTopics(5).then(topics => {
    console.log('\n✅ Test complete!');
    if (topics.length === 0) {
      console.log('⚠️ No trending topics detected. Check your API credentials in .env file.');
    }
  }).catch(err => {
    console.error('❌ Test failed:', err);
  });
}
