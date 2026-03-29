# YouTube Cookies Setup - Fix Download Errors 🍪

## Why You Need This

YouTube is blocking Render's IP addresses with **HTTP 429 errors** and requiring sign-in verification. Adding cookies authenticates your downloads as a logged-in user.

## Quick Setup (5 Minutes)

### Step 1: Install Browser Extension

Choose your browser:

**Chrome:**
1. Go to: https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
2. Click "Add to Chrome"
3. Pin the extension (click puzzle icon → pin "Get cookies.txt LOCALLY")

**Firefox:**
1. Go to: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/
2. Click "Add to Firefox"

**Edge:**
1. Same as Chrome (uses Chrome Web Store)

---

### Step 2: Export YouTube Cookies

1. **Go to YouTube** and **log in** to your account
   - Visit: https://www.youtube.com
   - Make sure you're signed in

2. **Click the extension icon** (cookie icon in your toolbar)

3. **Click "Export"** or "Download"
   - This downloads a file called `youtube.com_cookies.txt` or similar

4. **Rename the file** to exactly: `youtube-cookies.txt`

---

### Step 3: Upload Cookies to Render

#### Option A: Using Render Shell (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com/

2. **Click on your service** (e.g., `youtube-upload`)

3. **Click "Shell" tab** (in the top navigation)

4. **Click "Launch Shell"** button
   - Wait for shell to connect

5. **In the shell, run:**
   ```bash
   cd /opt/render/project/src
   cat > youtube-cookies.txt
   ```

6. **Paste your cookies file content:**
   - Open `youtube-cookies.txt` on your computer in a text editor
   - Copy ALL the contents (Ctrl+A, Ctrl+C)
   - Paste into the Render shell (Ctrl+Shift+V or right-click → Paste)

7. **Press Ctrl+D** (or Cmd+D on Mac) to save the file

8. **Verify the file:**
   ```bash
   ls -lh youtube-cookies.txt
   head -n 5 youtube-cookies.txt
   ```
   - Should show file size and first 5 lines

9. **Repeat for other service** (`trending-automation`)

#### Option B: Add to Git Repository (Not Recommended)

⚠️ **Security Warning:** Only do this if your repository is PRIVATE!

1. **Add to .gitignore** (to prevent accidental commits):
   ```bash
   echo "youtube-cookies.txt" >> .gitignore
   ```

2. **Copy cookies file** to project root:
   ```bash
   cp ~/Downloads/youtube-cookies.txt .
   ```

3. **DO NOT commit to git!** Cookies contain your session data.

---

### Step 4: Redeploy Services

After uploading cookies:

1. **Go to Render Dashboard**
2. **Click on `youtube-upload` service**
3. **Click "Manual Deploy"** → **"Deploy latest commit"**
4. Wait for deployment to complete
5. **Repeat for `trending-automation` service**

---

### Step 5: Verify It's Working

Check Render logs for:

**Success indicators:**
```
🔧 Using cookies: YES ✅
⬇️ Downloading video: https://www.youtube.com/shorts/XXXXX
✅ Download complete: /opt/render/project/src/youtube_video.mp4
```

**No more errors:**
```
❌ HTTP Error 429: Too Many Requests
❌ Sign in to confirm you're not a bot
```

---

## Cookie File Format

Your `youtube-cookies.txt` should look like this (example):

```
# Netscape HTTP Cookie File
# This is a generated file! Do not edit.
.youtube.com	TRUE	/	TRUE	1234567890	CONSENT	YES+cb.20210328-17-p0.en+FX+123
.youtube.com	TRUE	/	FALSE	1234567890	VISITOR_INFO1_LIVE	abcdefghijk
.youtube.com	TRUE	/	TRUE	1234567890	__Secure-1PSID	g.a00000000000
.youtube.com	TRUE	/	TRUE	1234567890	__Secure-3PSID	g.a00000000000
# ... more lines ...
```

**Important:**
- Must start with `# Netscape HTTP Cookie File`
- Contains multiple lines with tab-separated values
- Includes authentication cookies (SSID, HSID, etc.)

---

## Troubleshooting

### "Still getting 429 errors after adding cookies"

**Possible causes:**
1. **Cookies expired** - YouTube cookies typically last 1-2 months
   - Solution: Export fresh cookies and re-upload

2. **File format wrong** - Must be Netscape format
   - Solution: Use the recommended browser extension

3. **File not in correct location** - Must be in service root
   - Solution: Check with `ls -la /opt/render/project/src/youtube-cookies.txt`

4. **Service not redeployed** - Old code still running
   - Solution: Trigger manual deploy

### "Can't open Render Shell"

**Alternative - Use Environment Variable:**

1. **Convert cookies to base64:**
   ```bash
   cat youtube-cookies.txt | base64 > youtube-cookies-base64.txt
   ```

2. **Add to Render environment variables:**
   - Variable name: `YOUTUBE_COOKIES_BASE64`
   - Value: (paste base64 content)

3. **Update download script to decode:**
   ```javascript
   // Add at top of file
   if (process.env.YOUTUBE_COOKIES_BASE64) {
     const cookiesContent = Buffer.from(process.env.YOUTUBE_COOKIES_BASE64, 'base64').toString('utf-8');
     fs.writeFileSync('./youtube-cookies.txt', cookiesContent);
   }
   ```

### "Cookies file not working"

**Debug steps:**
1. Check file exists: `ls -la youtube-cookies.txt`
2. Check file size: Should be 2-10 KB typically
3. Check first line: Must be `# Netscape HTTP Cookie File`
4. Try exporting fresh cookies from a different browser
5. Make sure you're logged into YouTube when exporting

---

## Cookie Security

### ⚠️ Important Security Notes:

1. **Cookies = Your YouTube Session**
   - Anyone with your cookies can access your YouTube account
   - Never share cookies publicly
   - Never commit cookies to public GitHub repos

2. **Cookie Expiration**
   - YouTube cookies typically expire after 1-2 months
   - You'll need to re-export and re-upload periodically
   - Set a calendar reminder to refresh cookies monthly

3. **Best Practices:**
   - Use a dedicated YouTube account for automation (not your personal account)
   - Enable 2-factor authentication on your YouTube/Google account
   - Rotate cookies regularly
   - Delete old cookies from Render when refreshing

---

## Cookie Lifecycle

```
Export Cookies → Upload to Render → Downloads Work ✅
                                    ↓
                            (1-2 months later)
                                    ↓
                          Cookies Expire 🕐
                                    ↓
                          Downloads Fail Again ❌
                                    ↓
                       Export Fresh Cookies → Repeat
```

**Set a reminder:** Re-export cookies every **30 days** to prevent failures.

---

## Alternative: Use Dedicated YouTube Account

For better security, create a separate YouTube account just for automation:

1. **Create new Google account**
2. **Log into YouTube** with new account
3. **Export cookies** from this account
4. **Use for automation** only

Benefits:
- If cookies leak, main account is safe
- Can monitor automation account separately
- Easy to revoke access by changing password

---

## Quick Command Reference

**Check if cookies file exists:**
```bash
ls -la /opt/render/project/src/youtube-cookies.txt
```

**View first 5 lines:**
```bash
head -n 5 youtube-cookies.txt
```

**Check file size:**
```bash
wc -l youtube-cookies.txt  # Should have 20-100 lines typically
```

**Remove old cookies:**
```bash
rm youtube-cookies.txt
```

**Create new cookies file via shell:**
```bash
cat > youtube-cookies.txt
# Paste content
# Press Ctrl+D
```

---

## Success! What Next?

After setup, your automations should work reliably with:
- ✅ No more 429 errors
- ✅ No bot detection messages
- ✅ Smooth video downloads
- ✅ Continuous operation 24/7

**Monitor logs** for successful downloads and set a reminder to refresh cookies in 30 days.
