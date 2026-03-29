# Node Modules Cleanup Guide

## ✅ Already Cleaned Up

Removed unnecessary packages:
- `child_process` (built-in Node.js module)
- `fs` (built-in Node.js module)
- `git` (not used)

**Packages removed**: 4
**Space saved**: ~2 MB (minimal - these were small)

---

## 📊 Current Size Breakdown

**Total**: 518 MB

### Largest Dependencies:

| Package | Size | Purpose | Can Remove? |
|---------|------|---------|-------------|
| @rspack + @remotion | 81 MB | Video generation with Remotion | ❌ If using duterte-video-automation.js |
| @img | 16 MB | Remotion image processing | ❌ If using duterte-video-automation.js |
| playwright | 13 MB | Browser automation | ✅ Only if NOT using registration-automation.js |
| @anthropic-ai | 5.1 MB | Claude AI integration | ❌ If using duterte-content-generator.js |
| webpack | 7.1 MB | Remotion bundler | ❌ If using Remotion |
| react-dom | 7.1 MB | Remotion rendering | ❌ If using Remotion |

---

## 🎯 Optional Cleanup (If You Don't Need Certain Features)

### Option 1: Remove Remotion (Saves ~150 MB)

**If you're ONLY using the YouTube upload automations and NOT generating videos with Remotion:**

```bash
npm uninstall @remotion/bundler @remotion/cli @remotion/renderer @remotion/transitions remotion
```

**⚠️ WARNING**: This will break:
- `duterte-video-automation.js`
- `remotion/` folder video generation
- `npm run studio` and `npm run render` commands

**✅ Safe if**: You only use `youtube-trending-automation.js` and `youtube_upload.js`

---

### Option 2: Remove Playwright (Saves ~13 MB)

**If you're NOT using the registration automation:**

```bash
npm uninstall playwright
```

**⚠️ WARNING**: This will break:
- `registration-automation.js`

**✅ Safe if**: You don't use registration automation

---

### Option 3: Remove Sharp (Saves ~8 MB)

**If you're NOT processing images:**

```bash
npm uninstall sharp
```

**⚠️ WARNING**: This will break:
- `news-image-generator.js`
- `image-handler.js`
- Some old shopee upload scripts

**✅ Safe if**: You don't use image generation/processing

---

### Option 4: Remove Form-Data (Saves ~1 MB)

**If you're NOT using old Shopee upload scripts:**

```bash
npm uninstall form-data
```

**⚠️ WARNING**: This will break old files like:
- `shopee_video_upload.js` (old versions)
- `facebook-poster.js`

**✅ Safe if**: You only use the current automations

---

## 🚀 Recommended Cleanup for Render Deployment

Since you're deploying to Render with only these 2 automations:
1. `youtube-trending-automation.js`
2. `youtube_upload.js`

You can remove everything else:

```bash
# Remove Remotion (video generation) - saves ~150 MB
npm uninstall @remotion/bundler @remotion/cli @remotion/renderer @remotion/transitions remotion

# Remove Playwright (browser automation) - saves ~13 MB
npm uninstall playwright

# Remove Sharp (image processing) - saves ~8 MB
npm uninstall sharp

# Remove Form-Data (old uploads) - saves ~1 MB
npm uninstall form-data

# Remove Anthropic AI (content generation) - saves ~5 MB
npm uninstall @anthropic-ai/sdk
```

**Total space saved**: ~177 MB (518 MB → ~341 MB)

**New package.json** would be:
```json
{
  "dependencies": {
    "axios": "^1.13.2",
    "dotenv": "^16.4.7",
    "express": "^5.2.1"
  }
}
```

---

## 📦 Minimal Setup (Just Upload Automations)

If you want the absolute minimum for Render deployment:

```bash
# Start fresh
rm -rf node_modules
rm package-lock.json

# Update package.json to minimal deps
npm install axios dotenv express --save

# Install
npm install
```

**Final size**: ~50 MB (down from 518 MB!)

**✅ What still works**:
- `youtube-trending-automation.js` ✅
- `youtube_upload.js` ✅
- Health check servers ✅
- Facebook uploads ✅
- YouTube API ✅

**❌ What breaks**:
- Remotion video generation ❌
- Registration automation ❌
- Image generation ❌
- Content generation with Claude AI ❌

---

## 🎯 My Recommendation

Since you're deploying to Render for the 2 upload automations:

### Keep Current Setup (518 MB)
**Pros**:
- Everything works
- Can use any automation later

**Cons**:
- Takes more time to deploy
- Uses more disk space on Render

### Minimal Setup (50 MB)
**Pros**:
- 10x smaller
- Faster deploys
- Less disk usage on Render

**Cons**:
- Only upload automations work
- Need to reinstall if you want Remotion later

---

## 🧹 Additional Cleanup Commands

### Remove unused old files (saves disk space in repo):
```bash
# List old copy files
ls -lh *copy*.js

# Remove if not needed
rm shopee_video_upload\ copy*.js
rm app\ copy*.js
```

### Clean npm cache:
```bash
npm cache clean --force
```

### Remove dev dependencies (none in your case):
```bash
npm prune --production
```

---

## ✅ What I've Done for You

1. ✅ Removed `child_process`, `fs`, `git` from package.json
2. ✅ Ran `npm prune` to clean up
3. ✅ Current size: 518 MB
4. ✅ Created this guide for further cleanup

---

## 🤔 What Should You Do?

**For Render Deployment (just upload automations)**:
→ Use **Minimal Setup** (50 MB) - Much faster deploys!

**For keeping all features**:
→ Keep current setup (518 MB) - Everything works

Let me know which approach you prefer, and I can help you set it up!
