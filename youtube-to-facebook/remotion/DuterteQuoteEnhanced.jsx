import { AbsoluteFill, interpolate, useCurrentFrame, Img, staticFile, spring, useVideoConfig, Audio } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { getQuoteTimings } from './calculateDuration';

// Typewriter effect for quotes (best practice from text-animations.md)
const getTypedText = (frame, fullText, charFrames = 1.5) => {
  const typedChars = Math.floor(frame / charFrames);
  return fullText.slice(0, Math.min(typedChars, fullText.length));
};

// Opening quote mark component
const OpeningQuote = ({ opacity, scale, rotate }) => (
  <div style={{
    position: 'absolute',
    top: '12%',
    fontSize: '140px',
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.25)',
    opacity,
    transform: `scale(${scale}) rotate(${rotate}deg)`,
    textShadow: '0 0 40px rgba(255, 255, 255, 0.2)',
    fontFamily: 'Georgia, serif',
  }}>
    "
  </div>
);

// Quote content with typewriter effect
const QuoteContent = ({ headline, content, frame, opacity, scale, slide }) => {
  // Typewriter for headline
  const typedHeadline = getTypedText(frame, headline, 2); // Slower for dramatic effect

  // Typewriter for content (starts after headline)
  const headlineFrames = headline.length * 2;
  const contentFrame = Math.max(0, frame - headlineFrames - 20); // 20 frame pause
  const typedContent = getTypedText(contentFrame, content, 1.5);

  return (
    <div style={{
      opacity,
      textAlign: 'center',
      maxWidth: '920px',
      marginBottom: '80px',
      transform: `scale(${scale}) translateY(${slide}px)`,
      padding: '0 40px',
    }}>
      <div style={{
        fontSize: '72px',
        fontWeight: '800',
        color: 'white',
        textShadow: '0 8px 18px rgba(0,0,0,0.85)',
        marginBottom: '45px',
        lineHeight: '1.25',
        letterSpacing: '1px',
        minHeight: '90px', // Prevent layout shift
      }}>
        {typedHeadline}
      </div>
      <div style={{
        fontSize: '58px',
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.95)',
        textShadow: '0 5px 14px rgba(0,0,0,0.8)',
        lineHeight: '1.7',
        fontStyle: 'italic',
        letterSpacing: '0.5px',
        minHeight: '88px', // Prevent layout shift
      }}>
        {typedContent}
      </div>
    </div>
  );
};

// Attribution component with dramatic reveal
const Attribution = ({ opacity, slide }) => (
  <div style={{
    opacity,
    fontSize: '46px',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    textShadow: '0 4px 12px rgba(0,0,0,0.8)',
    marginTop: '50px',
    textAlign: 'center',
    transform: `translateY(${slide}px)`,
    background: 'rgba(255, 255, 255, 0.18)',
    padding: '20px 52px',
    borderRadius: '36px',
    backdropFilter: 'blur(22px)',
    border: '3px solid rgba(255, 255, 255, 0.35)',
    letterSpacing: '1.2px',
  }}>
    — PRESIDENT RODRIGO DUTERTE
  </div>
);

// Context component
const Context = ({ context, opacity, scale }) => (
  <div style={{
    opacity,
    position: 'absolute',
    bottom: '22%',
    marginBottom: '90px',
    fontSize: '40px',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.92)',
    textShadow: '0 4px 12px rgba(0,0,0,0.8)',
    transform: `scale(${scale})`,
    background: 'rgba(0, 0, 0, 0.6)',
    padding: '16px 42px',
    borderRadius: '30px',
    backdropFilter: 'blur(22px)',
    letterSpacing: '1px',
    border: '2.5px solid rgba(255, 255, 255, 0.25)',
  }}>
    📅 {context}
  </div>
);

// Closing quote mark
const ClosingQuote = ({ opacity, scale, rotate }) => (
  <div style={{
    position: 'absolute',
    bottom: '240px',
    right: '80px',
    fontSize: '160px',
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.3)',
    opacity,
    transform: `scale(${scale}) rotate(-${rotate}deg)`,
    textShadow: '0 0 50px rgba(255, 255, 255, 0.25)',
    fontFamily: 'Georgia, serif',
  }}>
    "
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

export const DuterteQuoteEnhanced = ({ headline, content, context, sentiment, backgroundImage }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Get dynamic timing breakpoints
  const timings = getQuoteTimings(durationInFrames);

  // Floating particles
  // Floating particles (optimized for mobile)
  const particles = Array.from({ length: 12 }, (_, i) => ({
    x: Math.sin(i * 0.7 + frame * 0.015) * 250,
    y: Math.cos(i * 0.4 + frame * 0.012) * 350,
    scale: interpolate(Math.sin(frame * 0.04 + i), [-1, 1], [0.3, 1]),
    opacity: interpolate(Math.cos(frame * 0.025 + i * 0.6), [-1, 1], [0.05, 0.2])
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
      background: backgroundImage ? 'black' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
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

      {/* Background Image with Dark Overlay */}
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
              opacity: 0.25,
            }}
          />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(26,26,46,0.85) 0%, rgba(22,33,62,0.85) 100%)',
          }} />
        </>
      )}

      {/* Floating Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: 'white',
            transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
            opacity: p.opacity * finalFadeOut,
            boxShadow: `0 0 10px rgba(255, 255, 255, ${p.opacity})`,
          }}
        />
      ))}

      {/* TransitionSeries for proper sequencing */}
      <TransitionSeries>
        {/* Opening Quote Mark Sequence */}
        <TransitionSeries.Sequence durationInFrames={timings.quoteMarksEnd}>
          <AbsoluteFill>
            {(() => {
              const quoteMarkSpring = spring({
                frame,
                fps,
                config: { damping: 12, stiffness: 120 }
              });
              const quoteMarkScale = interpolate(quoteMarkSpring, [0, 1], [0, 1.1]);
              const quoteMarkRotate = interpolate(
                frame,
                [0, 25],
                [-10, 0],
                { extrapolateRight: 'clamp' }
              );

              return (
                <OpeningQuote
                  opacity={quoteMarkSpring * finalFadeOut}
                  scale={quoteMarkScale}
                  rotate={quoteMarkRotate}
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

        {/* Quote Content Sequence with typewriter - stays visible until end */}
        <TransitionSeries.Sequence durationInFrames={durationInFrames - timings.quoteStart}>
          <AbsoluteFill>
            {(() => {
              const quoteFrame = frame - timings.quoteStart;
              const quoteSpring = spring({
                frame: quoteFrame,
                fps,
                config: { damping: 18, stiffness: 85 }
              });
              const quoteScale = interpolate(quoteSpring, [0, 1], [0.92, 1]);
              const quoteSlide = interpolate(quoteSpring, [0, 1], [35, 0]);

              return (
                <QuoteContent
                  headline={headline}
                  content={content}
                  frame={quoteFrame}
                  opacity={quoteSpring}
                  scale={quoteScale}
                  slide={quoteSlide}
                />
              );
            })()}
          </AbsoluteFill>
        </TransitionSeries.Sequence>

      </TransitionSeries>

      {/* Attribution - stays visible until end (appears after quote) */}
      {frame >= timings.attributionStart && (
        (() => {
          const attributionSpring = spring({
            frame: frame - timings.attributionStart,
            fps,
            config: { damping: 14, stiffness: 110 }
          });
          const attributionSlide = interpolate(attributionSpring, [0, 1], [45, 0]);

          return (
            <>
              <Attribution
                opacity={Math.min(attributionSpring, 1)}
                slide={attributionSlide}
              />
              <ClosingQuote
                opacity={Math.min(attributionSpring, 1)}
                scale={interpolate(attributionSpring, [0, 1], [0, 1.1])}
                rotate={interpolate(frame - timings.attributionStart, [0, 25], [-10, 0], { extrapolateRight: 'clamp' })}
              />
            </>
          );
        })()
      )}

      {/* Context - stays visible until end (appears after attribution) */}
      {context && frame >= timings.contextStart && (
        (() => {
          const contextSpring = spring({
            frame: frame - timings.contextStart,
            fps,
            config: { damping: 10, stiffness: 120 }
          });

          return (
            <Context
              context={context}
              opacity={Math.min(contextSpring, 1)}
              scale={Math.min(contextSpring, 1)}
            />
          );
        })()
      )}

      {/* Footer (always visible) */}
      <Footer opacity={1} />
    </AbsoluteFill>
  );
};
