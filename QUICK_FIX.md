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

### 3. Convert Cookies to Base64

**On Mac/Linux Terminal:**
```bash
cat youtube-cookies.txt | base64
```

**On Windows PowerShell:**
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("youtube-cookies.txt"))
```

**Or use online tool:**
- Go to: https://www.base64encode.org/
- Click "Choose File" → Select `youtube-cookies.txt`
- Click "Encode"
- Copy the entire output (long string)

---

### 4. Add to Render Environment Variables

**For youtube-upload service:**
1. Go to: https://dashboard.render.com/
2. Click **"youtube-upload"** service
3. Click **"Environment"** tab (left sidebar)
4. Click **"Add Environment Variable"**
5. Enter:
   - **Key**: `YOUTUBE_COOKIES_BASE64`
   - **Value**: (paste the base64 string)
6. Click **"Save Changes"**

**Repeat for trending-automation service:**
- Same steps but select "trending-automation" instead
- Use same Key and Value

### 5. Redeploy Services

After adding environment variable:
1. Click **"Manual Deploy"** → **"Deploy latest commit"**
2. Wait 2-3 minutes for deployment
3. Repeat for other service

### 6. Check Logs

Look for:
```
🍪 Decoding YouTube cookies from environment variable...
✅ YouTube cookies file created successfully
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

**Can't convert to Base64?**
- Use online tool: https://www.base64encode.org/
- Or ask someone with Mac/Linux to help

**Environment variable not working?**
- Make sure you clicked "Save Changes" in Render
- Make sure variable name is exactly: `YOUTUBE_COOKIES_BASE64`
- Make sure you redeployed after adding variable
- Check logs for: "🍪 Decoding YouTube cookies from environment variable..."
