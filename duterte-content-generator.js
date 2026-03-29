require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// File paths
const factsDatabaseFile = path.join(__dirname, 'duterte-facts-database.json');
const videoPostsLogFile = path.join(__dirname, 'duterte-video-posts-log.json');

/**
 * Load facts database
 * @returns {Object} - Database with facts array and categories
 */
function loadFactsDatabase() {
  try {
    if (!fs.existsSync(factsDatabaseFile)) {
      throw new Error('Facts database not found');
    }
    return JSON.parse(fs.readFileSync(factsDatabaseFile, 'utf-8'));
  } catch (err) {
    console.error('❌ Error loading facts database:', err.message);
    throw err;
  }
}

/**
 * Load video posts log
 * @returns {Array} - Log entries
 */
function loadVideoPostsLog() {
  if (!fs.existsSync(videoPostsLogFile)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(videoPostsLogFile, 'utf-8'));
  } catch (err) {
    console.warn('⚠️ Error loading video posts log:', err.message);
    return [];
  }
}

/**
 * Check if content is duplicate (already posted)
 * @param {number} contentId - ID of content to check
 * @returns {boolean}
 */
function isDuplicateVideo(contentId) {
  const log = loadVideoPostsLog();
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  return log.some(entry => {
    const entryTime = new Date(entry.timestamp).getTime();
    return entry.content_id === contentId && entryTime > sevenDaysAgo;
  });
}

/**
 * Select Duterte content using weighted random selection
 * @returns {Object|null} - Selected content object or null
 */
function selectDuterteContent() {
  try {
    const database = loadFactsDatabase();
    const { facts, categories } = database;

    // Filter out duplicates (posted in last 7 days)
    const availableFacts = facts.filter(fact => !isDuplicateVideo(fact.id));

    if (availableFacts.length === 0) {
      console.warn('⚠️ No available facts (all recently posted)');
      return null;
    }

    // Weighted random selection by category
    // Calculate target counts
    const targetCounts = {};
    const totalFacts = availableFacts.length;

    for (const [category, weight] of Object.entries(categories)) {
      targetCounts[category] = Math.round(totalFacts * weight);
    }

    // Group facts by category
    const factsByCategory = {};
    for (const fact of availableFacts) {
      if (!factsByCategory[fact.category]) {
        factsByCategory[fact.category] = [];
      }
      factsByCategory[fact.category].push(fact);
    }

    // Random category selection based on weights
    const rand = Math.random();
    let cumulative = 0;
    let selectedCategory = null;

    for (const [category, weight] of Object.entries(categories)) {
      cumulative += weight;
      if (rand < cumulative) {
        selectedCategory = category;
        break;
      }
    }

    // Fallback to first category if selection failed
    if (!selectedCategory || !factsByCategory[selectedCategory] || factsByCategory[selectedCategory].length === 0) {
      // Pick any available category
      selectedCategory = Object.keys(factsByCategory)[0];
    }

    // Random selection within category
    const categoryFacts = factsByCategory[selectedCategory];
    const selectedFact = categoryFacts[Math.floor(Math.random() * categoryFacts.length)];

    console.log(`✅ Selected content: ${selectedFact.headline} (${selectedFact.category})`);
    return selectedFact;

  } catch (err) {
    console.error('❌ Error selecting content:', err.message);
    return null;
  }
}

/**
 * Generate Taglish caption for video using Claude AI
 * @param {Object} content - Content object from database
 * @returns {Promise<Object>} - {caption, hashtags}
 */
async function generateVideoCaption(content) {
  try {
    console.log('🤖 Generating Taglish caption with Claude AI...');

    const prompt = `Generate a viral Facebook caption in TAGLISH (mix of Tagalog and English) for this Duterte politics video:

Headline: ${content.headline}
Content: ${content.content}
Category: ${content.category}
Sentiment: ${content.sentiment}

Requirements:
- Write in TAGLISH (natural mix of Tagalog and English, as Filipinos speak on social media)
- 40-80 words total
- Strong emotional hook in first sentence
- Use natural Filipino expressions: "Grabe!", "Sa totoo lang", "Nakakaproud", "Relate?", "Totoo ba?"
- Match the sentiment (positive = exciting/proud, controversial = balanced/fair, neutral = informative)
- End with an engaging question to encourage comments
- Write naturally, as if talking to Filipino friends on Facebook

Return ONLY a valid JSON object with this structure:
{
  "caption": "your taglish caption here"
}

Example for positive sentiment:
{
  "caption": "Grabe! Did you know na ang Build Build Build program ay nagtayo ng 29,000 km ng kalsada? Nakakaproud ang achievements na ito for infrastructure development. What do you think, sulit ba ang investment?"
}

Example for controversial sentiment:
{
  "caption": "Let's talk about the drug war. Official records show 6,000+ casualties sa operations. Iba-iba ang opinions - some say effective, others raise human rights concerns. Ano sa tingin niyo, worth it ba o may better approach?"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Parse JSON from response
    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Generate hashtags based on category
    const hashtagsByCategory = {
      policy: '#Duterte #FPRRD #Philippines #Politics #PolitikaPH #Policy',
      achievements: '#Duterte #FPRRD #Philippines #Achievements #Progress #PinoyPride',
      controversy: '#Duterte #FPRRD #Philippines #Politics #Discussion #PinoyNews',
      quotes: '#Duterte #FPRRD #Philippines #Quotes #Leadership #Inspiration',
      sara_duterte: '#SaraDuterte #Duterte #Philippines #Politics #InDayS Sara'
    };

    const hashtags = hashtagsByCategory[content.category] || hashtagsByCategory.policy;

    console.log('✅ Caption generated successfully');

    return {
      caption: parsed.caption,
      hashtags: hashtags
    };

  } catch (err) {
    console.error('❌ Error generating caption:', err.message);

    // Fallback caption based on sentiment
    const fallbackCaptions = {
      positive: `Nakakaproud! ${content.headline} - ${content.content.substring(0, 80)}... Ano sa tingin niyo?`,
      neutral: `${content.headline} - ${content.content.substring(0, 80)}... Share your thoughts!`,
      controversial: `Let's discuss: ${content.headline}. ${content.content.substring(0, 60)}... What's your take on this?`,
      inspirational: `"${content.content}" - President Duterte. Ano ang ibig sabihin nito para sa inyo?`
    };

    const fallbackCaption = fallbackCaptions[content.sentiment] || fallbackCaptions.neutral;
    const fallbackHashtags = '#Duterte #FPRRD #Philippines #Politics #PinoyNews';

    return {
      caption: fallbackCaption,
      hashtags: fallbackHashtags
    };
  }
}

module.exports = {
  selectDuterteContent,
  generateVideoCaption,
  isDuplicateVideo,
  loadFactsDatabase
};

// Test if running directly
if (require.main === module) {
  console.log('🧪 Testing Duterte Content Generator...\\n');

  const content = selectDuterteContent();
  if (content) {
    console.log('\\nSelected Content:');
    console.log(JSON.stringify(content, null, 2));

    generateVideoCaption(content)
      .then(({ caption, hashtags }) => {
        console.log('\\nGenerated Caption:');
        console.log(caption);
        console.log('\\nHashtags:');
        console.log(hashtags);
        console.log('\\n✅ Test complete!');
      })
      .catch(err => {
        console.error('\\n❌ Test failed:', err.message);
      });
  } else {
    console.log('⚠️ No content available for selection');
  }
}
