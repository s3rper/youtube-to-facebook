import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
  Audio,
} from 'remotion';

const ACCENT   = '#e0163b';
const GOLD     = '#FFD700';
const DARK_BG  = '#080c18';

// ─── Progress Bar (fills as video plays) ────────────────────────────────────
const ProgressBar = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pct = (frame / durationInFrames) * 100;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, zIndex: 100, background: 'rgba(255,255,255,0.12)' }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: `linear-gradient(90deg, ${ACCENT} 0%, ${GOLD} 100%)`,
        boxShadow: `0 0 14px ${GOLD}`,
      }} />
    </div>
  );
};

// ─── Blinking live dot ───────────────────────────────────────────────────────
const LiveDot = () => {
  const frame = useCurrentFrame();
  const blink = Math.sin(frame * 0.15) > 0 ? 1 : 0.3;
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
      background: ACCENT, opacity: blink, boxShadow: `0 0 8px ${ACCENT}`,
    }} />
  );
};

// ─── Brand top bar ───────────────────────────────────────────────────────────
const BrandBar = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 100 } });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      opacity: prog,
      transform: `translateY(${interpolate(prog, [0, 1], [-30, 0])}px)`,
    }}>
      <div style={{
        background: ACCENT, padding: '8px 20px', borderRadius: 7,
        boxShadow: `0 4px 20px rgba(224,22,59,0.55)`,
      }}>
        <span style={{ color: 'white', fontSize: 34, fontWeight: 900, fontFamily: '"Arial Black", Arial, sans-serif', letterSpacing: '3px' }}>
          GDM
        </span>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 24, fontFamily: 'Arial, sans-serif', letterSpacing: '6px' }}>
        NEWS
      </span>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LiveDot />
        <span style={{ color: ACCENT, fontSize: 22, fontWeight: 700, fontFamily: 'Arial, sans-serif', letterSpacing: '3px' }}>
          LIVE
        </span>
      </div>
    </div>
  );
};

// ─── Breaking badge ──────────────────────────────────────────────────────────
const BreakingBadge = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - startFrame, fps, config: { damping: 9, stiffness: 200, mass: 0.7 } });
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      background: ACCENT, padding: '12px 30px', borderRadius: 50,
      opacity: prog,
      transform: `scale(${interpolate(prog, [0, 1], [0.4, 1])})`,
      transformOrigin: 'left center',
      boxShadow: `0 6px 28px rgba(224,22,59,0.65)`,
      alignSelf: 'flex-start',
    }}>
      <span style={{ fontSize: 22 }}>🔴</span>
      <span style={{ color: 'white', fontSize: 28, fontWeight: 900, fontFamily: '"Arial Black", Arial, sans-serif', letterSpacing: '4px' }}>
        BREAKING NEWS
      </span>
    </div>
  );
};

// ─── Category badge ──────────────────────────────────────────────────────────
const CategoryBadge = ({ category, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 110 } });
  const cats = {
    politics: { label: '🏛️  POLITICS', bg: 'rgba(25,45,120,0.92)', border: '#4a6cf7' },
    breaking: { label: '🚨  BREAKING', bg: 'rgba(183,28,28,0.92)', border: '#ef5350' },
    global:   { label: '🌏  GLOBAL',   bg: 'rgba(0,77,64,0.92)',   border: '#26a69a' },
    economy:  { label: '📈  ECONOMY',  bg: 'rgba(230,81,0,0.92)',  border: '#ffa726' },
  };
  const cat = cats[category] || cats.politics;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: cat.bg, border: `2px solid ${cat.border}`,
      padding: '10px 26px', borderRadius: 50,
      opacity: prog,
      transform: `translateX(${interpolate(prog, [0, 1], [-70, 0])}px)`,
      alignSelf: 'flex-start',
    }}>
      <span style={{ color: 'white', fontSize: 26, fontWeight: 700, fontFamily: 'Arial, sans-serif', letterSpacing: '2px' }}>
        {cat.label}
      </span>
    </div>
  );
};

// ─── Expanding accent line ───────────────────────────────────────────────────
const AccentLine = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - startFrame, fps, config: { damping: 16, stiffness: 100 } });
  return (
    <div style={{
      height: 5, borderRadius: 3,
      background: `linear-gradient(90deg, ${ACCENT} 0%, ${GOLD} 100%)`,
      width: `${prog * 100}%`,
      boxShadow: `0 0 14px ${ACCENT}`,
    }} />
  );
};

// ─── Headline — staggered word-by-word spring reveal ─────────────────────────
const HeadlineReveal = ({ text, startFrame, delay = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
      {words.map((word, i) => {
        const wf = frame - (startFrame + i * delay);
        const prog = spring({ frame: wf, fps, config: { damping: 11, stiffness: 95, mass: 0.9 } });
        const isKey = i % 3 === 1; // every 3rd word gets gold
        return (
          <span key={i} style={{
            display: 'inline-block',
            color: isKey ? GOLD : 'white',
            fontSize: 74,
            fontWeight: 900,
            fontFamily: '"Arial Black", Arial, sans-serif',
            opacity: prog,
            transform: `translateY(${interpolate(prog, [0, 1], [50, 0])}px)`,
            textShadow: isKey
              ? `0 0 32px rgba(255,215,0,0.75), 0 4px 20px rgba(0,0,0,0.95)`
              : `0 4px 20px rgba(0,0,0,0.95)`,
            letterSpacing: '-0.5px',
            lineHeight: 1.15,
          }}>{word}</span>
        );
      })}
    </div>
  );
};

// ─── Body line (slide in from left) ─────────────────────────────────────────
const BodyLine = ({ text, startFrame, fontSize = 48 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - startFrame, fps, config: { damping: 18, stiffness: 80 } });
  const iconSize = Math.round(fontSize * 0.52);
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 18,
      opacity: prog,
      transform: `translateX(${interpolate(prog, [0, 1], [-50, 0])}px)`,
    }}>
      <span style={{ color: ACCENT, fontSize: iconSize, marginTop: Math.round(fontSize * 0.08), flexShrink: 0 }}>▶</span>
      <span style={{
        color: 'rgba(255,255,255,0.92)', fontSize, fontWeight: 500,
        fontFamily: 'Arial, sans-serif', lineHeight: 1.5,
        textShadow: '0 2px 12px rgba(0,0,0,0.85)',
        wordBreak: 'break-word',
      }}>{text}</span>
    </div>
  );
};

// ─── Source badge ────────────────────────────────────────────────────────────
const SourceBadge = ({ source, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 100 } });
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12, alignSelf: 'flex-start',
      background: 'rgba(0,0,0,0.75)', border: `2px solid rgba(255,215,0,0.6)`,
      padding: '12px 28px', borderRadius: 50,
      opacity: prog,
      transform: `translateY(${interpolate(prog, [0, 1], [28, 0])}px)`,
    }}>
      <span style={{ fontSize: 22 }}>📰</span>
      <span style={{ color: GOLD, fontSize: 26, fontWeight: 700, fontFamily: 'Arial, sans-serif', letterSpacing: '2px' }}>
        {(source || '').toUpperCase()}
      </span>
    </div>
  );
};

// ─── CTA text (pulsing) ──────────────────────────────────────────────────────
const CTAText = ({ text, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 90 } });
  const pulse = 1 + Math.sin(frame * 0.12) * 0.025;
  return (
    <div style={{
      opacity: prog,
      transform: `scale(${pulse}) translateY(${interpolate(prog, [0, 1], [22, 0])}px)`,
    }}>
      <span style={{
        color: ACCENT, fontSize: 38, fontWeight: 700,
        fontFamily: 'Arial, sans-serif',
        textShadow: `0 0 22px rgba(224,22,59,0.65)`,
        letterSpacing: '0.5px',
      }}>{text}</span>
    </div>
  );
};

// ─── Animated dark background ─────────────────────────────────────────────────
const AnimatedBackground = () => {
  const frame = useCurrentFrame();
  const s1 = Math.sin(frame * 0.008);
  const c1 = Math.cos(frame * 0.006);
  return (
    <AbsoluteFill>
      {/* Base */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(170deg, ${DARK_BG} 0%, #0d1420 45%, #080c10 100%)`,
      }} />
      {/* Soft red orb */}
      <div style={{
        position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        left: interpolate(s1, [-1, 1], [-250, 100]),
        top: interpolate(c1, [-1, 1], [-100, 350]),
        background: 'radial-gradient(circle, rgba(224,22,59,0.14) 0%, transparent 70%)',
        filter: 'blur(80px)',
      }} />
      {/* Soft gold orb */}
      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        right: interpolate(c1, [-1, 1], [-200, 50]),
        bottom: interpolate(s1, [-1, 1], [400, 900]),
        background: 'radial-gradient(circle, rgba(255,215,0,0.09) 0%, transparent 70%)',
        filter: 'blur(100px)',
      }} />
      {/* Grid */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.05 }} width="1080" height="1920">
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={i * 90} y1="0" x2={i * 90} y2="1920" stroke="white" strokeWidth="1" />
        ))}
        {Array.from({ length: 22 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 90} x2="1080" y2={i * 90} stroke="white" strokeWidth="1" />
        ))}
      </svg>
      {/* Particles */}
      {Array.from({ length: 30 }, (_, i) => {
        const px = (i * 139.3 + frame * (0.4 + (i % 5) * 0.08)) % 1080;
        const py = (i * 97.1 + frame * (0.25 + (i % 4) * 0.06)) % 1920;
        const op = 0.15 + 0.25 * Math.abs(Math.sin(frame * 0.04 + i * 0.7));
        const sz = 1.5 + (i % 4);
        return (
          <div key={i} style={{
            position: 'absolute', left: px, top: py,
            width: sz, height: sz, borderRadius: '50%',
            background: i % 3 === 0 ? ACCENT : i % 3 === 1 ? GOLD : 'white',
            opacity: op,
            boxShadow: i % 4 === 0 ? `0 0 6px ${ACCENT}` : 'none',
          }} />
        );
      })}
      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
      }} />
    </AbsoluteFill>
  );
};

// ─── Photo background (optional, Ken Burns) ──────────────────────────────────
const PhotoBackground = ({ backgroundImage }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (!backgroundImage) return null;
  const zoom = 1 + (frame / durationInFrames) * 0.07;
  return (
    <>
      <Img
        src={staticFile(`backgrounds/${backgroundImage}`)}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          opacity: 0.32,
        }}
      />
      {/* Cinematic gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(8,12,24,0.25) 0%, rgba(8,12,24,0.55) 40%, rgba(8,12,24,0.95) 100%)',
      }} />
    </>
  );
};

// ─── Bottom news ticker ───────────────────────────────────────────────────────
const BottomTicker = ({ text, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - startFrame, fps, config: { damping: 20, stiffness: 60 } });

  const fullText = `${text}   •   GDM NEWS   •   `;
  const charWidth = 18;
  const totalWidth = fullText.length * charWidth;
  const elapsed = Math.max(0, frame - startFrame);
  const scrollX = -(elapsed * 3 % totalWidth);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 82,
      background: ACCENT, overflow: 'hidden', opacity: prog,
    }}>
      {/* "BALITA" label */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 190,
        background: '#900020',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2, borderRight: '3px solid rgba(255,255,255,0.25)',
      }}>
        <span style={{ color: 'white', fontSize: 26, fontWeight: 900, fontFamily: '"Arial Black", Arial, sans-serif', letterSpacing: '2px' }}>
          BALITA
        </span>
      </div>
      {/* Scrolling text */}
      <div style={{ position: 'absolute', left: 190, top: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', height: '100%',
          transform: `translateX(${scrollX}px)`,
          whiteSpace: 'nowrap',
        }}>
          {[0, 1, 2].map(rep => (
            <span key={rep} style={{ color: 'white', fontSize: 26, fontWeight: 600, fontFamily: 'Arial, sans-serif', paddingRight: 40 }}>
              {fullText}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Preview overlay: shows end-state for first 3s so viewers see full content ─
const PREVIEW_FRAMES = 90; // 3 seconds at 30fps
const STATIC = -9999;      // Large negative → all springs fully resolved at frame 0

const PreviewOverlay = ({ headline, bodyLines, source, category, cta, bodyFontSize }) => {
  const frame = useCurrentFrame();
  if (frame >= PREVIEW_FRAMES) return null;

  // Cross-fade out over last 20 frames of preview window
  const opacity = frame < PREVIEW_FRAMES - 20
    ? 1
    : interpolate(frame, [PREVIEW_FRAMES - 20, PREVIEW_FRAMES], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{
        position: 'absolute', top: 60, left: 60, right: 60, bottom: 92,
        display: 'flex', flexDirection: 'column', gap: 26,
      }}>
        <BrandBar startFrame={STATIC} />
        <div style={{ height: 14 }} />
        <BreakingBadge startFrame={STATIC} />
        <CategoryBadge category={category} startFrame={STATIC} />
        <AccentLine startFrame={STATIC} />
        <HeadlineReveal text={headline} startFrame={STATIC} delay={5} />
        <div style={{ height: 12 }} />
        {bodyLines.map((line, i) => (
          <BodyLine key={i} text={line} startFrame={STATIC} fontSize={bodyFontSize} />
        ))}
        <div style={{ flex: 1, maxHeight: 100 }} />
        <SourceBadge source={source} startFrame={STATIC} />
        <CTAText text={cta} startFrame={STATIC} />
      </div>
      <BottomTicker text={headline} startFrame={STATIC} />
    </AbsoluteFill>
  );
};

// ─── MAIN COMPOSITION ────────────────────────────────────────────────────────
export const NewsHighlightComposition = ({
  headline    = 'Duterte Ipinagtanggol ang Giyera sa Droga sa Senate Hearing',
  bodyLines   = [
    'Inamin ng dating Pangulo na may kamalian sa proseso ng kampanya',
    'Sinabi niya na tama ang layunin — labanan ang krimen at droga',
    'Higit sa 6,000 ang namatay ayon sa opisyal na talaan ng PNP',
  ],
  source      = 'Philippine Daily Inquirer',
  category    = 'politics',
  cta         = '❤️  I-like at i-share mo ito!',
  backgroundImage = null,
}) => {
  const frame = useCurrentFrame();

  // ── Dynamic font size: fewer bullets → bigger text to fill space ──
  const bodyFontSize = bodyLines.length <= 1 ? 76
    : bodyLines.length === 2              ? 62
    : bodyLines.length === 3              ? 52
    :                                       44;

  // Stagger delay scales with font size (bigger text needs more read time)
  const bodyStagger = bodyLines.length <= 1 ? 80 : bodyLines.length === 2 ? 60 : 44;

  // ── Timing (shifted by PREVIEW_FRAMES so animation starts after the preview) ──
  const T_BRAND      = PREVIEW_FRAMES + 0;
  const T_BREAKING   = PREVIEW_FRAMES + 25;
  const T_CATEGORY   = PREVIEW_FRAMES + 55;
  const T_ACCENTLINE = PREVIEW_FRAMES + 85;
  const T_HEADLINE   = PREVIEW_FRAMES + 105;
  const wordCount    = headline.split(' ').length;
  const T_BODY       = T_HEADLINE + wordCount * 5 + 45;
  const T_SOURCE     = T_BODY + bodyLines.length * bodyStagger + 35;
  const T_CTA        = T_SOURCE + 55;
  const T_TICKER     = PREVIEW_FRAMES + 50;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      {/* Background music */}
      <Audio src={staticFile('music/background.mp3')} volume={0.28} startFrom={0} />

      {/* Backgrounds */}
      <AnimatedBackground />
      <PhotoBackground backgroundImage={backgroundImage} />

      {/* Progress bar */}
      <ProgressBar />

      {/* ── Preview overlay: static end-state shown for first 3s ── */}
      <PreviewOverlay
        headline={headline}
        bodyLines={bodyLines}
        source={source}
        category={category}
        cta={cta}
        bodyFontSize={bodyFontSize}
      />

      {/* Main content — padded container (animates in after preview) */}
      <div style={{
        position: 'absolute', top: 60, left: 60, right: 60, bottom: 92,
        display: 'flex', flexDirection: 'column', gap: 26,
      }}>
        <BrandBar    startFrame={T_BRAND} />
        <div style={{ height: 14 }} />
        <BreakingBadge startFrame={T_BREAKING} />
        <CategoryBadge category={category} startFrame={T_CATEGORY} />
        <AccentLine  startFrame={T_ACCENTLINE} />
        <HeadlineReveal text={headline} startFrame={T_HEADLINE} delay={5} />
        <div style={{ height: 12 }} />
        {bodyLines.map((line, i) => (
          <BodyLine key={i} text={line} startFrame={T_BODY + i * bodyStagger} fontSize={bodyFontSize} />
        ))}
        {/* Gap capped at 100px so blank space never dominates */}
        <div style={{ flex: 1, maxHeight: 100 }} />
        <SourceBadge source={source} startFrame={T_SOURCE} />
        <CTAText     text={cta}    startFrame={T_CTA} />
      </div>

      {/* Bottom ticker */}
      <BottomTicker text={headline} startFrame={T_TICKER} />
    </AbsoluteFill>
  );
};
