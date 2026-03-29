# How to Add Background Music to Duterte Videos

## Current Status
✅ Videos are rendering with:
- Cool motion graphics (particles, rotations, scales)
- Animated text effects (spring animations, slides, fades)
- Safe zones for vertical video
- Background images with overlays

⚠️ Background music is commented out in the compositions

## To Enable Background Music:

### Option 1: Use Free Copyright-Free Music (Recommended)

1. **Download a free EDM/Techno track** from these sources:
   - **Pixabay Music**: https://pixabay.com/music/
   - **YouTube Audio Library**: https://www.youtube.com/audiolibrary/music
   - **Free Music Archive**: https://freemusicarchive.org/
   - **Bensound**: https://www.bensound.com/royalty-free-music

2. **Save the file as**:
   ```
   /Users/kirbydimsontompong/youtube-to-facebook/remotion/public/music/background.mp3
   ```

3. **Recommended tracks**:
   - Search for: "techno", "edm", "electronic", "upbeat"
   - Duration: 25-30 seconds minimum
   - Format: MP3
   - Ensure it's copyright-free/royalty-free

4. **Uncomment the audio in compositions**:

   In `/remotion/DuterteFact.jsx` and `/remotion/DuterteQuote.jsx`:

   Change:
   ```jsx
   {/* Background Music - Commented out until valid music file is added
   <Audio
     src={staticFile('music/background.mp3')}
     volume={0.3}
     startFrom={0}
   />
   */}
   ```

   To:
   ```jsx
   {/* Background Music */}
   <Audio
     src={staticFile('music/background.mp3')}
     volume={0.3}
     startFrom={0}
   />
   ```

### Option 2: Use Script to Download Music

Run:
```bash
node fetch-music.js
```

This will attempt to download copyright-free music automatically.

## Adjust Music Volume

Edit the `volume` parameter (0.0 to 1.0):
```jsx
<Audio
  src={staticFile('music/background.mp3')}
  volume={0.3}  // Change this: 0.3 = 30% volume
  startFrom={0}
/>
```

## Music Requirements

- **Format**: MP3
- **Duration**: At least 25-30 seconds
- **License**: Copyright-free / Royalty-free
- **Style**: Techno, EDM, Electronic (upbeat)
- **File size**: Under 10MB recommended

## Test After Adding Music

```bash
# Test render
node duterte-video-automation.js --dry-run --single

# Post one video
node duterte-video-automation.js --single
```

## Current Video Features (Without Music)

✅ Cool motion graphics with particles
✅ Spring-based animations
✅ Rotating and scaling effects
✅ Staggered text reveals
✅ Glow and shimmer effects
✅ Safe zones for vertical video
✅ Background images with overlays
✅ Blur and backdrop filters

## Video Posted Successfully

Latest video: https://www.facebook.com/112550405075594/videos/922226437455262

All animations are working perfectly! 🎉
