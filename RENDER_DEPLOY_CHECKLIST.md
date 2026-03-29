# 🚀 Render Deployment Checklist - Ready to Deploy!

## ✅ Pre-Deployment Verification

### 1. GitHub Repository
- [x] Code pushed to GitHub
- [x] `.gitignore` configured (excludes .env, node_modules, videos)
- [x] Secrets removed from repository
- [x] Health check endpoints added to automations

### 2. Local Files Ready
- [x] `youtube-trending-automation.js` - Has health check on port 3000
- [x] `youtube_upload.js` - Has health check on port 3001
- [x] `package.json` - All dependencies listed
- [x] `.env.example` - Template for environment variables
- [x] `render.yaml` - Render blueprint (optional)

### 3. Environment Variables Prepared
Have your `.env` file ready with:
- [x] FACEBOOK_PAGE_ID
- [x] FACEBOOK_ACCESS_TOKEN
- [x] YOUTUBE_API_KEY
- [x] TRENDING_MIN_VIEWS
- [x] TRENDING_MIN_VIEW_VELOCITY
- [x] TRENDING_MIN_ENGAGEMENT_RATE
- [x] TRENDING_MAX_VIDEO_AGE_HOURS
- [x] TRENDING_DAILY_POST_LIMIT
- [x] TRENDING_MIN_WAIT_TIME
- [x] TRENDING_MAX_WAIT_TIME
- [x] TRENDING_ACCEPTED_LANGUAGES

---

## 🎯 Deployment Steps

### Step 1: Deploy on Render (5 minutes per service)

#### Service 1: Trending Automation

1. **Go to [render.com](https://render.com)**
   - Sign up with GitHub (free)

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub repository: `youtube-to-facebook`
   - Click "Connect"

3. **Configure Service**
   ```
   Name: trending-automation
   Region: Oregon (US West) or Singapore (closest to PH)
   Branch: main
   Root Directory: (leave blank)
   Environment: Node
   Build Command: npm install
   Start Command: node youtube-trending-automation.js
   Plan: Free
   ```

4. **Add Environment Variables**
   - Click "Advanced" → "Add Environment Variable"
   - Copy values from your local `.env` file:

   ```
   FACEBOOK_PAGE_ID=<your_value>
   FACEBOOK_ACCESS_TOKEN=<your_value>
   YOUTUBE_API_KEY=<your_value>
   TRENDING_MIN_VIEWS=0
   TRENDING_MIN_VIEW_VELOCITY=0
   TRENDING_MIN_ENGAGEMENT_RATE=0.05
   TRENDING_MAX_VIDEO_AGE_HOURS=72
   TRENDING_DAILY_POST_LIMIT=12
   TRENDING_MIN_WAIT_TIME=3600000
   TRENDING_MAX_WAIT_TIME=3600000
   TRENDING_ACCEPTED_LANGUAGES=en,tl,fil
   ```

5. **Create Web Service**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment

6. **Verify Deployment**
   - Check logs for: `🌐 Health check server running on port 3000`
   - Check logs for: `🚀 Starting Trending Video Automation`
   - Visit: `https://trending-automation.onrender.com/health`
   - Should see: `OK`

#### Service 2: YouTube Upload

1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect same GitHub repository

2. **Configure Service**
   ```
   Name: youtube-upload
   Region: Same as Service 1
   Branch: main
   Root Directory: (leave blank)
   Environment: Node
   Build Command: npm install
   Start Command: node youtube_upload.js
   Plan: Free
   ```

3. **Add Environment Variables**
   ```
   FACEBOOK_PAGE_ID=<your_value>
   FACEBOOK_ACCESS_TOKEN=<your_value>
   YOUTUBE_API_KEY=<your_value>
   ```

4. **Create Web Service**
   - Click "Create Web Service"
   - Wait 2-3 minutes

5. **Verify Deployment**
   - Check logs for: `🌐 Health check server running on port 3001`
   - Visit: `https://youtube-upload.onrender.com/health`
   - Should see: `OK`

---

### Step 2: Set Up Keep-Alive (5 minutes)

Free tier services sleep after 15 minutes. Prevent this with cron pings.

1. **Go to [cron-job.org](https://cron-job.org)**
   - Sign up (free)

2. **Create Cronjob for Trending Automation**
   ```
   Title: Trending Automation Keep-Alive
   URL: https://trending-automation.onrender.com/health
   Execution:
     - Every 10 minutes: */10 * * * *
   HTTP Method: GET
   Enabled: Yes
   ```
   - Click "Create cronjob"

3. **Create Cronjob for YouTube Upload**
   ```
   Title: YouTube Upload Keep-Alive
   URL: https://youtube-upload.onrender.com/health
   Execution:
     - Every 10 minutes: */10 * * * *
   HTTP Method: GET
   Enabled: Yes
   ```
   - Click "Create cronjob"

4. **Test Immediately**
   - Click "Run check now" on each cronjob
   - Should see "200 OK" response

---

### Step 3: Verify Automations Are Working (10 minutes)

#### Check Trending Automation:
1. **View Render Logs**
   - Go to Render dashboard → trending-automation → Logs
   - Should see:
     ```
     🔍 Searching for trending videos...
     Found X videos from last 72 hours
     📊 Enriching videos with statistics...
     ```

2. **Check Facebook Page**
   - Go to your Facebook page
   - Should see new Shorts being posted every ~1 hour

3. **Check Tracking File** (Optional)
   - Download `trending-videos-log.json` from your repo
   - Should see uploaded videos list

#### Check YouTube Upload:
1. **View Render Logs**
   - Go to Render dashboard → youtube-upload → Logs
   - Should see:
     ```
     ⬇️ Downloading video: https://...
     ✅ Download complete
     🚀 Uploading to Facebook Reels...
     ```

2. **Check Facebook Page**
   - Should see Duterte videos being posted every 10-20 minutes

---

## 📊 Monitoring Dashboard

### Render Dashboard
- **Services**: https://dashboard.render.com/
- **View logs**: Click service → "Logs" tab
- **Check metrics**: Click service → "Metrics" tab

### Cron-job Dashboard
- **Cronjobs**: https://console.cron-job.org/
- **Execution history**: Click cronjob → "History"
- **Should ping**: Every 10 minutes

### Facebook Page
- **Your page**: https://facebook.com/YOUR_PAGE_ID
- **Check posts**: Should see automated uploads

---

## 🐛 Troubleshooting

### Service Not Starting
**Symptoms**: Build succeeds but service crashes
**Check**:
1. Render logs for error messages
2. Missing environment variables
3. Port configuration (should use `process.env.PORT`)

**Fix**:
- Add missing env vars
- Check logs for specific errors

### Service Sleeping After 15 Minutes
**Symptoms**: Stops posting after inactive
**Check**:
1. Cron-job execution history
2. Is cron job enabled?
3. Is URL correct?

**Fix**:
- Verify cron job is running every 10 min
- Check cron job URL matches Render URL
- Enable cron job if disabled

### Videos Not Uploading
**Symptoms**: Runs but no Facebook posts
**Check**:
1. YouTube API quota (10,000 units/day)
2. Facebook access token expiration
3. Render logs for errors

**Fix**:
- Wait for YouTube quota reset (midnight PT)
- Regenerate Facebook access token
- Check error logs for specific issues

### Out of Memory
**Symptoms**: Service crashes with "Out of memory"
**Fix**:
- Upgrade to paid plan ($7/month)
- Or reduce video processing quality

---

## 💰 Cost Breakdown

### Free Tier (Current Setup)
- **Render**: $0/month
  - 2 web services × Free tier
  - 750 hours/month each
  - Sleeps after 15 min (prevented by cron)

- **Cron-job.org**: $0/month
  - 2 cronjobs
  - Unlimited executions

**Total: $0/month** 🎉

### Paid Tier (If Needed)
- **Render**: $7/month per service
  - Always on (no sleep)
  - 512 MB RAM
  - No cron pings needed

**Total: $14/month** (if you upgrade both services)

---

## ✅ Deployment Complete Checklist

After following all steps, verify:

- [ ] Both services deployed on Render
- [ ] Health endpoints return "OK"
- [ ] Cron jobs created and running
- [ ] Cron jobs successfully ping every 10 min
- [ ] Render logs show automation activity
- [ ] Facebook page receiving posts
- [ ] No errors in Render logs

If all checked ✅, you're done! 🎉

---

## 📝 Service URLs (Fill in after deployment)

```
Trending Automation:
- Service URL: https://trending-automation.onrender.com
- Health Check: https://trending-automation.onrender.com/health
- Cron Job: https://console.cron-job.org/jobs/YOUR_ID

YouTube Upload:
- Service URL: https://youtube-upload.onrender.com
- Health Check: https://youtube-upload.onrender.com/health
- Cron Job: https://console.cron-job.org/jobs/YOUR_ID

Render Dashboard: https://dashboard.render.com/
Cron Dashboard: https://console.cron-job.org/
Facebook Page: https://facebook.com/112550405075594
```

---

## 🚀 Quick Deploy (TL;DR)

1. **Render**: New Service → Connect GitHub → Configure → Deploy (×2)
2. **Cron-job**: Create cronjob → Ping every 10 min (×2)
3. **Verify**: Check logs + Facebook page + Health endpoints
4. **Done!** 🎉

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Status**: https://status.render.com/
- **Cron-job Help**: https://cron-job.org/en/faq/

Need help? Check the logs first - they usually tell you what's wrong!
