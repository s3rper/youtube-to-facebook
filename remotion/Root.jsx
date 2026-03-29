import { Composition } from 'remotion';
import { DuterteFact } from './DuterteFact';
import { DuterteQuote } from './DuterteQuote';
import { DuterteFactEnhanced } from './DuterteFactEnhanced';
import { DuterteQuoteEnhanced } from './DuterteQuoteEnhanced';
import { DuterteViralHook } from './DuterteViralHook';
import { DuterteDocumentary, calculateStoryDuration } from './DuterteDocumentary';
import { calculateFactDuration, calculateQuoteDuration } from './calculateDuration';

export const RemotionRoot = () => {
  return (
    <>
      {/* VIRAL HOOK - Short-form fact statements (DEFAULT) */}
      <Composition
        id="DuterteFact"
        component={DuterteViralHook}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          headline: 'Build Build Build Program',
          content: 'Ang Build Build Build program ni Duterte ay nagtayo ng 29,000 kilometers ng kalsada at 5,950 flood control projects sa buong Pilipinas',
          source: 'DPWH',
          sentiment: 'positive',
          backgroundImage: null,
        }}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calculateFactDuration(props),
            props,
          };
        }}
      />

      {/* DOCUMENTARY - Long-form storytelling composition (optional) */}
      <Composition
        id="DuterteDocumentary"
        component={DuterteDocumentary}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          headline: 'Build Build Build Program',
          content: 'Ang Build Build Build program ni Duterte ay nagtayo ng 29,000 kilometers ng kalsada',
          source: 'DPWH',
          sentiment: 'positive',
          backgroundImage: null,
        }}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calculateFactDuration(props),
            props,
          };
        }}
      />
      <Composition
        id="DuterteQuote"
        component={DuterteQuoteEnhanced}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          headline: 'Change is Coming',
          content: 'Change is coming. Ang pagbabago ay darating sa ating bansa',
          context: '2016 Presidential Campaign',
          sentiment: 'inspirational',
          backgroundImage: null,
        }}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calculateQuoteDuration(props),
            props,
          };
        }}
      />

      {/* Original compositions (legacy - for comparison) */}
      <Composition
        id="DuterteFactOriginal"
        component={DuterteFact}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          headline: 'Build Build Build Program',
          content: 'Ang Build Build Build program ni Duterte ay nagtayo ng 29,000 kilometers ng kalsada',
          source: 'DPWH',
          sentiment: 'positive',
          backgroundImage: null,
        }}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calculateFactDuration(props),
            props,
          };
        }}
      />
      <Composition
        id="DuterteQuoteOriginal"
        component={DuterteQuote}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          headline: 'Change is Coming',
          content: 'Change is coming. Ang pagbabago ay darating sa ating bansa',
          context: '2016 Presidential Campaign',
          sentiment: 'inspirational',
          backgroundImage: null,
        }}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calculateQuoteDuration(props),
            props,
          };
        }}
      />
    </>
  );
};
