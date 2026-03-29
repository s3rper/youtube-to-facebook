/**
 * Calculate video duration based on content length
 * Follows Remotion best practices for dynamic composition duration
 */

/**
 * Calculate reading time for text
 * @param {string} text - Text to read
 * @param {number} wpm - Words per minute (default: 180 for comfortable reading with visuals)
 * @returns {number} - Time in seconds
 */
function calculateReadingTime(text, wpm = 180) {
  const words = text.trim().split(/\s+/).length;
  const readingTimeSeconds = (words / wpm) * 60;
  return readingTimeSeconds;
}

/**
 * Calculate optimal video duration for fact composition
 * @param {Object} props - Composition props
 * @returns {number} - Duration in frames (at 30fps)
 */
export function calculateFactDuration(props) {
  const { headline, content, source } = props;
  const fps = 30;

  // Intro animation (badge + fade in): 2 seconds
  const introTime = 2;

  // Headline reading time with buffer
  const headlineTime = Math.max(3, calculateReadingTime(headline) + 1);

  // Content reading time with comfortable buffer
  const contentTime = Math.max(4, calculateReadingTime(content) + 2);

  // Source display time: 2 seconds
  const sourceTime = source ? 2 : 0;

  // Outro fade: 1.5 seconds
  const outroTime = 1.5;

  // Total duration in seconds
  const totalSeconds = introTime + headlineTime + contentTime + sourceTime + outroTime;

  // Add 20% buffer for comfortable pacing
  const bufferedSeconds = totalSeconds * 1.2;

  // Convert to frames and ensure minimum 15 seconds, maximum 30 seconds
  const frames = Math.round(bufferedSeconds * fps);
  const minFrames = 15 * fps; // 15 seconds minimum
  const maxFrames = 30 * fps; // 30 seconds maximum

  return Math.max(minFrames, Math.min(maxFrames, frames));
}

/**
 * Calculate optimal video duration for quote composition
 * @param {Object} props - Composition props
 * @returns {number} - Duration in frames (at 30fps)
 */
export function calculateQuoteDuration(props) {
  const { headline, content, context } = props;
  const fps = 30;

  // Intro animation (quote marks): 1.5 seconds
  const introTime = 1.5;

  // Headline reading time
  const headlineTime = Math.max(2.5, calculateReadingTime(headline) + 0.5);

  // Content reading time (quotes need more dramatic pause)
  const contentTime = Math.max(3.5, calculateReadingTime(content) + 1.5);

  // Attribution time: 2 seconds
  const attributionTime = 2;

  // Context display time: 1.5 seconds
  const contextTime = context ? 1.5 : 0;

  // Outro fade: 1.5 seconds
  const outroTime = 1.5;

  // Total duration
  const totalSeconds = introTime + headlineTime + contentTime + attributionTime + contextTime + outroTime;

  // Add 15% buffer for quotes (more dramatic pacing)
  const bufferedSeconds = totalSeconds * 1.15;

  // Convert to frames, 12-25 seconds for quotes
  const frames = Math.round(bufferedSeconds * fps);
  const minFrames = 12 * fps;
  const maxFrames = 25 * fps;

  return Math.max(minFrames, Math.min(maxFrames, frames));
}

/**
 * Calculate timing breakpoints for fact animation
 * @param {number} durationInFrames - Total video duration
 * @returns {Object} - Animation timing breakpoints
 */
export function getFactTimings(durationInFrames) {
  const duration = durationInFrames;

  return {
    // Intro phase (0-10% of video)
    badgeStart: 0,
    badgeEnd: Math.round(duration * 0.08),

    // Headline phase (8-30% of video)
    headlineStart: Math.round(duration * 0.08),
    headlineHold: Math.round(duration * 0.30),

    // Content phase (30-75% of video)
    contentStart: Math.round(duration * 0.30),
    contentHold: Math.round(duration * 0.75),

    // Source phase (75-90% of video)
    sourceStart: Math.round(duration * 0.75),
    sourceHold: Math.round(duration * 0.90),

    // Outro phase (90-100% of video)
    outroStart: Math.round(duration * 0.90),
    outroEnd: duration,
  };
}

/**
 * Calculate timing breakpoints for quote animation
 * @param {number} durationInFrames - Total video duration
 * @returns {Object} - Animation timing breakpoints
 */
export function getQuoteTimings(durationInFrames) {
  const duration = durationInFrames;

  return {
    // Quote marks intro (0-8% of video)
    quoteMarksStart: 0,
    quoteMarksEnd: Math.round(duration * 0.08),

    // Quote content (8-70% of video)
    quoteStart: Math.round(duration * 0.08),
    quoteHold: Math.round(duration * 0.70),

    // Attribution (70-85% of video)
    attributionStart: Math.round(duration * 0.70),
    attributionHold: Math.round(duration * 0.85),

    // Context (85-92% of video)
    contextStart: Math.round(duration * 0.85),
    contextHold: Math.round(duration * 0.92),

    // Outro (92-100% of video)
    outroStart: Math.round(duration * 0.92),
    outroEnd: duration,
  };
}
