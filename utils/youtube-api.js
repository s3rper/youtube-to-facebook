require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyAgfCknsb2EjgK0TvvGKZAoQpwksLmgD1Y';
//const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyC1WOaBUki-QmXnkeGUdTW1t-sq3PiBiCU';

/**const API_KEY = 'AIzaSyC1WOaBUki-QmXnkeGUdTW1t-sq3PiBiCU';
 * Search YouTube videos with custom parameters
 * @param {Object} options - Search options
 * @param {string} options.query - Search query
 * @param {string} options.order - Sort order (date, viewCount, relevance, rating)
 * @param {number} options.maxResults - Maximum results (1-50)
 * @param {string} options.regionCode - Region code (e.g. 'US', 'PH')
 * @param {string} options.relevanceLanguage - Language filter (e.g. 'en', 'tl')
 * @param {string} options.publishedAfter - ISO 8601 date for filtering recent videos
 * @param {string} options.videoDuration - Duration filter (any, short, medium, long)
 * @returns {Promise<Array>} Array of video items
 */
async function searchVideos(options) {
  const {
    query = '',
    order = 'date',
    maxResults = 50,
    regionCode = 'US',
    relevanceLanguage = 'en',
    publishedAfter = null,
    videoDuration = null,
  } = options;

  const params = {
    part: 'snippet',
    type: 'video',
    maxResults,
    key: API_KEY,
  };

  if (query) params.q = query;
  if (order) params.order = order;
  if (regionCode) params.regionCode = regionCode;
  if (relevanceLanguage) params.relevanceLanguage = relevanceLanguage;
  if (publishedAfter) params.publishedAfter = publishedAfter;
  if (videoDuration) params.videoDuration = videoDuration;
  params.safeSearch = 'moderate';

  try {
    const url = 'https://www.googleapis.com/youtube/v3/search';
    const response = await axios.get(url, { params });
    return response.data.items || [];
  } catch (error) {
    console.error('❌ YouTube API search error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Search trending videos from last 24 hours
 * Uses multiple search strategies to find viral content
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Combined array of trending videos
 */
async function searchTrendingVideos(options = {}) {
  const {
    maxResults = 50,
    regionCode = 'PH',
    videoDuration = 'short',  // Changed to 'short' for videos under 4 minutes (includes Shorts)
    hoursAgo = 24,
  } = options;

  const publishedAfter = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  console.log(`🔍 Searching for trending videos from last ${hoursAgo} hours...`);

  // All available search topics - will randomly select ONE per search cycle
  const searchTopics = [
    'Philippines Trending Politics',
    // Inspirational quotes - Politics
    'inspirational quotes politics',
    'political wisdom quotes',
    'quotes about politics',
    'political motivation',
    // Inspirational quotes - Life
    'inspirational quotes life',
    'life wisdom quotes',
    'motivational life quotes',
    'quotes about life',
    'life lessons quotes',
    // Inspirational quotes - Love
    'inspirational quotes love',
    'love wisdom quotes',
    'quotes about love',
    'love motivation',
    'relationship quotes',
    // Inspirational quotes - God/Faith
    'inspirational quotes God',
    'quotes about God',
    'faith quotes',
    'spiritual wisdom',
    'God motivation quotes',
    'biblical quotes',
  ];

  // Randomly select ONE topic for this search cycle
  const selectedTopic = searchTopics[Math.floor(Math.random() * searchTopics.length)];
  console.log(`   🎲 Randomly selected topic: "${selectedTopic}"`);

  const allVideos = [];

  // Strategy 1: Search by date (newest) with the selected topic
  try {
    const videos = await searchVideos({
      query: selectedTopic,
      order: 'date',  // Get newest videos, not sorted by views
      maxResults: 50,  // Increased since we're only searching one topic
      regionCode,
      relevanceLanguage: 'en',
      publishedAfter,
      videoDuration: null,  // Don't filter by duration in API, we'll filter ourselves
    });

    if (videos.length > 0) {
      console.log(`   Found ${videos.length} videos for "${selectedTopic}"`);
      allVideos.push(...videos);
    }
  } catch (err) {
    console.error(`   ⚠️ Search failed for "${selectedTopic}":`, err.message);
  }

  // Strategy 2: Complementary search - regional content (smaller set as backup)
  try {
    const regionalVideos = await searchVideos({
      order: 'date',
      maxResults: 20,  // Reduced since we have focused topic search above
      regionCode,
      publishedAfter,
      videoDuration: null,  // Don't filter by duration in API
    });

    if (regionalVideos.length > 0) {
      console.log(`   Found ${regionalVideos.length} regional videos (backup)`);
      allVideos.push(...regionalVideos);
    }
  } catch (err) {
    console.error(`   ⚠️ Regional search failed:`, err.message);
  }

  // Deduplicate by video ID
  const uniqueVideos = Array.from(
    new Map(allVideos.map(v => [v.id.videoId, v])).values()
  );

  console.log(`   Total unique videos: ${uniqueVideos.length}`);

  return uniqueVideos;
}

/**
 * Get detailed video statistics and metadata
 * @param {Array<string>} videoIds - Array of video IDs (max 50 per request)
 * @returns {Promise<Array>} Array of video details
 */
async function getVideoDetails(videoIds) {
  if (!videoIds || videoIds.length === 0) return [];

  try {
    const url = 'https://www.googleapis.com/youtube/v3/videos';
    const response = await axios.get(url, {
      params: {
        part: 'statistics,contentDetails,snippet',
        id: videoIds.join(','),
        key: API_KEY,
      },
    });

    return response.data.items || [];
  } catch (error) {
    console.error('❌ YouTube API video details error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Enrich video items with statistics and details
 * @param {Array} videos - Array of video items from search
 * @returns {Promise<Array>} Array of enriched videos
 */
async function enrichVideosWithStats(videos) {
  if (!videos || videos.length === 0) return [];

  const videoIds = videos.map(v => v.id.videoId).filter(Boolean);
  if (videoIds.length === 0) return [];

  console.log(`📊 Enriching ${videoIds.length} videos with statistics...`);

  // YouTube API allows max 50 IDs per request
  const enrichedVideos = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const details = await getVideoDetails(batch);

    // Merge search results with detailed stats
    for (const detail of details) {
      const originalVideo = videos.find(v => v.id.videoId === detail.id);
      if (originalVideo) {
        enrichedVideos.push({
          ...originalVideo,
          statistics: detail.statistics,
          contentDetails: detail.contentDetails,
          snippet: {
            ...originalVideo.snippet,
            ...detail.snippet, // Override with more complete snippet data
          },
        });
      }
    }
  }

  console.log(`   Enriched ${enrichedVideos.length} videos`);
  return enrichedVideos;
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT1M30S = 90 seconds, PT45S = 45 seconds
 * @param {string} duration - ISO 8601 duration string
 * @returns {number} Duration in seconds
 */
function parseDuration(duration) {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Check if video is a Short (under 2 minutes ONLY)
 * STRICT: Rejects videos without duration metadata or over 2 minutes
 * @param {Object} video - Enriched video object
 * @returns {boolean} True if video is under 2 minutes (120 seconds)
 */
function isShortVideo(video) {
  const duration = video.contentDetails?.duration;

  // STRICT: Reject videos without duration information
  if (!duration) return false;

  const seconds = parseDuration(duration);

  // STRICT: Must be between 1 second and 120 seconds (2 minutes)
  return seconds > 0 && seconds <= 120;
}

/**
 * Detect if text is in English or Tagalog based on common words/patterns
 * @param {string} text - Text to analyze (title, description, etc.)
 * @returns {string|null} 'en' for English, 'tl' for Tagalog, null if cannot determine
 */
function detectTextLanguage(text) {
  if (!text || typeof text !== 'string') return null;

  const lowerText = text.toLowerCase();

  // Common English words (high frequency)
  const englishWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one',
    'our', 'out', 'this', 'that', 'with', 'have', 'from', 'they', 'will', 'what', 'when',
    'your', 'about', 'there', 'which', 'their', 'would', 'make', 'like', 'into', 'time',
    'has', 'look', 'more', 'write', 'see', 'number', 'way', 'could', 'people', 'than',
    'first', 'water', 'been', 'call', 'who', 'oil', 'now', 'find', 'long', 'down', 'day',
    'did', 'get', 'come', 'made', 'may', 'part', 'motivation', 'inspiration', 'quotes',
    'life', 'love', 'god', 'faith', 'politics', 'wisdom', 'believe', 'hope', 'truth'
  ];

  // Common Tagalog/Filipino words (high frequency)
  const tagalogWords = [
    'ang', 'ng', 'sa', 'na', 'ay', 'mga', 'ko', 'mo', 'ka', 'nang', 'para', 'mga',
    'ako', 'siya', 'ito', 'yan', 'yung', 'lang', 'pa', 'din', 'rin', 'kasi', 'pero',
    'kung', 'dahil', 'kaya', 'naman', 'talaga', 'dapat', 'gusto', 'natin', 'atin',
    'kami', 'kayo', 'sila', 'dito', 'dyan', 'doon', 'ano', 'sino', 'saan', 'bakit',
    'paano', 'gaano', 'ilan', 'alin', 'hindi', 'oo', 'opo', 'wala', 'meron', 'mayroon',
    'tayo', 'ikaw', 'tayong', 'ninyo', 'nila', 'kanyang', 'kanila', 'amin', 'inyo',
    'pagibig', 'buhay', 'pag-ibig', 'pangarap', 'panalangin', 'puso'
  ];

  // Count matches
  let englishScore = 0;
  let tagalogScore = 0;

  englishWords.forEach(word => {
    // Use word boundaries to match whole words
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) englishScore += matches.length;
  });

  tagalogWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) tagalogScore += matches.length;
  });

  // Need at least 3 word matches to be confident
  if (englishScore >= 3 || tagalogScore >= 3) {
    return englishScore > tagalogScore ? 'en' : 'tl';
  }

  return null;
}

/**
 * Check if video language is acceptable (English or Tagalog/Filipino ONLY)
 * Checks: 1) Language metadata, 2) Description text, 3) Title text
 * @param {Object} video - Enriched video object
 * @returns {boolean} True if language is explicitly English or Tagalog/Filipino
 */
function isAcceptableLanguage(video) {
  const audioLang = video.snippet?.defaultAudioLanguage;
  const lang = video.snippet?.defaultLanguage;

  // Accept ONLY English or Tagalog/Filipino languages
  const acceptedLanguages = ['en', 'tl', 'fil', 'en-US', 'en-GB', 'en-PH', 'tl-PH'];

  // Check 1: Language metadata
  const hasAcceptableMetadata = acceptedLanguages.some(acceptedLang => {
    if (audioLang && audioLang.toLowerCase().startsWith(acceptedLang.toLowerCase())) return true;
    if (lang && lang.toLowerCase().startsWith(acceptedLang.toLowerCase())) return true;
    return false;
  });

  if (hasAcceptableMetadata) {
    return true;
  }

  // Check 2: Analyze description text for language
  const description = video.snippet?.description || '';
  const title = video.snippet?.title || '';

  // Combine title and description for better detection
  const combinedText = `${title} ${description}`;
  const detectedLang = detectTextLanguage(combinedText);

  if (detectedLang === 'en' || detectedLang === 'tl') {
    console.log(`   🔍 Language detected from text: ${detectedLang} for "${title.substring(0, 50)}..."`);
    return true;
  }

  // Reject if no language metadata and text detection failed
  return false;
}

/**
 * Calculate view velocity (views per hour)
 * @param {Object} video - Enriched video object
 * @returns {number} Views per hour
 */
function calculateViewVelocity(video) {
  const publishedAt = new Date(video.snippet.publishedAt);
  const now = new Date();
  const hoursAgo = (now - publishedAt) / (1000 * 60 * 60);

  if (hoursAgo <= 0) return 0;

  const views = parseInt(video.statistics?.viewCount || '0', 10);
  return Math.round(views / hoursAgo);
}

/**
 * Calculate engagement rate ((likes + comments) / views)
 * @param {Object} video - Enriched video object
 * @returns {number} Engagement rate (0-1)
 */
function calculateEngagementRate(video) {
  const views = parseInt(video.statistics?.viewCount || '0', 10);
  if (views === 0) return 0;

  const likes = parseInt(video.statistics?.likeCount || '0', 10);
  const comments = parseInt(video.statistics?.commentCount || '0', 10);

  return (likes + comments) / views;
}

/**
 * Calculate recency bonus based on video age
 * @param {Object} video - Enriched video object
 * @returns {number} Recency bonus (0-100)
 */
function calculateRecencyBonus(video) {
  const publishedAt = new Date(video.snippet.publishedAt);
  const now = new Date();
  const hoursAgo = (now - publishedAt) / (1000 * 60 * 60);

  if (hoursAgo < 6) return 100;
  if (hoursAgo < 12) return 50;
  return 0;
}

/**
 * Calculate trending score
 * @param {Object} video - Enriched video object
 * @returns {number} Trending score
 */
function calculateTrendingScore(video) {
  const viewVelocity = calculateViewVelocity(video);
  const engagementRate = calculateEngagementRate(video);
  const recencyBonus = calculateRecencyBonus(video);

  // Weighted scoring formula
  const score =
    viewVelocity * 0.5 +           // 50% weight - velocity is key
    engagementRate * 1000 * 0.3 +  // 30% weight - quality engagement
    recencyBonus * 0.2;            // 20% weight - newer = better

  return Math.round(score);
}

/**
 * Filter videos by trending thresholds
 * @param {Array} videos - Array of enriched videos
 * @param {Object} thresholds - Threshold configuration
 * @returns {Array} Filtered videos sorted by trending score
 */
function filterByTrendingThresholds(videos, thresholds = {}) {
  const {
    minViews = 0,  // Changed default to 0 for more permissive filtering
    minViewVelocity = 0,  // Changed default to 0
    minEngagementRate = 0.01,  // Changed default to 1% (was 5%)
    maxVideoAgeHours = 24,
  } = thresholds;

  console.log(`   Thresholds: ${minViews} views, ${minViewVelocity} views/hr, ${(minEngagementRate * 100).toFixed(1)}% engagement`);

  // First, calculate metrics for all videos
  const withMetrics = videos.map(video => ({
    ...video,
    viewVelocity: calculateViewVelocity(video),
    engagementRate: calculateEngagementRate(video),
    trendingScore: 0,  // Will calculate after filtering
  }));

  // Show top 5 videos before filtering (for debugging)
  console.log(`\n   📊 Sample metrics from videos found:`);
  withMetrics.slice(0, 5).forEach((video, i) => {
    const views = parseInt(video.statistics?.viewCount || '0', 10);
    console.log(`   ${i + 1}. "${video.snippet.title.substring(0, 50)}..."`);
    console.log(`      Views: ${views.toLocaleString()}, Velocity: ${video.viewVelocity.toLocaleString()}/hr, Engagement: ${(video.engagementRate * 100).toFixed(2)}%`);
  });

  const filtered = withMetrics.filter(video => {
    const views = parseInt(video.statistics?.viewCount || '0', 10);
    const publishedAt = new Date(video.snippet.publishedAt);
    const hoursAgo = (new Date() - publishedAt) / (1000 * 60 * 60);

    // Apply all threshold filters
    if (views < minViews) return false;
    if (video.viewVelocity < minViewVelocity) return false;
    if (video.engagementRate < minEngagementRate) return false;
    if (hoursAgo > maxVideoAgeHours) return false;

    return true;
  });

  // Calculate trending scores for filtered videos
  const scored = filtered.map(video => ({
    ...video,
    trendingScore: calculateTrendingScore(video),
  }));

  // Sort by trending score (highest first)
  scored.sort((a, b) => b.trendingScore - a.trendingScore);

  return scored;
}

module.exports = {
  searchVideos,
  searchTrendingVideos,
  getVideoDetails,
  enrichVideosWithStats,
  detectTextLanguage,
  isAcceptableLanguage,
  isShortVideo,
  parseDuration,
  calculateViewVelocity,
  calculateEngagementRate,
  calculateRecencyBonus,
  calculateTrendingScore,
  filterByTrendingThresholds,
};
