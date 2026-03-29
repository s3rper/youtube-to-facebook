import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img, staticFile, spring, Audio } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { getFactTimings } from './calculateDuration';

// Typewriter effect helper (from text-animations.md best practices)
const getTypedText = (frame, fullText, charFrames = 1) => {
  const typedChars = Math.floor(frame / charFrames);
  return fullText.slice(0, Math.min(typedChars, fullText.length));
};

// Text wrapping helper with proper character handling
const wrapText = (text, maxLength) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
};

// Badge component with proper sequencing
const Badge = ({ opacity }) => (
  <div style={{
    position: 'absolute',
    top: '16%',
    opacity,
    textAlign: 'center',
    width: '100%',
  }}>
    <div style={{
      fontSize: '110px',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '0 6px 16px rgba(0,0,0,0.7)',
      marginBottom: '25px',
      filter: `drop-shadow(0 0 30px rgba(255,255,255,${opacity * 0.4}))`,
    }}>
      📌
    </div>
    <div style={{
      fontSize: '76px',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '0 6px 16px rgba(0,0,0,0.7)',
      letterSpacing: '3px',
    }}>
      DID YOU KNOW?
    </div>
  </div>
);

// Headline component with spring animation
const Headline = ({ headline, progress, slide, scale }) => {
  const headlineLines = wrapText(headline, 25);

  return (
    <div style={{
      opacity: progress,
      textAlign: 'center',
      marginBottom: '60px',
      transform: `translateX(${slide}px) scale(${scale})`,
      padding: '0 40px',
    }}>
      {headlineLines.map((line, index) => (
        <div key={index} style={{
          fontSize: '88px',
          fontWeight: '900',
          color: 'white',
          textShadow: '0 8px 18px rgba(0,0,0,0.8)',
          marginBottom: '18px',
          lineHeight: '1.12',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}>
          {line}
        </div>
      ))}
    </div>
  );
};

// Content component with typewriter effect (best practice from text-animations.md)
const Content = ({ content, frame, opacity, slide }) => {
  const contentLines = wrapText(content, 30);

  return (
    <div style={{
      opacity,
      textAlign: 'center',
      maxWidth: '900px',
      transform: `translateY(${slide}px)`,
      padding: '0 40px',
    }}>
      {contentLines.map((line, index) => {
        // Staggered typewriter effect per line
        const lineDelay = index * 15; // 15 frames delay between lines
        const localFrame = Math.max(0, frame - lineDelay);
        const typedLine = getTypedText(localFrame, line, 1); // 1 frame per character

        // Line fade in
        const lineOpacity = interpolate(
          localFrame,
          [0, 10],
          [0, 1],
          { extrapolateRight: 'clamp' }
        );

        return (
          <div key={index} style={{
            fontSize: '58px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.95)',
            textShadow: '0 5px 12px rgba(0,0,0,0.8)',
            marginBottom: '16px',
            lineHeight: '1.65',
            opacity: lineOpacity,
            minHeight: '72px', // Prevent layout shift
          }}>
            {typedLine}
          </div>
        );
      })}
    </div>
  );
};

// Source component with bounce effect
const Source = ({ source, progress, scale }) => (
  <div style={{
    position: 'absolute',
    bottom: '22%',
    marginBottom: '85px',
    opacity: progress,
    fontSize: '42px',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    textShadow: '0 4px 12px rgba(0,0,0,0.8)',
    transform: `scale(${scale})`,
    background: 'rgba(0, 0, 0, 0.6)',
    padding: '18px 44px',
    borderRadius: '32px',
    backdropFilter: 'blur(22px)',
    border: '3px solid rgba(255, 255, 255, 0.25)',
    letterSpacing: '1px',
  }}>
    📰 SOURCE: {source.toUpperCase()}
  </div>
);

// Footer component
const Footer = ({ opacity }) => (
  <div style={{
    position: 'absolute',
    bottom: '22%',
    opacity,
    fontSize: '40px',
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.95)',
    textShadow: '0 4px 10px rgba(0,0,0,0.7)',
    letterSpacing: '2px',
  }}>
    🇵🇭 PHILIPPINES NEWS 🇵🇭
  </div>
);

export const DuterteFactEnhanced = ({ headline, content, source, sentiment, backgroundImage }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Get dynamic timing breakpoints
  const timings = getFactTimings(durationInFrames);

  // Philippine flag colors gradient
  const gradientColors = {
    positive: ['#0038A8', '#CE1126'],
    neutral: ['#0038A8', '#0038A8'],
    controversial: ['#CE1126', '#0038A8'],
  };
  const colors = gradientColors[sentiment] || gradientColors.neutral;

  // Floating particles (optimized for mobile)
  const particles = Array.from({ length: 10 }, (_, i) => ({
    x: Math.sin(i * 0.5 + frame * 0.02) * 300,
    y: Math.cos(i * 0.3 + frame * 0.015) * 400,
    scale: interpolate(Math.sin(frame * 0.05 + i), [-1, 1], [0.5, 1.5]),
    opacity: interpolate(Math.sin(frame * 0.03 + i * 0.5), [-1, 1], [0.1, 0.3])
  }));

  // Final fade out
  const finalFadeOut = interpolate(
    frame,
    [timings.outroStart, timings.outroEnd],
    [1, 0],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{
      background: backgroundImage ? 'black' : `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      {/* Background Music */}
      <Audio
        src={staticFile('music/background.mp3')}
        volume={0.3}
        startFrom={0}
      />

      {/* Background Image with Overlay */}
      {backgroundImage && (
        <>
          <Img
            src={staticFile(`backgrounds/${backgroundImage}`)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.3,
            }}
          />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, ${colors[0]}CC 0%, ${colors[1]}CC 100%)`,
          }} />
        </>
      )}

      {/* Animated Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: 'white',
            transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
            opacity: p.opacity * finalFadeOut,
          }}
        />
      ))}

      {/* TransitionSeries for proper sequencing (best practice from sequencing.md) */}
      <TransitionSeries>
        {/* Badge Sequence */}
        <TransitionSeries.Sequence durationInFrames={timings.badgeEnd}>
          <AbsoluteFill>
            <Badge
              opacity={interpolate(
                frame,
                [0, 20, timings.badgeEnd - 15, timings.badgeEnd],
                [0, 1, 1, 0],
                { extrapolateRight: 'clamp' }
              ) * finalFadeOut}
            />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        {/* Fade transition */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />

        {/* Headline Sequence */}
        <TransitionSeries.Sequence durationInFrames={timings.contentStart - timings.headlineStart}>
          <AbsoluteFill>
            {(() => {
              const headlineSpring = spring({
                frame: frame - timings.headlineStart,
                fps,
                config: { damping: 15, stiffness: 100 }
              });
              const headlineSlide = interpolate(headlineSpring, [0, 1], [-80, 0]);
              const headlineScale = interpolate(headlineSpring, [0, 1], [0.85, 1]);

              return (
                <Headline
                  headline={headline}
                  progress={headlineSpring * finalFadeOut}
                  slide={headlineSlide}
                  scale={headlineScale}
                />
              );
            })()}
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        {/* Fade transition */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />

        {/* Content Sequence with typewriter - stays visible until end */}
        <TransitionSeries.Sequence durationInFrames={durationInFrames - timings.contentStart}>
          <AbsoluteFill>
            {(() => {
              const contentFrame = frame - timings.contentStart;
              const contentSpring = spring({
                frame: contentFrame,
                fps,
                config: { damping: 18, stiffness: 90 }
              });
              const contentSlide = interpolate(contentSpring, [0, 1], [40, 0]);

              return (
                <Content
                  content={content}
                  frame={contentFrame}
                  opacity={contentSpring}
                  slide={contentSlide}
                />
              );
            })()}
          </AbsoluteFill>
        </TransitionSeries.Sequence>

      </TransitionSeries>

      {/* Source - stays visible until end (appears after content) */}
      {source && frame >= timings.sourceStart && (
        (() => {
          const sourceSpring = spring({
            frame: frame - timings.sourceStart,
            fps,
            config: { damping: 12, stiffness: 120 }
          });

          return (
            <Source
              source={source}
              progress={Math.min(sourceSpring, 1)}
              scale={Math.min(sourceSpring, 1)}
            />
          );
        })()
      )}

      {/* Footer (always visible) */}
      <Footer opacity={1} />
    </AbsoluteFill>
  );
};
