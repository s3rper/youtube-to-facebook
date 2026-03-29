# Trending News Automation System

Automatically posts trending Philippines and global news to Facebook with AI-generated Taglish captions and custom quote images.

## ✅ What Was Created

### New Files (3 modules):
1. **`news-fetcher.js`** - Fetches trending news from NewsData.io and Reddit
2. **`news-image-generator.js`** - Creates custom quote images with gradients
3. **`trending-news-automation.js`** - Main automation script

### Modified Files:
1. **`ai-content-generator.js`** - Added `generateNewsCaption()` function for Taglish captions
2. **`.env`** - Added NewsData.io API key configuration

### Auto-Created Data Files:
- `news-posts-log.json` - Activity log for all news posts
- `news-cache.json` - Duplicate detection cache (7-day window)
- `news-fetch-cache.json` - API result cache (30-minute window)

---

## 🚀 Getting Started

### Step 1: Get NewsData.io API Key (FREE)

1. Sign up at: https://newsdata.io/register
2. Free tier: **200 requests/day** (more than enough)
3. Copy your API key

### Step 2: Configure .env File

Open `.env` and replace the placeholder:

```bash
# Replace this line:
NEWSDATA_API_KEY=your_newsdata_io_api_key_here

# With your actual key:
NEWSDATA_API_KEY=pub_1234567890abcdef...
```

### Step 3: Test the System

```bash
# Test news fetcher (should fetch 10-20 news items)
node news-fetcher.js

# Test image generator (creates 4 sample images)
node news-image-generator.js

# Test full automation (dry run - no Facebook posting)
node trending-news-automation.js --dry-run --single
```

### Step 4: Run Production

```bash
# Post ONE news item to Facebook (for testing)
node trending-news-automation.js --single

# Start continuous automation (posts every 2-4 hours)
node trending-news-automation.js
```

---

## 📊 How It Works

### Posting Cycle (Every 2-4 Hours):

```
1. Fetch trending news → NewsData.io + Reddit
2. Select top news item → 70% PH / 30% Global mix
3. Generate Taglish caption → Claude AI
4. Create quote image → Color-coded by category
5. Validate content → Profanity, duplicates, limits
6. Post to Facebook → Image + caption
7. Log activity → news-posts-log.json
```

### News Categories & Colors:

- 🔴 **BREAKING** - Red gradient (urgent news)
- 🔵 **POLITICS** - Blue gradient (government/elections)
- 🟢 **WORLD NEWS** - Green gradient (international)
- 🟠 **ECONOMY** - Orange gradient (business/GDP)

### Taglish Captions:

AI generates natural Filipino social media style captions:

```
"Grabe! Breaking news tungkol sa ekonomiya ng Pilipinas.
Sa totoo lang, this will affect many families. What do you
think mga ka-PH? 🇵🇭 #Philippines #News #Breaking"
```

---

## 🛠️ Command-Line Options

### Dry Run (No Facebook Posting)
```bash
node trending-news-automation.js --dry-run --single
```
- Fetches news
- Generates caption
- Creates image
- **SKIPS** Facebook posting
- Perfect for testing

### Single Post (One and Done)
```bash
node trending-news-automation.js --single
```
- Posts ONE news item
- Then exits
- Good for testing before continuous run

### Continuous Mode (Production)
```bash
node trending-news-automation.js
```
- Runs forever
- Posts every 2-4 hours
- 12 posts/day limit
- Auto-restarts at midnight

---

## 📁 File Structure

```
youtube-to-facebook/
├── trending-news-automation.js  ← Main script
├── news-fetcher.js              ← News API integration
├── news-image-generator.js      ← Image creation
├── ai-content-generator.js      ← Claude AI (updated)
│
├── facebook-poster.js           ← Existing (reused)
├── safety-validator.js          ← Existing (reused)
├── image-handler.js             ← Existing (reused)
│
├── .env                         ← API keys
├── news-posts-log.json          ← Activity log
├── news-cache.json              ← Duplicate tracking
├── news-fetch-cache.json        ← API cache
│
└── generated_images/
    └── news_*.png               ← Generated images
```

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# NewsData.io API
NEWSDATA_API_KEY=your_key_here

# Posting Schedule
NEWS_MIN_WAIT_TIME=7200000    # 2 hours
NEWS_MAX_WAIT_TIME=14400000   # 4 hours
NEWS_DAILY_POST_LIMIT=12

# Already configured (no changes needed)
FACEBOOK_PAGE_ID=...
FACEBOOK_ACCESS_TOKEN=...
ANTHROPIC_API_KEY=...
```

### Peak Hours (More Frequent Posting)
- **7am - 10pm**: Posts every 2-3 hours
- **10pm - 7am**: Posts every 4-6 hours

### Topic Mix
- **70% Philippines news** (country=ph)
- **30% Global news** (ASEAN, Asia, world events)

---

## 🧪 Testing & Validation

### Safety Features:
✅ Duplicate detection (won't post same news twice)
✅ Profanity filter (English + Tagalog)
✅ Daily post limit (max 12 posts/day)
✅ Caption length validation (max 2000 chars)
✅ Content validation before posting

### Error Handling:
- **NewsData.io fails** → Retry, then use Reddit, then cached news
- **Claude AI fails** → Retry, then use fallback template
- **Facebook API fails** → Log error, skip, continue
- **Image generation fails** → Retry with simplified text

---

## 📊 Monitoring

### Check Activity Log:
```bash
cat news-posts-log.json | jq '.' | tail -50
```

### View Statistics:
```bash
node trending-news-automation.js --single
# Shows stats on startup
```

### Check Generated Images:
```bash
ls -lh generated_images/news_*.png
```

---

## 🔄 Running Alongside Existing Automation

You can run BOTH systems simultaneously:

### Terminal 1: Shopee Content
```bash
node content-automation.js
# Posts: Shopee products with affiliate links
# Log: posts-log.json
```

### Terminal 2: News Content
```bash
node trending-news-automation.js
# Posts: Trending news (no affiliate links)
# Log: news-posts-log.json
```

**Total Daily Posts**: 24 (12 Shopee + 12 News)

**No Conflicts**:
- ✅ Different log files
- ✅ Different cache files
- ✅ Different content types
- ✅ Same Facebook API
- ✅ No new dependencies needed

---

## 💰 Cost Breakdown

### Monthly Costs:
- **NewsData.io**: FREE (200 requests/day, using ~96/day)
- **Claude AI**: ~$0.22/month (Haiku model)
- **Facebook API**: FREE

**Total: ~$0.22/month** 🎉

### Resource Usage:
- **Storage**: < 1 MB (auto-cleanup keeps last 20 images)
- **Bandwidth**: < 1 MB/day
- **Dependencies**: No new npm packages needed

---

## 🐛 Troubleshooting

### "No news items available"
**Solution**: Add NewsData.io API key to `.env`

### "Daily post limit reached"
**Solution**: Wait until midnight (auto-resets), or increase limit in `.env`

### "Duplicate content detected"
**Solution**: Working as intended! Cache prevents reposting same news

### "Facebook posting failed"
**Solution**: Check FACEBOOK_ACCESS_TOKEN in `.env` hasn't expired

### Font/Emoji errors with Sharp
**Solution**: Already fixed! Emojis removed from badges.

---

## 📝 Sample Output

```
================================================================================
📰 STARTING NEWS POSTING CYCLE
================================================================================

📡 Step 1: Fetching trending news...
✅ Fetched 15 Philippines news articles
✅ Fetched 8 Global news articles

🏆 Selected news:
   Title: Senate approves infrastructure bill for 2026
   Category: politics
   Score: 87.3

🤖 Step 2: Generating Taglish caption...
📝 Generated Caption:
Grabe! Breaking news sa Senado - approved na ang infrastructure
bill for 2026! Sa totoo lang, this is good news for development.
What do you think mga ka-PH? #Philippines #Politics #PolitikaPH

🔍 Step 3: Validating content...
✅ Content validation passed

🎨 Step 4: Creating news quote image...
✅ Image created: news_1234567890_politics.png

📤 Step 5: Posting to Facebook...
✅ Posted successfully!
   Post ID: 123456789_987654321
   URL: https://www.facebook.com/123456789_987654321

📋 Step 6: Post-posting tasks...
💾 Added news to posted cache
💾 Saved to news posts log
🗑️ Deleted 3 old images

================================================================================
✅ NEWS POSTING CYCLE COMPLETE
================================================================================

⏰ Next post scheduled for: Mar 25, 2026 9:30 PM
   Waiting 2h 45m...
```

---

## 🎯 Success Criteria

✅ **Functional:**
- Fetches trending PH + Global news automatically
- Generates natural Taglish captions
- Creates visually appealing quote images
- Posts to Facebook successfully
- Runs continuously without crashes

✅ **Quality:**
- Captions are truly bilingual (Taglish)
- No duplicate news posted
- No profanity in content
- Images are readable and on-brand

✅ **Performance:**
- Posts 12× per day on schedule
- API costs stay under $0.50/month
- No rate limit issues
- < 5% error rate

---

## 🚀 Next Steps

1. **Get NewsData.io API key** → https://newsdata.io/register
2. **Add to .env** → `NEWSDATA_API_KEY=your_key_here`
3. **Test** → `node trending-news-automation.js --dry-run --single`
4. **Run** → `node trending-news-automation.js`

---

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review `news-posts-log.json` for error messages
3. Test individual modules:
   - `node news-fetcher.js`
   - `node news-image-generator.js`
4. Run in dry-run mode to debug: `--dry-run --single`

---

**Happy automating! 🎉**
