# Trending YouTube Video Automation - Implementation Plan

## Overview
Create a new automation that discovers trending YouTube videos (uploaded within 24 hours) and uploads them to Facebook Reels. This will be a **separate automation** from the existing `youtube_upload.js` which searches by keywords.

## Key Requirements
1. Search for trending videos uploaded in last 24 hours
2. Filter by engagement metrics (view velocity, engagement rate)
3. Use existing Facebook poster module for consistency
4. Separate tracking system to avoid conflicts with youtube_upload.js
5. Follow project patterns (CLI flags, daily limits, state tracking)

## Architecture Design

### File Structure
```
youtube-trending-automation.js    # Main script (new)
trending-videos-log.json          # Track uploaded trending videos (new)
.env                              # Add new config variables (update)
utils/
  ├── facebook-video-poster.js    # Reuse existing
  ├── trending-detector.js        # Reuse/enhance existing
  └── youtube-api.js              # Extract shared logic (new)
```

### Core Components

#### 1. YouTube Trending Search
**Implementation approach:**
- Use YouTube Data API v3 `search.list` endpoint
- Key parameters:
  ```javascript
  {
    part: 'snippet',
    order: 'viewCount',              // Sort by views (trending indicator)
    type: 'video',
    publishedAfter: <24_hours_ago>,  // Filter for recent videos
    regionCode: 'PH',                // Philippines region
    maxResults: 50,
    videoDuration: 'medium'          // 4-20 minutes
  }
  ```

#### 2. Trending Detection Logic
**Metrics to calculate:**
- **View Velocity**: `views / hours_since_upload`
  - Threshold: Minimum 1000 views/hour
- **Engagement Rate**: `(likes + comments) / views`
  - Threshold: Minimum 5%
- **Recency Bonus**: Higher score for videos under 12 hours old

**Scoring formula:**
```javascript
const trendingScore =
  (viewVelocity * 0.5) +           // 50% weight
  (engagementRate * 1000 * 0.3) +  // 30% weight (normalized)
  (recencyBonus * 0.2);            // 20% weight
```

**Minimum thresholds:**
- Minimum views: 10,000
- Minimum view velocity: 1,000 views/hour
- Minimum engagement rate: 5%
- Maximum video age: 24 hours

#### 3. Content Filtering
**Reuse existing safety validators:**
- Profanity check (`safety-validator.js`)
- Duplicate detection (check against `trending-videos-log.json`)
- Content policy compliance

**Additional filters:**
- Skip videos already in `uploadedVideos.json` (youtube_upload.js tracking)
- Skip videos with copyright claims (if detectable)
- Verify video is downloadable with yt-dlp

#### 4. Facebook Upload Process
**Reuse existing `facebook-video-poster.js`:**
- 3-phase upload (start, transfer, finish)
- Auto-comment with Shopee affiliate links
- Error handling and retry logic

#### 5. State Management
**New tracking file: `trending-videos-log.json`**
```json
{
  "uploadedVideos": [
    {
      "youtubeId": "abc123",
      "title": "Video Title",
      "uploadedAt": "2026-03-28T10:30:00Z",
      "views": 50000,
      "viewVelocity": 5000,
      "engagementRate": 0.08,
      "trendingScore": 4200,
      "facebookPostId": "123456789"
    }
  ],
  "stats": {
    "totalUploaded": 1,
    "lastUploadTime": "2026-03-28T10:30:00Z",
    "uploadsToday": 1
  }
}
```

## Configuration (.env additions)

```env
# Trending Video Automation Config
TRENDING_MIN_VIEWS=10000
TRENDING_MIN_VIEW_VELOCITY=1000
TRENDING_MIN_ENGAGEMENT_RATE=0.05
TRENDING_MAX_VIDEO_AGE_HOURS=24
TRENDING_DAILY_POST_LIMIT=12
TRENDING_MIN_WAIT_TIME=3600000    # 1 hour (same as youtube_upload)
TRENDING_MAX_WAIT_TIME=3600000    # 1 hour
```

## Implementation Steps

### Step 1: Create YouTube API Utility Module
**File**: `utils/youtube-api.js`
- Extract shared YouTube API logic from youtube_upload.js
- Add trending search function
- Add video statistics enrichment
- Add view velocity calculation

### Step 2: Create Main Automation Script
**File**: `youtube-trending-automation.js`
- CLI structure (--single, --dry-run flags)
- Main loop with rate limiting
- Integration with YouTube API utility
- Integration with Facebook poster
- State tracking in trending-videos-log.json

### Step 3: Enhance Trending Detector (Optional)
**File**: `utils/trending-detector.js`
- Add YouTube-specific trending detection
- Integrate view velocity and engagement metrics
- Add scoring system

### Step 4: Add Configuration
**File**: `.env`
- Add all trending automation config variables

### Step 5: Testing
- Test with --dry-run flag
- Verify 24-hour filter works correctly
- Verify engagement thresholds work
- Test Facebook upload integration
- Test duplicate detection across both systems

## Key Differences from youtube_upload.js

| Feature | youtube_upload.js | trending-automation.js |
|---------|-------------------|------------------------|
| Search Method | Keywords (`q` param) | Trending (`order=viewCount`) |
| Time Filter | None | Last 24 hours (`publishedAfter`) |
| Topic Selection | 20 hardcoded topics | Any trending content |
| Sorting | Date (`order=date`) | Views (`order=viewCount`) |
| Metrics | None | View velocity + engagement rate |
| Region | US | Philippines (PH) |
| Daily Limit | None (8 implied) | 12 videos/day |
| Tracking File | uploadedVideos.json | trending-videos-log.json |

## Risk Mitigation

### Risk 1: Duplicate uploads between systems
**Mitigation**:
- Check both `uploadedVideos.json` AND `trending-videos-log.json`
- Cross-reference YouTube video IDs

### Risk 2: API quota exhaustion
**Mitigation**:
- Cache search results
- Batch video statistics requests (50 IDs per call)
- Monitor quota usage in logs

### Risk 3: False trending detection
**Mitigation**:
- Conservative thresholds (10K views, 1K views/hour)
- Multiple metrics (velocity + engagement)
- Manual review mode with --dry-run

### Risk 4: Copyright/DMCA issues
**Mitigation**:
- Download test before full upload
- Monitor Facebook post success rates
- Add retry logic for failed uploads

## Success Metrics

### Performance Targets
- Upload 8-12 trending videos per day
- 1 hour intervals between uploads
- <5% failed uploads
- >80% of uploads have 10K+ YouTube views

### Monitoring
- Log all trending scores
- Track upload success/failure rates
- Monitor API quota usage
- Daily summary reports

## Timeline Estimate

1. **YouTube API Utility** - Extract and enhance existing logic
2. **Main Automation Script** - Create new trending automation with CLI
3. **Configuration** - Add .env variables
4. **Testing** - Dry-run and integration tests
5. **Deployment** - Run alongside existing youtube_upload.js

## Open Questions

1. Should we filter by Duterte-related topics or allow ANY trending content?
   - **Recommendation**: Start with ANY trending PH content, then add topic filtering if needed

2. Should we stop youtube_upload.js or run both simultaneously?
   - **Recommendation**: Run both - trending automation gets viral content, keyword automation gets consistent topic coverage

3. What should be the daily limit for trending automation?
   - **Recommendation**: 12 videos/day (half of youtube_upload.js's 24) to leave room for both systems

4. Should we download the ENTIRE video or create Remotion compositions?
   - **Recommendation**: Download entire videos (like youtube_upload.js) - trending videos are already produced content, don't need Remotion processing
