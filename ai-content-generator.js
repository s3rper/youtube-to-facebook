require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate original political post content about Philippines
 * @param {string} topic - The topic to write about
 * @returns {Object} - {headline, content, emotion, target_audience}
 */
async function generatePoliticalPost(topic) {
  const prompt = `Generate an original, engaging post about Philippines politics/news IN TAGLISH (Tagalog-English mix).

Topic: ${topic}

Requirements:
- Write in TAGLISH (mix of Tagalog and English) - natural Filipino social media style
- Original analysis/commentary (not copied from any source)
- 100-150 words
- Emotional hook in the first sentence
- Use Filipino expressions and colloquialisms naturally
- Balanced perspective that respects different viewpoints
- Should be informative and thought-provoking
- Examples of Taglish style: "Ang legacy ni Duterte", "Sa totoo lang", "Kailangan natin", "Let's be real"

Return ONLY a valid JSON object with this exact format:
{
  "headline": "Compelling headline in Taglish",
  "content": "Full post content in Taglish",
  "emotion": "primary emotion (e.g., hope, pride, concern)",
  "target_audience": "who this resonates with"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('✅ Generated political post:', parsed.headline);
    return parsed;
  } catch (err) {
    console.error('❌ Error generating political post:', err.message);
    throw err;
  }
}

/**
 * Score the viral potential of content (1-100)
 * @param {Object} postData - {headline, content}
 * @returns {Object} - {score, reason, improvement_suggestions}
 */
async function scoreViralPotential(postData) {
  const prompt = `Score this social media post's viral potential from 1-100.

Headline: ${postData.headline}
Content: ${postData.content}

Consider:
- Emotional trigger strength (does it make people feel something?)
- Shareability factor (will people want to share this?)
- Controversy level (balanced - not too extreme, not too bland)
- Curiosity gap (does it make people want to read/engage?)
- Call-to-action clarity
- Relevance to Filipino audience

Return ONLY a valid JSON object:
{
  "score": 85,
  "reason": "Brief explanation of score",
  "improvement_suggestions": "How to improve if needed"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`📊 Virality Score: ${parsed.score}/100 - ${parsed.reason}`);
    return parsed;
  } catch (err) {
    console.error('❌ Error scoring viral potential:', err.message);
    throw err;
  }
}

/**
 * Match content with the most relevant Shopee product
 * @param {Object} postData - {headline, content}
 * @param {Array} shopeeProducts - List of Shopee products from duterte-shopee-list.json
 * @returns {Object} - {product_index, reason, product}
 */
async function matchProduct(postData, shopeeProducts) {
  const productSummaries = shopeeProducts.map((p, idx) => {
    const name = p.batch_item_for_item_card_full?.name || 'Unknown product';
    const price = p.batch_item_for_item_card_full?.price || 0;
    const link = p.productOfferLink || '';
    return `${idx}: ${name} (₱${(price / 100000).toFixed(2)}) - ${link}`;
  }).join('\n');

  const prompt = `Match this social media post with the most relevant Duterte merchandise product.

Post Headline: ${postData.headline}
Post Content: ${postData.content}

Available Products:
${productSummaries}

Select the product that:
- Aligns best with the post's sentiment and message
- Has a natural connection to the content theme
- Would appeal to the same audience reading the post

Return ONLY a valid JSON object:
{
  "product_index": 0,
  "reason": "Brief explanation of why this product matches"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const selectedProduct = shopeeProducts[parsed.product_index];

    console.log(`🎯 Matched Product: ${selectedProduct.batch_item_for_item_card_full?.name}`);
    console.log(`   Reason: ${parsed.reason}`);

    return {
      ...parsed,
      product: selectedProduct
    };
  } catch (err) {
    console.error('❌ Error matching product:', err.message);
    console.log('⚠️ Falling back to random product');
    const randomIndex = Math.floor(Math.random() * shopeeProducts.length);
    return {
      product_index: randomIndex,
      reason: 'Fallback selection due to AI error',
      product: shopeeProducts[randomIndex]
    };
  }
}

/**
 * Generate optimized Facebook caption
 * @param {Object} postData - {headline, content}
 * @param {Object} product - Shopee product object
 * @returns {Object} - {caption, hashtags}
 */
async function generateCaption(postData, product) {
  const productName = product.batch_item_for_item_card_full?.name || 'Duterte merchandise';

  const prompt = `Create a viral Facebook caption for this post IN TAGLISH (Tagalog-English mix).

Post Headline: ${postData.headline}
Post Content: ${postData.content}
Related Product: ${productName}

Requirements:
- Write in TAGLISH (natural Filipino social media style)
- Hook in the first line (emotional or curiosity-driven in Taglish)
- 40-60 words total
- Use Filipino expressions naturally ("Totoo ba?", "Grabe!", "Relate?")
- Emotional trigger that connects to post theme
- Natural, subtle mention that merchandise is available (don't be salesy)
- Strong call-to-action at end in Taglish
- Avoid spam words like "BUY NOW", "LIMITED TIME", "CLICK HERE"
- Conversational, engaging Filipino tone

Return ONLY a valid JSON object:
{
  "caption": "Full caption text in Taglish",
  "hashtags": "#Duterte #Philippines #Politics #Pinoy"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('📝 Generated Caption:', parsed.caption.substring(0, 100) + '...');
    return parsed;
  } catch (err) {
    console.error('❌ Error generating caption:', err.message);
    throw err;
  }
}

/**
 * Generate persuasive comment for affiliate link
 * @param {Object} product - Shopee product object
 * @returns {string} - Comment text with link
 */
async function generatePersuasiveComment(product) {
  const productName = product.batch_item_for_item_card_full?.name || 'Duterte merchandise';
  const productLink = product.productOfferLink || '';

  const prompt = `Create a short, persuasive comment to promote this product IN TAGLISH (Tagalog-English mix).

Product: ${productName}

Requirements:
- Write in TAGLISH (natural Filipino conversational style)
- Maximum 20 words
- Curiosity-driven (make people want to click)
- Non-spammy, conversational Filipino tone
- Use expressions like "Panalo!", "Ganda nito!", "Para sa mga supporters"
- Don't use words like "BUY", "LIMITED", "HURRY"
- Should feel natural and helpful, like a friend recommending

Return ONLY the comment text in Taglish (no JSON, just the text).`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 128,
      messages: [{ role: 'user', content: prompt }],
    });

    const commentText = message.content[0].text.trim();
    const finalComment = `${commentText} ${productLink}`;

    console.log('💬 Generated Comment:', finalComment);
    return finalComment;
  } catch (err) {
    console.error('❌ Error generating comment:', err.message);
    return `Check out this Duterte merchandise! ${productLink}`;
  }
}

/**
 * Optimize existing content for virality (rewrite to be more engaging)
 * @param {Object} postData - {headline, content}
 * @returns {Object} - {headline, content}
 */
async function optimizeForVirality(postData) {
  const prompt = `Rewrite this social media post to maximize viral potential and engagement. Keep it in TAGLISH (Tagalog-English mix).

Original Headline: ${postData.headline}
Original Content: ${postData.content}

Requirements:
- MAINTAIN TAGLISH language style (Tagalog-English mix)
- Strengthen emotional hook in first sentence
- Add more curiosity triggers using Filipino expressions
- Make it more shareable for Filipino audience
- Keep the same message and facts
- 100-150 words
- Balanced, respectful tone
- Natural Filipino social media voice

Return ONLY a valid JSON object:
{
  "headline": "Optimized headline in Taglish",
  "content": "Optimized content in Taglish"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('✨ Optimized content for virality');
    return parsed;
  } catch (err) {
    console.error('❌ Error optimizing content:', err.message);
    return postData;
  }
}

/**
 * Generate Taglish news caption for trending news
 * @param {Object} newsItem - News object with title, description, category
 * @returns {Object} - {caption, hashtags}
 */
async function generateNewsCaption(newsItem) {
  // Hashtags by category
  const hashtagsByCategory = {
    politics: '#Philippines #Politics #PolitikaPH #Pilipinas #PinoyNews',
    economy: '#PHEconomy #Business #Philippines #Economy #Pilipinas',
    global: '#WorldNews #GlobalNews #Philippines #InternationalNews',
    breaking: '#BreakingNews #LatestNews #Philippines #NewsUpdate',
    default: '#Philippines #News #Pilipinas #PinoyNews'
  };

  const categoryHashtags = hashtagsByCategory[newsItem.category] || hashtagsByCategory.default;

  const prompt = `Generate a viral Facebook caption in TAGLISH for this news.

News Headline: ${newsItem.title}
News Summary: ${newsItem.description || 'No summary available'}
Category: ${newsItem.category}
Source: ${newsItem.news_source || newsItem.source}

Requirements:
- TAGLISH (natural Filipino social media style - mix Tagalog and English)
- Strong emotional hook in first sentence
- 40-80 words total (2-3 sentences)
- Use Filipino expressions naturally: "Grabe!", "Totoo ba?", "Sa totoo lang", "Relate?"
- Conversational, professional tone
- End with engaging question to encourage comments
- NO promotional language, NO affiliate links, NO product mentions

Example style:
"Grabe! Breaking news about [topic]. Sa totoo lang, maraming Filipinos ang apektado nito.
What do you think mga ka-PH? Share your thoughts! 🇵🇭"

Return ONLY a valid JSON object with this exact format:
{
  "caption": "Full caption text in Taglish",
  "hashtags": "${categoryHashtags}"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('📝 Generated News Caption:', parsed.caption.substring(0, 100) + '...');

    return parsed;

  } catch (err) {
    console.error('❌ Error generating news caption:', err.message);

    // Fallback caption template
    const fallbackCaption = `${newsItem.title}

${(newsItem.description || '').substring(0, 150)}${newsItem.description && newsItem.description.length > 150 ? '...' : ''}

${categoryHashtags}`;

    console.log('⚠️ Using fallback caption template');

    return {
      caption: fallbackCaption,
      hashtags: categoryHashtags
    };
  }
}

/**
 * Generate specific image search queries for a news topic
 * @param {Object} newsItem - News object with title, description, category, isPH
 * @returns {Object} - {queries: string[], reasoning: string}
 */
async function generateImageSearchQueries(newsItem) {
  const prompt = `You are a photo researcher finding background images for news graphics.

News: "${newsItem.title}"
Summary: "${newsItem.description || 'none'}"
Category: ${newsItem.category}
Philippines-related: ${newsItem.isPH}

Generate 3 Pexels image search queries for this news story, ordered from most specific to most generic. Each query should be 2-5 words, work as a photojournalism/stock photo search. Avoid proper names of living people (Pexels rarely has them).

Return ONLY valid JSON:
{
  "queries": ["specific query", "medium query", "generic fallback"],
  "reasoning": "one sentence"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`🔍 AI image queries: ${parsed.queries.join(' | ')}`);
    return parsed;
  } catch (err) {
    console.warn('⚠️ AI image query generation failed:', err.message);
    return { queries: [], reasoning: 'fallback' };
  }
}

/**
 * Generate a Tagalog YES/NO poll question from a news item
 * @param {Object} newsItem - News object with title, category
 * @returns {Object} - {question, hashtags}
 */
async function generatePollQuestion(newsItem) {
  const hashtagsByCategory = {
    politics: '#Philippines #Politics #PolitikaPH #Pilipinas #SangAyon',
    economy: '#PHEconomy #Philippines #Economy #SangAyon #Pilipinas',
    global: '#WorldNews #Philippines #GlobalNews #SangAyon',
    breaking: '#BreakingNews #Philippines #SangAyon #NewsUpdate',
    default: '#Philippines #News #SangAyon #Pilipinas'
  };
  const categoryHashtags = hashtagsByCategory[newsItem.category] || hashtagsByCategory.default;

  const prompt = `Generate a short, engaging YES/NO poll question in TAGALOG about this news.

News Headline: ${newsItem.title}
Category: ${newsItem.category}

Requirements:
- TAGALOG language (pure Tagalog question, not Taglish)
- YES/NO answerable question format
- 40-80 characters total (must fit in 3-4 lines of a graphic)
- Good formats to follow:
  "Sang-ayon ka ba sa desisyong ito?"
  "Tama ba ang ginawa ng gobyerno?"
  "Suportahan mo ba ang hakbang na ito?"
- Must be opinion-based, not factual
- Relate directly to the specific news topic

Return ONLY valid JSON:
{
  "question": "Tagalog yes/no question here?",
  "hashtags": "${categoryHashtags}"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });
    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('📊 Generated Poll Question:', parsed.question);
    return parsed;
  } catch (err) {
    console.error('❌ Error generating poll question:', err.message);
    return {
      question: `Sang-ayon ka ba sa balitang ito?`,
      hashtags: categoryHashtags
    };
  }
}

/**
 * Generate an engaging Taglish title and description for a Facebook Reel
 * based on the original YouTube video title and description.
 * @param {string} youtubeTitle - Original YouTube video title
 * @param {string} youtubeDescription - Original YouTube video description (URLs stripped)
 * @returns {{ title: string, description: string }}
 */
async function generateReelTitleAndDescription(youtubeTitle, youtubeDescription) {
  const prompt = `You are a Filipino social media manager creating Facebook Reel captions for a pro-Duterte page.

Original YouTube title: ${youtubeTitle}
Original YouTube description: ${youtubeDescription || '(none)'}

Generate an engaging Facebook Reel title and description in TAGLISH (mix of Tagalog and English) that:
- Title: Short, punchy, 5–12 words, starts with a hook (question, shocking fact, or bold statement)
- Description: 40–80 words, Taglish, emotionally engaging, ends with a call-to-action like "I-share mo ito!" or "I-like at i-follow!"
- Include 3–5 relevant hashtags at the end (e.g. #Duterte #Philippines #FPRRD #PilipinasMuna)
- Do NOT mention other politicians negatively
- Do NOT use all caps
- Keep the tone passionate but respectful

Return ONLY valid JSON:
{
  "title": "Your punchy Taglish title here",
  "description": "Your Taglish description here with hashtags at the end."
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });
    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('🤖 AI Reel Title:', parsed.title);
    return { title: parsed.title, description: parsed.description };
  } catch (err) {
    console.error('❌ Error generating reel title/description:', err.message);
    // Fallback: use trimmed YouTube title + generic description
    return {
      title: youtubeTitle.slice(0, 100),
      description: `${youtubeDescription || youtubeTitle}\n\n#Duterte #Philippines #FPRRD #PilipinasMuna`
    };
  }
}

module.exports = {
  generatePoliticalPost,
  scoreViralPotential,
  matchProduct,
  generateCaption,
  generatePersuasiveComment,
  optimizeForVirality,
  generateNewsCaption,
  generateImageSearchQueries,
  generatePollQuestion,
  generateReelTitleAndDescription
};
