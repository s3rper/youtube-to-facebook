import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img, staticFile, spring } from 'remotion';
import { getFactTimings } from './calculateDuration';

export const DuterteFact = ({ headline, content, source, sentiment, backgroundImage }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Safe zones for vertical video (avoid top 10% and bottom 15%)
  const SAFE_TOP = '12%';
  const SAFE_BOTTOM = '18%';

  // Get dynamic timing breakpoints based on video duration
  const timings = getFactTimings(durationInFrames);

  // Documentary-style badge animation (slower, more impactful)
  const badgeProgress = interpolate(
    frame,
    [timings.badgeStart, timings.badgeStart + 30, timings.badgeEnd - 15, timings.badgeEnd],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  );
  const badgeScale = spring({
    frame: frame - timings.badgeStart,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 150 }
  });
  const badgeRotate = interpolate(
    frame,
    [timings.badgeStart, timings.badgeStart + 20],
    [0, 360],
    { extrapolateRight: 'clamp' }
  );

  // Headline animation - documentary style with hold time
  const headlineProgress = interpolate(
    frame,
    [timings.headlineStart, timings.headlineStart + 20],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  const headlineSpring = spring({
    frame: frame - timings.headlineStart,
    fps,
    config: { damping: 15, stiffness: 100 }
  });
  const headlineSlide = interpolate(headlineSpring, [0, 1], [-80, 0]);
  const headlineScale = interpolate(headlineSpring, [0, 1], [0.85, 1]);

  // Content animation - staggered for storytelling
  const contentProgress = interpolate(
    frame,
    [timings.contentStart, timings.contentStart + 25],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  const contentSpring = spring({
    frame: frame - timings.contentStart,
    fps,
    config: { damping: 18, stiffness: 90 }
  });
  const contentSlide = interpolate(contentSpring, [0, 1], [40, 0]);

  // Source animation - appears near end
  const sourceProgress = interpolate(
    frame,
    [timings.sourceStart, timings.sourceStart + 20],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  const sourceSpring = spring({
    frame: frame - timings.sourceStart,
    fps,
    config: { damping: 12, stiffness: 120 }
  });

  // Final fade out
  const finalFadeOut = interpolate(
    frame,
    [timings.outroStart, timings.outroEnd],
    [1, 0],
    { extrapolateRight: 'clamp' }
  );

  // Particle background effect
  const particles = Array.from({ length: 15 }, (_, i) => ({
    x: Math.sin(i * 0.5 + frame * 0.02) * 300,
    y: Math.cos(i * 0.3 + frame * 0.015) * 400,
    scale: interpolate(Math.sin(frame * 0.05 + i), [-1, 1], [0.5, 1.5]),
    opacity: interpolate(Math.sin(frame * 0.03 + i * 0.5), [-1, 1], [0.1, 0.3])
  }));

  // Philippine flag colors gradient (Blue to Red)
  const gradientColors = {
    positive: ['#0038A8', '#CE1126'], // Blue to Red
    neutral: ['#0038A8', '#0038A8'],  // Blue to Blue
    controversial: ['#CE1126', '#0038A8'], // Red to Blue
  };

  const colors = gradientColors[sentiment] || gradientColors.neutral;

  // Text wrapping helper
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

  const headlineLines = wrapText(headline, 25); // 25 chars per line
  const contentLines = wrapText(content, 30);   // 30 chars per line

  return (
    <AbsoluteFill style={{
      background: backgroundImage ? 'black' : `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
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

      {/* Documentary-style badge */}
      {frame < timings.badgeEnd && (
        <div style={{
          position: 'absolute',
          top: SAFE_TOP,
          opacity: badgeProgress * badgeScale * finalFadeOut,
          textAlign: 'center',
          transform: `rotate(${badgeRotate}deg) scale(${badgeScale})`,
        }}>
          <div style={{
            fontSize: '90px',
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
            marginBottom: '20px',
            filter: `drop-shadow(0 0 20px rgba(255,255,255,${badgeProgress * 0.3}))`,
          }}>
            📌
          </div>
          <div style={{
            fontSize: '64px',
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
            transform: `rotate(-${badgeRotate}deg)`,
            letterSpacing: '2px',
          }}>
            DID YOU KNOW?
          </div>
        </div>
      )}

      {/* Documentary headline with hold time */}
      {frame >= timings.headlineStart && frame < timings.contentStart + 30 && (
        <div style={{
          opacity: headlineProgress * finalFadeOut,
          textAlign: 'center',
          marginBottom: '60px',
          transform: `translateX(${headlineSlide}px) scale(${headlineScale})`,
        }}>
          {headlineLines.map((line, index) => (
            <div key={index} style={{
              fontSize: '75px',
              fontWeight: '900',
              color: 'white',
              textShadow: '0 6px 12px rgba(0,0,0,0.6)',
              marginBottom: '15px',
              lineHeight: '1.15',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Documentary content with reading pace */}
      {frame >= timings.contentStart && (
        <div style={{
          opacity: contentProgress * finalFadeOut,
          textAlign: 'center',
          maxWidth: '900px',
          transform: `translateY(${contentSlide}px)`,
          padding: '0 40px',
        }}>
          {contentLines.map((line, index) => {
            const lineDelay = index * 0.08;
            const lineProgress = interpolate(
              contentSpring,
              [lineDelay, lineDelay + 0.25],
              [0, 1],
              { extrapolateRight: 'clamp' }
            );
            return (
              <div key={index} style={{
                fontSize: '52px',
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '0 3px 8px rgba(0,0,0,0.5)',
                marginBottom: '12px',
                lineHeight: '1.5',
                opacity: lineProgress,
                transform: `translateX(${interpolate(lineProgress, [0, 1], [25, 0])}px)`,
              }}>
                {line}
              </div>
            );
          })}
        </div>
      )}

      {/* Documentary source citation */}
      {source && frame >= timings.sourceStart && (
        <div style={{
          position: 'absolute',
          bottom: SAFE_BOTTOM,
          marginBottom: '70px',
          opacity: sourceProgress * finalFadeOut,
          fontSize: '34px',
          fontWeight: '600',
          color: 'rgba(255, 255, 255, 0.9)',
          textShadow: '0 2px 6px rgba(0,0,0,0.4)',
          transform: `scale(${sourceSpring})`,
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '12px 35px',
          borderRadius: '25px',
          backdropFilter: 'blur(15px)',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          letterSpacing: '0.5px',
        }}>
          SOURCE: {source.toUpperCase()}
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
      }}>
        Philippines News
      </div>
    </AbsoluteFill>
  );
};
