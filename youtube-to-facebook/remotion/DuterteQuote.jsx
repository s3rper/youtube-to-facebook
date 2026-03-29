import { AbsoluteFill, interpolate, useCurrentFrame, Img, staticFile, spring, useVideoConfig } from 'remotion';
import { getQuoteTimings } from './calculateDuration';

export const DuterteQuote = ({ headline, content, context, sentiment, backgroundImage }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Safe zones for vertical video
  const SAFE_TOP = '12%';
  const SAFE_BOTTOM = '18%';

  // Get dynamic timing breakpoints
  const timings = getQuoteTimings(durationInFrames);

  // Documentary-style quote marks animation
  const quoteMarkProgress = interpolate(
    frame,
    [timings.quoteMarksStart, timings.quoteMarksStart + 25, timings.quoteMarksEnd - 10, timings.quoteMarksEnd],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  );
  const quoteMarkSpring = spring({
    frame: frame - timings.quoteMarksStart,
    fps,
    config: { damping: 12, stiffness: 120 }
  });
  const quoteMarkScale = interpolate(quoteMarkSpring, [0, 1], [0, 1.1]);
  const quoteMarkRotate = interpolate(
    frame,
    [timings.quoteMarksStart, timings.quoteMarksStart + 25],
    [-10, 0],
    { extrapolateRight: 'clamp' }
  );

  // Quote content animation with storytelling pace
  const quoteProgress = interpolate(
    frame,
    [timings.quoteStart, timings.quoteStart + 30],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  const quoteSpring = spring({
    frame: frame - timings.quoteStart,
    fps,
    config: { damping: 18, stiffness: 85 }
  });
  const quoteScale = interpolate(quoteSpring, [0, 1], [0.92, 1]);
  const quoteSlide = interpolate(quoteSpring, [0, 1], [35, 0]);

  // Attribution animation - dramatic reveal
  const attributionProgress = interpolate(
    frame,
    [timings.attributionStart, timings.attributionStart + 25],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  const attributionSpring = spring({
    frame: frame - timings.attributionStart,
    fps,
    config: { damping: 14, stiffness: 110 }
  });
  const attributionSlide = interpolate(attributionSpring, [0, 1], [45, 0]);

  // Context fade in
  const contextProgress = interpolate(
    frame,
    [timings.contextStart, timings.contextStart + 20],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  const contextSpring = spring({
    frame: frame - timings.contextStart,
    fps,
    config: { damping: 10, stiffness: 120 }
  });

  // Final fade out
  const finalFadeOut = interpolate(
    frame,
    [timings.outroStart, timings.outroEnd],
    [1, 0],
    { extrapolateRight: 'clamp' }
  );

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: Math.sin(i * 0.7 + frame * 0.015) * 250,
    y: Math.cos(i * 0.4 + frame * 0.012) * 350,
    scale: interpolate(Math.sin(frame * 0.04 + i), [-1, 1], [0.3, 1]),
    opacity: interpolate(Math.cos(frame * 0.025 + i * 0.6), [-1, 1], [0.05, 0.2])
  }));

  // Glow effect pulse
  const glowPulse = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.5, 1]
  );

  return (
    <AbsoluteFill style={{
      background: backgroundImage ? 'black' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '80px',
      fontFamily: 'Arial, sans-serif',
      overflow: 'hidden',
    }}>
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

      {/* Documentary-style opening quote mark */}
      {frame < timings.quoteMarksEnd && (
        <div style={{
          position: 'absolute',
          top: SAFE_TOP,
          fontSize: '140px',
          fontWeight: '900',
          color: 'rgba(255, 255, 255, 0.25)',
          opacity: quoteMarkProgress * quoteMarkSpring * finalFadeOut,
          transform: `scale(${quoteMarkScale}) rotate(${quoteMarkRotate}deg)`,
          textShadow: '0 0 40px rgba(255, 255, 255, 0.2)',
          fontFamily: 'Georgia, serif',
        }}>
        "
        </div>
      )}

      {/* Documentary quote content with reading pace */}
      {frame >= timings.quoteStart && (
        <div style={{
          opacity: quoteProgress * finalFadeOut,
          textAlign: 'center',
          maxWidth: '920px',
          marginBottom: '80px',
          transform: `scale(${quoteScale}) translateY(${quoteSlide}px)`,
          padding: '0 40px',
        }}>
          <div style={{
            fontSize: '68px',
            fontWeight: '800',
            color: 'white',
            textShadow: '0 6px 12px rgba(0,0,0,0.6)',
            marginBottom: '45px',
            lineHeight: '1.25',
            letterSpacing: '0.5px',
          }}>
            {headline}
          </div>
          <div style={{
            fontSize: '50px',
            fontWeight: '400',
            color: 'rgba(255, 255, 255, 0.95)',
            textShadow: '0 3px 8px rgba(0,0,0,0.5)',
            lineHeight: '1.6',
            fontStyle: 'italic',
            letterSpacing: '0.3px',
          }}>
            {content}
          </div>
        </div>
      )}

      {/* Documentary attribution with dramatic reveal */}
      {frame >= timings.attributionStart && (
        <div style={{
          opacity: attributionProgress * finalFadeOut,
          fontSize: '42px',
          fontWeight: '700',
          color: 'rgba(255, 255, 255, 0.9)',
          textShadow: '0 3px 6px rgba(0,0,0,0.5)',
          marginTop: '50px',
          textAlign: 'center',
          transform: `translateY(${attributionSlide}px)`,
          background: 'rgba(255, 255, 255, 0.12)',
          padding: '18px 50px',
          borderRadius: '35px',
          backdropFilter: 'blur(15px)',
          border: '2px solid rgba(255, 255, 255, 0.25)',
          letterSpacing: '1px',
        }}>
          — PRESIDENT RODRIGO DUTERTE
        </div>
      )}

      {/* Documentary context */}
      {context && frame >= timings.contextStart && (
        <div style={{
          opacity: contextProgress * finalFadeOut,
          position: 'absolute',
          bottom: SAFE_BOTTOM,
          marginBottom: '75px',
          fontSize: '34px',
          fontWeight: '600',
          color: 'rgba(255, 255, 255, 0.75)',
          textShadow: '0 2px 6px rgba(0,0,0,0.4)',
          transform: `scale(${contextSpring})`,
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '10px 30px',
          borderRadius: '20px',
          backdropFilter: 'blur(12px)',
          letterSpacing: '0.5px',
        }}>
          {context}
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: SAFE_BOTTOM,
        opacity: finalFadeOut,
        fontSize: '36px',
        fontWeight: 'bold',
        color: 'rgba(255, 255, 255, 0.9)',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        letterSpacing: '1px',
      }}>
        PHILIPPINES NEWS
      </div>

      {/* Closing quotation mark */}
      {frame >= timings.attributionStart && (
        <div style={{
          position: 'absolute',
          bottom: '220px',
          right: '80px',
          fontSize: '140px',
          fontWeight: '900',
          color: 'rgba(255, 255, 255, 0.25)',
          opacity: attributionProgress * finalFadeOut,
          transform: `scale(${quoteMarkScale}) rotate(-${quoteMarkRotate}deg)`,
          textShadow: '0 0 40px rgba(255, 255, 255, 0.2)',
          fontFamily: 'Georgia, serif',
        }}>
        "
        </div>
      )}
    </AbsoluteFill>
  );
};
