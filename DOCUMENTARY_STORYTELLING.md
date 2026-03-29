# Documentary-Style Storytelling System

## Overview
The Duterte politics videos now use **dynamic duration based on storytelling pacing** instead of fixed durations. This follows Remotion best practices and creates a more engaging, documentary-style experience.

## ✅ Latest Test Video
https://www.facebook.com/112550405075594/videos/1478864076985522

## Key Features

### 1. **Dynamic Duration Calculation**
Videos automatically adjust their length based on content:
- **Reading Speed**: 180 words per minute (comfortable with visuals)
- **Minimum Duration**: 15 seconds (facts), 12 seconds (quotes)
- **Maximum Duration**: 30 seconds (facts), 25 seconds (quotes)
- **Comfortable Buffers**: 20% for facts, 15% for quotes

### 2. **Documentary-Style Pacing**
Each section has dedicated time based on content length:

#### **Fact Videos:**
- **Intro (0-8%)**: Badge animation "DID YOU KNOW?"
- **Headline (8-30%)**: Main topic display with hold time
- **Content (30-75%)**: Detailed facts with reading pace
- **Source (75-90%)**: Citation display
- **Outro (90-100%)**: Fade out

#### **Quote Videos:**
- **Opening (0-8%)**: Quote marks reveal
- **Quote (8-70%)**: Quote text with dramatic pacing
- **Attribution (70-85%)**: "— PRESIDENT RODRIGO DUTERTE"
- **Context (85-92%)**: Historical context
- **Outro (92-100%)**: Fade out

### 3. **Professional Typography**
- **Headlines**: 75px, weight 900, uppercase, 1.15 line height
- **Content**: 52px, weight 500, 1.5 line height
- **Source/Attribution**: 42px, weight 700, uppercase
- **Context**: 34px, weight 600

### 4. **Documentary Visual Effects**
- Larger text sizes for impact
- Stronger shadows (0 6px 12px)
- Subtle glow effects
- Backdrop blur (15px)
- Border accents (2px rgba)
- Uppercase text for emphasis
- Increased letter spacing (0.5-1px)

### 5. **Smart Animation Timing**
All animations scale proportionally to video duration:
- Badge: First 8% of video
- Headline: Appears at 8%, holds until 30%
- Content: Enters at 30%, staggered line reveals
- Source/Attribution: Shows at 70-75%
- Context: Final detail at 85%

### 6. **Conditional Rendering**
Elements only appear during their designated time slots:
```jsx
{frame >= timings.headlineStart && frame < timings.contentStart + 30 && (
  <div>Headline content</div>
)}
```

This prevents overlapping text and ensures clean transitions.

## How Duration is Calculated

### Reading Time Formula
```javascript
words = text.split(/\s+/).length
readingTimeSeconds = (words / 180) * 60
```

### Fact Video Duration
```javascript
introTime = 2 seconds
headlineTime = max(3, readingTime(headline) + 1)
contentTime = max(4, readingTime(content) + 2)
sourceTime = 2 seconds (if source exists)
outroTime = 1.5 seconds

total = (intro + headline + content + source + outro) × 1.2
duration = clamp(total, 15s, 30s) × 30fps
```

### Quote Video Duration
```javascript
introTime = 1.5 seconds
headlineTime = max(2.5, readingTime(headline) + 0.5)
contentTime = max(3.5, readingTime(content) + 1.5)
attributionTime = 2 seconds
contextTime = 1.5 seconds (if context exists)
outroTime = 1.5 seconds

total = (intro + headline + content + attribution + context + outro) × 1.15
duration = clamp(total, 12s, 25s) × 30fps
```

## Example Duration Calculations

### Short Fact (15 seconds minimum)
```
Headline: "Manila Bay Cleanup" (3 words)
Content: "Massive cleanup operations started in 2019" (7 words)
Source: "DENR"

Calculation:
- Headline: max(3, 3/180*60 + 1) = 3s
- Content: max(4, 7/180*60 + 2) = 4s
- Total: (2 + 3 + 4 + 2 + 1.5) × 1.2 = 15s ✓
```

### Long Fact (25 seconds)
```
Headline: "Build Build Build Program" (4 words)
Content: "Ang Build Build Build program ni Duterte ay nagtayo ng 29,000 kilometers ng kalsada at 5,950 flood control projects" (22 words)
Source: "DPWH"

Calculation:
- Headline: max(3, 4/180*60 + 1) = 3s
- Content: max(4, 22/180*60 + 2) = 9.3s
- Total: (2 + 3 + 9.3 + 2 + 1.5) × 1.2 = 21.4s
- Rounded: 21s × 30fps = 630 frames
```

## Remotion Best Practices Used

### 1. **calculateMetadata**
Dynamic duration calculation using Remotion's recommended approach:
```jsx
<Composition
  id="DuterteFact"
  component={DuterteFact}
  calculateMetadata={({ props }) => {
    return {
      durationInFrames: calculateFactDuration(props),
      props,
    };
  }}
/>
```

### 2. **useVideoConfig**
Accessing dynamic duration inside compositions:
```jsx
const { fps, durationInFrames } = useVideoConfig();
const timings = getFactTimings(durationInFrames);
```

### 3. **Proportional Timing**
All animations scale with video duration (percentage-based):
```javascript
headlineStart: Math.round(duration * 0.08)  // 8% of video
contentStart: Math.round(duration * 0.30)   // 30% of video
```

### 4. **Spring Physics**
Smooth, natural animations using spring config:
```jsx
const headlineSpring = spring({
  frame: frame - timings.headlineStart,
  fps,
  config: { damping: 15, stiffness: 100 }
});
```

### 5. **Safe Zones**
Text positioned to avoid UI overlays:
```javascript
SAFE_TOP = '12%'     // Avoid notches, status bar
SAFE_BOTTOM = '18%'  // Avoid captions, controls
```

## Benefits

### For Viewers:
✅ Natural reading pace (not too fast or slow)
✅ Professional documentary feel
✅ Clear hierarchy of information
✅ Comfortable comprehension time
✅ No text overlap or rushing

### For Content:
✅ Adapts to any content length
✅ Maintains consistent pacing
✅ Respects minimum/maximum bounds
✅ Looks professional regardless of word count

### For Automation:
✅ No manual duration tuning needed
✅ Works with database content automatically
✅ Scalable to hundreds of videos
✅ Consistent quality across all videos

## Technical Implementation

### Files Modified:
1. **remotion/calculateDuration.js** (NEW)
   - `calculateFactDuration(props)` - Duration calculator for facts
   - `calculateQuoteDuration(props)` - Duration calculator for quotes
   - `getFactTimings(duration)` - Animation breakpoints for facts
   - `getQuoteTimings(duration)` - Animation breakpoints for quotes

2. **remotion/DuterteFact.jsx**
   - Dynamic timing using `getFactTimings()`
   - Proportional animations
   - Conditional rendering by time slot
   - Documentary typography

3. **remotion/DuterteQuote.jsx**
   - Dynamic timing using `getQuoteTimings()`
   - Dramatic quote pacing
   - Attribution reveal timing
   - Documentary styling

4. **remotion/Root.jsx**
   - `calculateMetadata` implementation
   - Dynamic duration per video

## Performance

### Render Times:
- **15-20 seconds**: ~15-18 seconds to render
- **20-25 seconds**: ~18-23 seconds to render
- **25-30 seconds**: ~20-25 seconds to render

### File Sizes:
- **15 seconds**: ~1.8-2.0 MB
- **20 seconds**: ~2.0-2.3 MB
- **25 seconds**: ~2.3-2.5 MB
- **30 seconds**: ~2.5-2.8 MB

All within Facebook's 1GB limit ✓

## Testing

```bash
# Test with dry run
node duterte-video-automation.js --dry-run --single

# Post one video
node duterte-video-automation.js --single

# Start continuous automation
node duterte-video-automation.js
```

## Video Examples

Check these videos to see the documentary storytelling in action:
- https://www.facebook.com/112550405075594/videos/1478864076985522
- https://www.facebook.com/112550405075594/videos/3446648065497827
- https://www.facebook.com/112550405075594/videos/922226437455262

## Future Enhancements

Potential improvements:
- Add background music that loops to match duration
- Voice-over narration support
- Multiple background image transitions
- Dynamic particle density based on duration
- Category-specific visual themes
- Animated statistics/charts for data-heavy facts

---

**Result**: Professional documentary-style videos with intelligent pacing based on content length! 🎬
