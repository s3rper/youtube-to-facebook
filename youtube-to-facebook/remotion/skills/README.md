# Remotion Best Practices Skills

This directory contains official Remotion best practices from `remotion-dev/skills`.

## Source
https://github.com/remotion-dev/skills

These skills provide domain-specific knowledge for working with Remotion video creation.

## Quick Reference - Most Relevant for This Project

### 🎯 Currently Used:
- **[calculate-metadata.md](rules/calculate-metadata.md)** - ✅ Already implemented for dynamic duration
- **[timing.md](rules/timing.md)** - ✅ Using spring animations and interpolation
- **[images.md](rules/images.md)** - ✅ Using staticFile() for background images
- **[compositions.md](rules/compositions.md)** - ✅ Composition structure with Root.jsx

### 📚 Highly Recommended to Review:
- **[text-animations.md](rules/text-animations.md)** - Typography and text animation patterns
- **[animations.md](rules/animations.md)** - Fundamental animation techniques
- **[measuring-text.md](rules/measuring-text.md)** - Text fitting and overflow detection
- **[sequencing.md](rules/sequencing.md)** - Delay, trim, and sequence timing patterns
- **[transitions.md](rules/transitions.md)** - Scene transition effects

### 🔊 For Future Enhancements:
- **[audio.md](rules/audio.md)** - Audio import, volume, speed, pitch
- **[display-captions.md](rules/display-captions.md)** - Subtitle/caption display
- **[import-srt-captions.md](rules/import-srt-captions.md)** - Import SRT subtitle files
- **[voiceover.md](rules/voiceover.md)** - AI-generated voiceover with ElevenLabs

### 🎨 For Advanced Visual Effects:
- **[charts.md](rules/charts.md)** - Data visualization (bar, pie, line charts)
- **[light-leaks.md](rules/light-leaks.md)** - Light leak overlay effects
- **[lottie.md](rules/lottie.md)** - Lottie animations
- **[3d.md](rules/3d.md)** - Three.js and React Three Fiber

### 🛠 Utility Skills:
- **[fonts.md](rules/fonts.md)** - Loading Google Fonts and local fonts
- **[gifs.md](rules/gifs.md)** - Synchronized GIF display
- **[videos.md](rules/videos.md)** - Embedding and manipulating videos
- **[tailwind.md](rules/tailwind.md)** - TailwindCSS integration
- **[parameters.md](rules/parameters.md)** - Parametrizable videos with Zod schema
- **[maps.md](rules/maps.md)** - Mapbox integration and animation

## All Available Skills

Run `ls rules/` to see all 38 skill files:

```bash
ls remotion/skills/rules/
```

## How to Use

1. **Read relevant skill files** before implementing new features
2. **Reference code examples** from the skills when writing Remotion code
3. **Follow best practices** outlined in each skill
4. **Copy-paste starter code** and adapt to your needs

## Example: Adding Text Animations

```bash
# Read the text-animations skill
cat remotion/skills/rules/text-animations.md
```

Then apply the patterns to your compositions!

## Installation Notes

The skills were installed manually from:
```bash
git clone https://github.com/remotion-dev/skills.git
```

The official CLI command `npx remotion skills add` was attempted but encountered an interactive prompt issue.

---

**Tip**: These skills are constantly updated. To get the latest version, run:
```bash
cd /tmp && git clone https://github.com/remotion-dev/skills.git &&
cp -r remotion-dev/skills/skills/remotion/rules/* ~/youtube-to-facebook/remotion/skills/rules/
```
