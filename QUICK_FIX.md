# 🚨 QUICK FIX: YouTube 429 Errors

## The Problem

YouTube is blocking Render's servers:
```
❌ HTTP Error 429: Too Many Requests
❌ Sign in to confirm you're not a bot
```

## The Solution (5 Minutes)

### 1. Install Browser Extension
- **Chrome**: https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
- Click "Add to Chrome"

### 2. Export Cookies
1. Go to **youtube.com** and log in
2. Click the **cookie extension icon**
3. Click **"Export"**
4. Rename file to: `youtube-cookies.txt`

### 3. Upload to Render

**For youtube-upload service:**
1. Go to: https://dashboard.render.com/
2. Click **"youtube-upload"** service
3. Click **"Shell"** tab
4. Click **"Launch Shell"**
5. Run these commands:

```bash
cd /opt/render/project/src
cat > youtube-cookies.txt
```

6. **Paste** your cookies file content (open youtube-cookies.txt in notepad, copy all, paste in shell)
7. Press **Ctrl+D** to save
8. Verify:
```bash
ls -lh youtube-cookies.txt
```

**Repeat for trending-automation service:**
- Same steps but select "trending-automation" instead

### 4. Redeploy

1. Go back to service page
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait 2-3 minutes

### 5. Check Logs

Look for:
```
🔧 Using cookies: YES ✅
⬇️ Downloading video: https://www.youtube.com/shorts/XXXXX
✅ Download complete
```

## Done! 🎉

Your downloads should work now.

---

## Need More Help?

See detailed guide: `YOUTUBE_COOKIES_SETUP.md`

## Cookie Expiry

Cookies last **1-2 months**. Set a reminder to:
1. Export fresh cookies every 30 days
2. Re-upload to Render
3. Redeploy services

---

## Troubleshooting

**Still getting errors?**
1. Make sure file is named exactly: `youtube-cookies.txt`
2. Make sure you logged into YouTube before exporting
3. Try exporting from a different browser
4. Make sure file is in `/opt/render/project/src/` directory
5. Redeploy after uploading

**Can't open Shell?**
- Use Environment Variable method (see YOUTUBE_COOKIES_SETUP.md)

---

## Quick Commands

**Check if cookies exist:**
```bash
ls -la /opt/render/project/src/youtube-cookies.txt
```

**View first few lines:**
```bash
head -n 5 youtube-cookies.txt
```

**Delete old cookies:**
```bash
rm youtube-cookies.txt
```
