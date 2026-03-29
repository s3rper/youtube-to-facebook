# Render Deployment Guide (FREE Tier)

## ✅ What We've Done
- Added Express health check endpoints to both automations
- Each automation now runs an HTTP server that Render can ping
- This prevents the free tier from sleeping after 15 minutes

## 📋 Step-by-Step Deployment

### Step 1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Add Render deployment with health checks"

# Create GitHub repo (go to github.com/new)
# Then connect and push
git remote add origin https://github.com/YOUR_USERNAME/youtube-to-facebook.git
git branch -M main
git push -u origin main
```


### Step 2: Deploy First Automation (Trending Videos)

1. **Go to [render.com](https://render.com)**
2. **Sign up** with GitHub (free)
3. **Click "New +"** → **"Background Worker"**
4. **Connect GitHub repository**: `youtube-to-facebook`
5. **Configure the service**:
   - **Name**: `trending-automation`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node youtube-trending-automation.js`
   - **Plan**: `Free` ✅

6. **Add Environment Variables** (Click "Environment" tab):

   **Copy from your local `.env` file:**
   ```
   FACEBOOK_PAGE_ID=your_facebook_page_id
   FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
   YOUTUBE_API_KEY=your_youtube_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   NEWSDATA_API_KEY=your_newsdata_api_key

   TRENDING_MIN_VIEWS=0
   TRENDING_MIN_VIEW_VELOCITY=0
   TRENDING_MIN_ENGAGEMENT_RATE=0.05
   TRENDING_MAX_VIDEO_AGE_HOURS=72
   TRENDING_DAILY_POST_LIMIT=12
   TRENDING_MIN_WAIT_TIME=3600000
   TRENDING_MAX_WAIT_TIME=3600000
   TRENDING_ACCEPTED_LANGUAGES=en,tl,fil
   ```

   ⚠️ **Important**: Replace the placeholder values with your actual API keys from your local `.env` file.
   Never commit your `.env` file to GitHub!

7. **Click "Create Background Worker"**

8. **Wait for deployment** (2-3 minutes)

### Step 3: Deploy Second Automation (YouTube Upload)

1. **Click "New +"** → **"Background Worker"**
2. **Connect same GitHub repository**
3. **Configure**:
   - **Name**: `youtube-upload`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node youtube_upload.js`
   - **Plan**: `Free` ✅

4. **Add same environment variables** (copy from above)

5. **Click "Create Background Worker"**

### Step 4: Get Your Render Service URLs

After deployment, you'll get URLs like:
- `https://trending-automation.onrender.com`
- `https://youtube-upload.onrender.com`

**Save these URLs!** You'll need them for Step 5.

### Step 5: Set Up Keep-Alive Pings (FREE)

This prevents Render free tier from sleeping after 15 minutes.

1. **Go to [cron-job.org](https://cron-job.org)**
2. **Sign up** (free)
3. **Click "Create Cronjob"**

#### For Trending Automation:
- **Title**: `Trending Automation Keep-Alive`
- **URL**: `https://trending-automation.onrender.com/health`
- **Schedule**: Every 10 minutes
  - **Minutes**: `*/10` (every 10 minutes)
  - **Hours**: `*`
  - **Days**: `*`
  - **Months**: `*`
  - **Weekdays**: `*`
- **Click "Create"**

#### For YouTube Upload:
- **Title**: `YouTube Upload Keep-Alive`
- **URL**: `https://youtube-upload.onrender.com/health`
- **Schedule**: Every 10 minutes (same as above)
- **Click "Create"**

### Step 6: Verify Everything is Working

1. **Check Render Logs**:
   - Go to Render dashboard
   - Click on each service
   - Check "Logs" tab
   - You should see:
     ```
     🌐 Health check server running on port 3000
     🚀 Starting Trending Video Automation
     ```

2. **Test Health Endpoints**:
   - Open browser: `https://trending-automation.onrender.com/health`
   - Should see: `OK`

3. **Monitor Cron Jobs**:
   - Go to cron-job.org dashboard
   - Check execution history
   - Should see successful pings every 10 minutes

## 🎉 You're Done!

Your automations are now running 24/7 on Render FREE tier!

## 📊 Monitoring

### Check Logs in Render:
- Go to service → "Logs" tab
- See real-time logs of your automations

### Check Uploaded Videos:
- Look at your Facebook page
- Check `trending-videos-log.json` (uploaded videos list)

### Check Cron Job Status:
- Go to cron-job.org → "Cronjobs"
- See ping history and success rate

## ⚠️ Important Notes

1. **First Deploy Takes Longer**: Initial build may take 3-5 minutes
2. **Free Tier Limits**:
   - 750 hours/month per service
   - Sleeps after 15 min (prevented by cron pings)
3. **Logs Retention**: Render keeps logs for 7 days
4. **Auto-Deploy**: Render auto-deploys on every GitHub push

## 🔧 Troubleshooting

### Service Keeps Sleeping
- Check cron-job.org is running
- Verify cron job URL is correct
- Make sure pings are every 10 minutes (not longer)

### Automation Not Uploading
- Check Render logs for errors
- Verify environment variables are set
- Check YouTube API quota (10,000 units/day)
- Check Facebook access token hasn't expired

### Out of Memory
- Upgrade to paid plan ($7/month per service)
- Or reduce video quality/size

## 💰 Cost

**FREE** - $0/month with keep-alive workaround!

If you need guaranteed uptime without cron pings:
- **Paid Plan**: $7/month per service ($14 total for both)

## 🚀 Next Steps

Want to deploy the other automations?
- `duterte-video-automation.js` - Repeat Step 2
- `trending-news-automation.js` - Repeat Step 2

Each needs:
1. New Background Worker on Render
2. Same environment variables
3. New cron job on cron-job.org
