# 🤖 AI-Powered Original Content Automation System

**Legitimate AI-powered content creation and automation for Philippines politics & news**

Transform your social media presence with AI-generated original content that's optimized for virality, matched with relevant products, and posted automatically to Facebook.

---

## ✨ Features

### 🧠 AI-Powered Content Generation
- **Original Content**: AI generates unique political commentary (no scraping/copying)
- **Viral Optimization**: Content scored 1-100 for viral potential
- **Smart Product Matching**: AI matches content with relevant Shopee merchandise
- **Optimized Captions**: Facebook captions with emotional hooks and CTAs
- **Persuasive Comments**: Non-spammy affiliate link comments

### 🛡️ Safety & Quality
- **Duplicate Detection**: Prevents posting same content twice
- **Profanity Filter**: Blocks inappropriate language
- **Daily Limits**: Max 12 posts/day to avoid spam flags
- **Content Validation**: Ensures quality before posting
- **Auto-trimming**: Captions auto-fit within Facebook limits

### 📊 Analytics & Tracking
- **Real-time Dashboard**: Monitor performance and statistics
- **Cost Tracking**: Estimated API costs (~$0.50/month)
- **Success Metrics**: Track virality scores and post performance
- **CSV Export**: Export data for analysis

### 🖼️ Image Handling
- **Multi-Strategy**: Unsplash API → Shopee images → AI quote graphics
- **Auto-cleanup**: Keeps last 20 images only
- **Smart Fallbacks**: Always generates an image

---

## 📦 Installation

### Prerequisites
- Node.js 14+ installed
- Facebook Page access token
- Anthropic API key (Claude)
- (Optional) Unsplash API key

### Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables** in `.env`:
```
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_ACCESS_TOKEN=your_access_token
ANTHROPIC_API_KEY=your_anthropic_key
UNSPLASH_ACCESS_KEY=your_unsplash_key_optional
```

3. **Add your Shopee products** to `duterte-shopee-list.json` (already included)

---

## 🚀 Usage

### Test Each Component

```bash
# Test AI content generation
node test-ai-generator.js

# Test image handling
node test-image-handler.js

# Test Facebook posting
node test-facebook-poster.js

# Test safety features
node test-safety.js

# Test single content cycle
node test-single-cycle.js
```

### Run Analytics Dashboard

```bash
# View analytics
node analytics-dashboard.js

# Export to CSV
node analytics-dashboard.js --export
```

### Start Full Automation

```bash
# Run continuous automation (posts every 2-4 hours)
node content-automation.js
```

**⚠️ Important**: The automation runs continuously. Press `Ctrl+C` to stop.

---

## 📁 File Structure

### Core Modules
- **`ai-content-generator.js`** - Claude API integration for content generation
- **`image-handler.js`** - Image fetching, creation, and management
- **`facebook-poster.js`** - Facebook Graph API posting functions
- **`content-automation.js`** - Main automation loop (START HERE)
- **`safety-validator.js`** - Safety checks and validation
- **`analytics-dashboard.js`** - Performance analytics and reporting

### Configuration
- **`.env`** - Environment variables (API keys)
- **`duterte-shopee-list.json`** - Shopee affiliate products
- **`posts-log.json`** - Automated posting log (auto-generated)

### Test Scripts
- **`test-ai-generator.js`** - Test AI functions
- **`test-image-handler.js`** - Test image handling
- **`test-facebook-poster.js`** - Test Facebook posting
- **`test-safety.js`** - Test safety features
- **`test-single-cycle.js`** - Test complete workflow

### Legacy Files (Not Used)
- **`youtube_upload.js`** - Old YouTube scraping system (deprecated)

---

## ⚙️ Configuration

### Content Topics
Edit `contentTopics` array in `content-automation.js` to customize topics:

```javascript
const contentTopics = [
  'Latest Philippine Senate updates',
  'Duterte legacy and impact analysis',
  // Add your topics here...
];
```

### Posting Frequency
Modify timing in `content-automation.js`:

```javascript
const MIN_WAIT_TIME = 2 * 60 * 60 * 1000; // 2 hours
const MAX_WAIT_TIME = 4 * 60 * 60 * 1000; // 4 hours
```

### Virality Threshold
Change minimum required score in `content-automation.js`:

```javascript
const VIRALITY_THRESHOLD = 60; // Default: 60/100
```

### Daily Post Limit
Modify in `safety-validator.js`:

```javascript
const MAX_POSTS_PER_DAY = 12; // Default: 12
```

---

## 💰 Cost Breakdown

### Claude API (Haiku Model)
- **Per Post**: $0.0014
- **Per Day**: $0.0166 (12 posts)
- **Per Month**: $0.50 (360 posts)

### Unsplash API
- **Free tier**: 50 requests/hour (sufficient)

### Facebook API
- **Free**: No charges for posting

**Total Monthly Cost: ~$0.50**

---

## 📊 Workflow

1. **Select Random Topic** from 20+ curated topics
2. **Generate AI Content** using Claude Haiku
3. **Score Virality** (1-100 scale)
4. **Optimize Content** if score < 60
5. **Skip Post** if still below threshold
6. **Match Shopee Product** with AI intelligence
7. **Generate Facebook Caption** with hooks and CTAs
8. **Get/Create Image** (Unsplash → Shopee → Quote graphic)
9. **Validate Content** (duplicates, profanity, length)
10. **Post to Facebook** with image and caption
11. **Add Affiliate Comment** with persuasive copy
12. **Log Results** to posts-log.json
13. **Wait 2-4 Hours** (randomized)
14. **Repeat**

---

## 🛡️ Safety Features

### Automatic Checks
- ✅ Duplicate content detection (SHA256 hashing)
- ✅ Profanity filtering (English + Filipino)
- ✅ Caption length validation (auto-trim)
- ✅ Daily post limit enforcement
- ✅ Minimum content length check
- ✅ API error handling with retries

### Rate Limiting
- Posts every 2-4 hours (randomized)
- Max 12 posts per day
- Prevents Facebook spam flags

### Content Quality
- Virality score minimum: 60/100
- Auto-optimization if score is low
- Skip if can't reach threshold

---

## 📈 Analytics

View comprehensive analytics with:
```bash
node analytics-dashboard.js
```

**Metrics Tracked**:
- Total posts and success rate
- Average virality scores
- Top performing topics
- Most promoted products
- Recent successful posts
- Failure analysis
- Cost tracking

**Export Data**:
```bash
node analytics-dashboard.js --export
# Creates posts-export.csv
```

---

## 🔧 Troubleshooting

### "Authentication error"
- Check your ANTHROPIC_API_KEY in `.env`
- Verify API key is active at https://console.anthropic.com/

### "Facebook posting failed"
- Verify FACEBOOK_ACCESS_TOKEN is valid
- Check token hasn't expired
- Ensure page permissions are correct

### "Daily limit reached"
- System enforces 12 posts/day maximum
- Wait 24 hours or adjust MAX_POSTS_PER_DAY

### "Score below threshold"
- Content didn't meet virality requirements
- This is normal - try again with different topic
- Consider lowering VIRALITY_THRESHOLD

---

## 📝 Best Practices

### Before Running Full Automation
1. ✅ Test all components individually
2. ✅ Run 5-10 single cycles first
3. ✅ Review generated content quality
4. ✅ Check Facebook Page manually
5. ✅ Verify affiliate links work
6. ✅ Monitor for first 24 hours

### Content Guidelines
- Original commentary (no copying)
- Balanced political perspectives
- Relevant to Filipino audience
- Respectful and informative
- Avoid extreme controversy

### Monitoring
- Check analytics daily: `node analytics-dashboard.js`
- Review posts-log.json for errors
- Monitor Facebook Page engagement
- Track affiliate click-through rates

---

## 🚨 Important Notes

### Legal & Ethical
- ✅ **Original Content**: All AI-generated, no scraping
- ✅ **Platform Compliance**: Follows Facebook Terms of Service
- ✅ **Transparency**: Posts are clearly original commentary
- ✅ **Affiliate Disclosure**: Follow FTC guidelines if required

### Limitations
- AI content quality varies (hence virality scoring)
- Facebook may still flag rapid posting
- Affiliate conversions not guaranteed
- Requires active API keys

### Maintenance
- Monitor API costs monthly
- Update topics seasonally
- Refresh Shopee product list
- Check for Facebook API changes

---

## 📚 API Documentation

### Claude API
- Docs: https://docs.anthropic.com/
- Console: https://console.anthropic.com/
- Model: claude-3-haiku-20240307

### Facebook Graph API
- Docs: https://developers.facebook.com/docs/graph-api/
- Reference: https://developers.facebook.com/docs/graph-api/reference/

### Unsplash API (Optional)
- Docs: https://unsplash.com/developers
- Access: https://unsplash.com/oauth/applications

---

## 🔄 Upgrade Path

### Future Enhancements (Optional)
- Multi-platform posting (Instagram, Twitter)
- Real-time engagement tracking
- A/B testing for captions
- Video content generation
- Scheduled posting (specific times)
- Webhook notifications

---

## 📧 Support

If you encounter issues:
1. Check troubleshooting section above
2. Review posts-log.json for errors
3. Test individual components
4. Verify API keys are valid

---

## 📜 License

This project is for educational and legitimate business use. Ensure compliance with all platform terms of service and local regulations.

---

## 🎉 Success Metrics

After running this system, you should see:
- **100% original content** (no copyright issues)
- **60-100 virality scores** (quality filtered)
- **12 posts/day** (consistent growth)
- **~$0.50/month cost** (extremely affordable)
- **Smart product matching** (better conversions)
- **Professional appearance** (AI-optimized captions)

**Start with**: `node test-single-cycle.js`
**Then run**: `node content-automation.js`
**Monitor with**: `node analytics-dashboard.js`

Good luck with your automated content system! 🚀
