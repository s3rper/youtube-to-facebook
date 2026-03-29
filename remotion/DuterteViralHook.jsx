import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img, staticFile, spring, Audio } from 'remotion';
import { getFactTimings } from './calculateDuration';

// SAFE ZONES for short-form video (TikTok, Reels, Shorts) - Mobile optimized
const SAFE_TOP = '16%';
const SAFE_BOTTOM = '22%';

// Viral Hook Helper - Word-by-word reveal with highlight (from text-animations.md)
const HighlightedWord = ({ word, progress, color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const highlightProgress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 200 },
  });

  const scaleX = Math.max(0, Math.min(1, highlightProgress)) * progress;

  return (
    <span style={{ position: 'relative', display: 'inline-block', margin: '0 8px' }}>
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '1.1em',
          transform: `translateY(-50%) scaleX(${scaleX})`,
          transformOrigin: 'left center',
          backgroundColor: color,
          borderRadius: '0.2em',
          zIndex: 0,
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{word}</span>
    </span>
  );
};

// Viral Hook - First 5 seconds attention grabber
const ViralHook = ({ headline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Extract key word from headline for emphasis
  const words = headline.split(' ');
  const keyWordIndex = Math.min(2, words.length - 1); // Highlight 3rd word or less

  // Explosive entrance animation
  const explosionScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 200, mass: 0.5 }
  });

  const shakeX = Math.sin(frame * 0.5) * interpolate(frame, [0, 30], [10, 0], { extrapolateRight: 'clamp' });
  const shakeY = Math.cos(frame * 0.7) * interpolate(frame, [0, 30], [8, 0], { extrapolateRight: 'clamp' });

  // Pulsing effect
  const pulse = Math.sin(frame * 0.2) * 0.05 + 1;

  // Word-by-word reveal with highlights
  const wordDelay = 8; // frames between words

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) translate(${shakeX}px, ${shakeY}px) scale(${explosionScale * pulse})`,
      textAlign: 'center',
      width: '90%',
      padding: '0 40px',
    }}>
      {/* Attention grabber */}
      <div style={{
        fontSize: '80px',
        fontWeight: '900',
        color: '#FFD700',
        textShadow: '0 0 40px rgba(255, 215, 0, 0.9), 0 6px 16px rgba(0,0,0,0.95)',
        marginBottom: '35px',
        letterSpacing: '4px',
        textTransform: 'uppercase',
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        🔥 BREAKING 🔥
      </div>

      {/* Headline with word-by-word highlights */}
      <div style={{
        fontSize: '84px',
        fontWeight: '900',
        color: 'white',
        textShadow: '0 8px 24px rgba(0,0,0,0.95)',
        lineHeight: '1.15',
        letterSpacing: '1.5px',
      }}>
        {words.map((word, i) => {
          const wordFrame = frame - 20 - (i * wordDelay);
          const wordOpacity = interpolate(
            wordFrame,
            [0, 10],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );

          const isKeyWord = i === keyWordIndex;

          if (isKeyWord) {
            return (
              <HighlightedWord
                key={i}
                word={word}
                progress={wordOpacity}
                color="rgba(255, 215, 0, 0.6)"
                delay={20 + i * wordDelay}
              />
            );
          }

          return (
            <span key={i} style={{
              opacity: wordOpacity,
              display: 'inline-block',
              margin: '0 8px',
            }}>
              {word}
            </span>
          );
        })}
      </div>

      {/* Urgency indicator */}
      <div style={{
        marginTop: '30px',
        fontSize: '48px',
        fontWeight: '700',
        color: '#FF4444',
        textShadow: '0 0 30px rgba(255, 68, 68, 0.8), 0 4px 12px rgba(0,0,0,0.8)',
        opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' }),
        letterSpacing: '3px',
      }}>
        ⚡ YOU NEED TO SEE THIS ⚡
      </div>
    </div>
  );
};

// Animated Background with motion graphics
const AnimatedBackground = ({ frame, colors }) => {
  // Animated gradient
  const gradientAngle = interpolate(frame, [0, 900], [135, 495], { extrapolateRight: 'wrap' });

  // Moving shapes - Reduced for mobile performance
  const shapes = Array.from({ length: 5 }, (_, i) => {
    const speed = 0.01 + i * 0.002;
    const size = 100 + i * 50;
    return {
      x: Math.sin(frame * speed + i) * 300,
      y: Math.cos(frame * speed * 0.7 + i) * 400,
      scale: interpolate(Math.sin(frame * 0.03 + i), [-1, 1], [0.5, 1.5]),
      rotation: frame * (0.5 + i * 0.2),
      opacity: interpolate(Math.sin(frame * 0.04 + i * 0.5), [-1, 1], [0.1, 0.3]),
      size,
    };
  });

  return (
    <>
      {/* Animated gradient background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `linear-gradient(${gradientAngle}deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[0]} 100%)`,
      }} />

      {/* Moving geometric shapes */}
      {shapes.map((shape, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            transform: `translate(-50%, -50%) translate(${shape.x}px, ${shape.y}px) scale(${shape.scale}) rotate(${shape.rotation}deg)`,
            opacity: shape.opacity,
            background: i % 2 === 0
              ? 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))'
              : 'rgba(255, 255, 255, 0.08)',
            borderRadius: i % 3 === 0 ? '50%' : '20%',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(2px)',
          }}
        />
      ))}

      {/* Glowing particles - Reduced for mobile performance */}
      {Array.from({ length: 20 }, (_, i) => {
        const x = Math.sin(i * 0.5 + frame * 0.015) * 400;
        const y = Math.cos(i * 0.3 + frame * 0.012) * 500;
        const scale = interpolate(Math.sin(frame * 0.05 + i), [-1, 1], [0.3, 1.2]);
        const opacity = interpolate(Math.cos(frame * 0.03 + i * 0.6), [-1, 1], [0.2, 0.5]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#FFD700',
              transform: `translate(${x}px, ${y}px) scale(${scale})`,
              opacity: opacity,
              boxShadow: `0 0 ${10 + scale * 20}px rgba(255, 215, 0, ${opacity})`,
            }}
          />
        );
      })}
    </>
  );
};

// Content with typewriter + highlighting
const ContentWithHighlights = ({ content, frame }) => {
  const words = content.split(' ');
  const wordDelay = 3; // frames per word

  return (
    <div style={{
      textAlign: 'center',
      maxWidth: '920px',
      padding: '0 60px',
    }}>
      <div style={{
        fontSize: '58px',
        fontWeight: '700',
        color: 'white',
        textShadow: '0 6px 16px rgba(0,0,0,0.95)',
        lineHeight: '1.7',
        letterSpacing: '0.5px',
      }}>
        {words.map((word, i) => {
          const wordFrame = frame - (i * wordDelay);
          const wordOpacity = interpolate(
            wordFrame,
            [0, 8],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );

          // Highlight every 5th word for emphasis
          const shouldHighlight = i % 5 === 0 && i > 0;

          if (shouldHighlight) {
            return (
              <HighlightedWord
                key={i}
                word={word}
                progress={wordOpacity}
                color="rgba(255, 215, 0, 0.4)"
                delay={i * wordDelay}
              />
            );
          }

          return (
            <span key={i} style={{
              opacity: wordOpacity,
              display: 'inline-block',
              margin: '0 4px',
            }}>
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const DuterteViralHook = ({ headline, content, source, sentiment, backgroundImage }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const timings = getFactTimings(durationInFrames);

  // Philippine flag colors with extra vibrancy
  const gradientColors = {
    positive: ['#0045D1', '#FF1744'],
    neutral: ['#0045D1', '#1976D2'],
    controversial: ['#FF1744', '#C62828'],
  };
  const colors = gradientColors[sentiment] || gradientColors.neutral;

  return (
    <AbsoluteFill style={{
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      {/* Background Music */}
      <Audio
        src={staticFile('music/background.mp3')}
        volume={0.3}
        startFrom={0}
      />

      {/* Animated Background */}
      <AnimatedBackground frame={frame} colors={colors} />

      {/* Background Image (if provided) - dimmed for text readability */}
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
              opacity: 0.15,
              filter: 'blur(8px)',
            }}
          />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, ${colors[0]}DD 0%, ${colors[1]}DD 100%)`,
          }} />
        </>
      )}

      {/* Vignette overlay for focus */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
      }} />

      {/* VIRAL HOOK - First 5 seconds (0-150 frames) */}
      {frame < 150 && (
        <AbsoluteFill>
          <ViralHook headline={headline} />
        </AbsoluteFill>
      )}

      {/* Content with highlights - appears after hook and stays until end */}
      {frame >= 150 && (
        <AbsoluteFill>
          {(() => {
            const contentFrame = frame - 150;
            const contentSpring = spring({
              frame: contentFrame,
              fps,
              config: { damping: 15, stiffness: 100 }
            });

            // Slide in from left effect
            const slideX = interpolate(
              contentFrame,
              [0, 20],
              [-1080, 0],
              { extrapolateRight: 'clamp' }
            );

            return (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translateX(${slideX}px) scale(${Math.min(contentSpring, 1)})`,
                opacity: Math.min(contentSpring, 1),
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <ContentWithHighlights content={content} frame={contentFrame} />
              </div>
            );
          })()}
        </AbsoluteFill>
      )}

      {/* Source - stays visible until end (appears after content transition) */}
      {source && frame >= timings.sourceStart && (
        (() => {
          const sourceSpring = spring({
            frame: frame - timings.sourceStart,
            fps,
            config: { damping: 10, stiffness: 150 }
          });

          return (
            <div style={{
              position: 'absolute',
              bottom: SAFE_BOTTOM,
              left: '50%',
              transform: `translateX(-50%) scale(${Math.min(sourceSpring, 1)})`,
              opacity: Math.min(sourceSpring, 1),
              marginBottom: '100px',
              zIndex: 10,
            }}>
              <div style={{
                fontSize: '42px',
                fontWeight: '700',
                color: 'white',
                textShadow: '0 4px 14px rgba(0,0,0,0.95)',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '18px 42px',
                borderRadius: '32px',
                backdropFilter: 'blur(24px)',
                border: '3px solid rgba(255, 215, 0, 0.7)',
                letterSpacing: '1px',
              }}>
                📰 SOURCE: {source.toUpperCase()}
              </div>
            </div>
          );
        })()
      )}

      {/* Footer (always visible, in safe zone) */}
      <div style={{
        position: 'absolute',
        bottom: SAFE_BOTTOM,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '40px',
        fontWeight: '900',
        color: 'white',
        textShadow: '0 4px 14px rgba(0,0,0,0.95)',
        letterSpacing: '2.5px',
        background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s linear infinite',
        zIndex: 5,
      }}>
        🇵🇭 PHILIPPINES NEWS 🇵🇭
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </AbsoluteFill>
  );
};
