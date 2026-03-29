import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img, staticFile, spring, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

// SAFE ZONES for short-form video
const SAFE_TOP = '14%';
const SAFE_BOTTOM = '20%';

// Typewriter effect for documentary narration
const getTypedText = (frame, fullText, charFrames = 0.8) => {
  const typedChars = Math.floor(frame / charFrames);
  return fullText.slice(0, Math.min(typedChars, fullText.length));
};

// Calculate reading time and duration
const calculateStoryDuration = (story, fps = 30) => {
  const readingSpeed = 180; // words per minute

  const countWords = (text) => text.trim().split(/\s+/).length;

  const contextWords = countWords(story.context);
  const mainWords = countWords(story.main);
  const impactWords = countWords(story.impact);
  const takeawayWords = countWords(story.takeaway);

  const totalWords = contextWords + mainWords + impactWords + takeawayWords;
  const readingTimeSeconds = (totalWords / readingSpeed) * 60;

  // Add buffer time for animations and pauses
  const hookTime = 5; // 5 second viral hook
  const pausesBetweenSections = 3; // 0.75s x 4 sections
  const outroTime = 2;

  const totalSeconds = hookTime + readingTimeSeconds + pausesBetweenSections + outroTime;
  const bufferedSeconds = totalSeconds * 1.25; // 25% buffer for comfortable reading

  const frames = Math.round(bufferedSeconds * fps);
  const minFrames = 45 * fps; // Min 45 seconds
  const maxFrames = 120 * fps; // Max 2 minutes

  return Math.max(minFrames, Math.min(maxFrames, frames));
};

// Get timing breakpoints for story sections
const getStoryTimings = (durationInFrames, story) => {
  const duration = durationInFrames;

  // Account for transitions (20 frames for slide, 15 frames for fades)
  const slideTransition = 20;
  const fadeTransition = 15;

  // Hook: ~8% of duration
  const hookEnd = Math.round(duration * 0.08);

  // Context: ~18% of duration
  const contextStart = hookEnd + slideTransition;
  const contextDuration = Math.round(duration * 0.18);
  const contextEnd = contextStart + contextDuration;

  // Main: ~25% of duration
  const mainStart = contextEnd + fadeTransition;
  const mainDuration = Math.round(duration * 0.25);
  const mainEnd = mainStart + mainDuration;

  // Impact: ~22% of duration
  const impactStart = mainEnd + fadeTransition;
  const impactDuration = Math.round(duration * 0.22);
  const impactEnd = impactStart + impactDuration;

  // Takeaway: ~15% of duration
  const takeawayStart = impactEnd + fadeTransition;
  const takeawayDuration = Math.round(duration * 0.15);
  const takeawayEnd = takeawayStart + takeawayDuration;

  // Source: ~5% of duration
  const sourceStart = takeawayEnd + fadeTransition;
  const sourceDuration = Math.round(duration * 0.05);
  const sourceEnd = Math.min(sourceStart + sourceDuration, Math.round(duration * 0.95));

  // Outro: Final 5%
  const outroStart = Math.round(duration * 0.95);

  return {
    hookEnd,
    contextStart,
    contextEnd,
    mainStart,
    mainEnd,
    impactStart,
    impactEnd,
    takeawayStart,
    takeawayEnd,
    sourceStart,
    sourceEnd,
    outroStart,
    outroEnd: duration,
  };
};

// Viral Hook Component (explosive first 5 seconds)
const ViralHook = ({ headline, frame }) => {
  const { fps } = useVideoConfig();

  const explosionScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 200, mass: 0.5 }
  });

  const shakeX = Math.sin(frame * 0.5) * interpolate(frame, [0, 30], [10, 0], { extrapolateRight: 'clamp' });
  const shakeY = Math.cos(frame * 0.7) * interpolate(frame, [0, 30], [8, 0], { extrapolateRight: 'clamp' });
  const pulse = Math.sin(frame * 0.2) * 0.05 + 1;

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
      <div style={{
        fontSize: '54px',
        fontWeight: '900',
        color: '#FFD700',
        textShadow: '0 0 30px rgba(255, 215, 0, 0.8), 0 4px 12px rgba(0,0,0,0.8)',
        marginBottom: '30px',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        🔥 DOCUMENTARY 🔥
      </div>

      <div style={{
        fontSize: '62px',
        fontWeight: '900',
        color: 'white',
        textShadow: '0 6px 20px rgba(0,0,0,0.9)',
        lineHeight: '1.2',
        letterSpacing: '1px',
        opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        {headline}
      </div>

      <div style={{
        marginTop: '25px',
        fontSize: '38px',
        fontWeight: '700',
        color: '#FF4444',
        textShadow: '0 0 20px rgba(255, 68, 68, 0.6), 0 2px 8px rgba(0,0,0,0.6)',
        opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' }),
        letterSpacing: '2px',
      }}>
        ⚡ ANG BUONG KUWENTO ⚡
      </div>
    </div>
  );
};

// Section Badge (CONTEXT, MAIN, IMPACT, TAKEAWAY)
const SectionBadge = ({ label, icon, opacity }) => (
  <div style={{
    position: 'absolute',
    top: SAFE_TOP,
    left: '50%',
    transform: `translateX(-50%) scale(${opacity})`,
    opacity,
    background: 'rgba(255, 215, 0, 0.95)',
    padding: '12px 35px',
    borderRadius: '30px',
    fontSize: '32px',
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    boxShadow: '0 4px 20px rgba(255, 215, 0, 0.5)',
  }}>
    {icon} {label}
  </div>
);

// Story Section Component (reusable for all sections)
const StorySection = ({ text, frame, fontSize = 48 }) => {
  const typedText = getTypedText(frame, text, 0.8);

  // Split into lines for better readability
  const words = typedText.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    if (currentLine.length + word.length < 50) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return (
    <div style={{
      textAlign: 'center',
      maxWidth: '900px',
      padding: '0 50px',
    }}>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: '600',
            color: 'white',
            textShadow: '0 4px 12px rgba(0,0,0,0.8)',
            lineHeight: '1.5',
            letterSpacing: '0.5px',
            marginBottom: '15px',
            minHeight: `${fontSize * 1.5}px`,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

// Animated Background with motion graphics
const AnimatedBackground = ({ frame, colors }) => {
  const gradientAngle = interpolate(frame, [0, 1800], [135, 495], { extrapolateRight: 'wrap' });

  const shapes = Array.from({ length: 8 }, (_, i) => {
    const speed = 0.008 + i * 0.002;
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
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `linear-gradient(${gradientAngle}deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[0]} 100%)`,
      }} />

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

      {Array.from({ length: 30 }, (_, i) => {
        const x = Math.sin(i * 0.5 + frame * 0.012) * 400;
        const y = Math.cos(i * 0.3 + frame * 0.01) * 500;
        const scale = interpolate(Math.sin(frame * 0.04 + i), [-1, 1], [0.3, 1.2]);
        const opacity = interpolate(Math.cos(frame * 0.025 + i * 0.6), [-1, 1], [0.2, 0.5]);

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

export const DuterteDocumentary = ({ headline, story, source, sentiment, backgroundImage }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const timings = getStoryTimings(durationInFrames, story);

  const gradientColors = {
    positive: ['#0045D1', '#FF1744'],
    neutral: ['#0045D1', '#1976D2'],
    controversial: ['#FF1744', '#C62828'],
  };
  const colors = gradientColors[sentiment] || gradientColors.neutral;

  const finalFadeOut = interpolate(
    frame,
    [timings.outroStart, timings.outroEnd],
    [1, 0],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      <AnimatedBackground frame={frame} colors={colors} />

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

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
      }} />

      <TransitionSeries>
        {/* VIRAL HOOK - First 5 seconds */}
        <TransitionSeries.Sequence durationInFrames={timings.hookEnd}>
          <Sequence layout="none" premountFor={fps}>
            <div style={{ opacity: finalFadeOut }}>
              <ViralHook headline={headline} frame={frame} />
            </div>
          </Sequence>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-left' })}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* CONTEXT SECTION */}
        <TransitionSeries.Sequence durationInFrames={timings.contextEnd - timings.contextStart}>
          <Sequence layout="none" premountFor={fps}>
            {(() => {
              const sectionFrame = frame - timings.contextStart;
              const badgeSpring = spring({
                frame: sectionFrame,
                fps,
                config: { damping: 12, stiffness: 120 }
              });

              return (
                <>
                  <SectionBadge label="BACKGROUND" icon="📖" opacity={badgeSpring * finalFadeOut} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: finalFadeOut,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <StorySection text={story.context} frame={Math.max(0, sectionFrame - 20)} fontSize={50} />
                  </div>
                </>
              );
            })()}
          </Sequence>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />

        {/* MAIN SECTION */}
        <TransitionSeries.Sequence durationInFrames={timings.mainEnd - timings.mainStart}>
          <Sequence layout="none" premountFor={fps}>
            {(() => {
              const sectionFrame = frame - timings.mainStart;
              const badgeSpring = spring({
                frame: sectionFrame,
                fps,
                config: { damping: 12, stiffness: 120 }
              });

              return (
                <>
                  <SectionBadge label="ANG NANGYARI" icon="📰" opacity={badgeSpring * finalFadeOut} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: finalFadeOut,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <StorySection text={story.main} frame={Math.max(0, sectionFrame - 20)} fontSize={48} />
                  </div>
                </>
              );
            })()}
          </Sequence>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />

        {/* IMPACT SECTION */}
        <TransitionSeries.Sequence durationInFrames={timings.impactEnd - timings.impactStart}>
          <Sequence layout="none" premountFor={fps}>
            {(() => {
              const sectionFrame = frame - timings.impactStart;
              const badgeSpring = spring({
                frame: sectionFrame,
                fps,
                config: { damping: 12, stiffness: 120 }
              });

              return (
                <>
                  <SectionBadge label="RESULTA" icon="💥" opacity={badgeSpring * finalFadeOut} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: finalFadeOut,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <StorySection text={story.impact} frame={Math.max(0, sectionFrame - 20)} fontSize={48} />
                  </div>
                </>
              );
            })()}
          </Sequence>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />

        {/* TAKEAWAY SECTION */}
        <TransitionSeries.Sequence durationInFrames={timings.takeawayEnd - timings.takeawayStart}>
          <Sequence layout="none" premountFor={fps}>
            {(() => {
              const sectionFrame = frame - timings.takeawayStart;
              const badgeSpring = spring({
                frame: sectionFrame,
                fps,
                config: { damping: 12, stiffness: 120 }
              });

              return (
                <>
                  <SectionBadge label="BOTTOM LINE" icon="💡" opacity={badgeSpring * finalFadeOut} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: finalFadeOut,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <StorySection text={story.takeaway} frame={Math.max(0, sectionFrame - 20)} fontSize={54} />
                  </div>
                </>
              );
            })()}
          </Sequence>
        </TransitionSeries.Sequence>

        {source && (
          <>
            <TransitionSeries.Transition
              presentation={fade()}
              timing={linearTiming({ durationInFrames: 15 })}
            />

            <TransitionSeries.Sequence durationInFrames={timings.sourceEnd - timings.sourceStart}>
              <Sequence layout="none" premountFor={fps}>
                {(() => {
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
                      transform: `translateX(-50%) scale(${sourceSpring})`,
                      opacity: sourceSpring * finalFadeOut,
                      marginBottom: '80px',
                    }}>
                      <div style={{
                        fontSize: '36px',
                        fontWeight: '700',
                        color: 'white',
                        textShadow: '0 3px 10px rgba(0,0,0,0.8)',
                        background: 'rgba(0, 0, 0, 0.5)',
                        padding: '15px 40px',
                        borderRadius: '30px',
                        backdropFilter: 'blur(20px)',
                        border: '3px solid rgba(255, 215, 0, 0.5)',
                        letterSpacing: '1px',
                      }}>
                        📰 SOURCE: {source.toUpperCase()}
                      </div>
                    </div>
                  );
                })()}
              </Sequence>
            </TransitionSeries.Sequence>
          </>
        )}
      </TransitionSeries>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: SAFE_BOTTOM,
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: finalFadeOut,
        fontSize: '38px',
        fontWeight: '900',
        color: 'white',
        textShadow: '0 3px 10px rgba(0,0,0,0.8)',
        letterSpacing: '2px',
        background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s linear infinite',
      }}>
        🇵🇭 PHILIPPINES DOCUMENTARY 🇵🇭
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

// Export duration calculator for Root.jsx
export { calculateStoryDuration, getStoryTimings };
