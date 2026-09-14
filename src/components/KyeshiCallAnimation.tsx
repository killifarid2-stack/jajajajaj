import React, { useMemo } from 'react';
import { formatTime } from '@/lib/match-engine';

import kyeshiCallImageUrl from '@/assets/kyeshi/kyeshi-call.png';
/**
 * WAB-TKD KYESHI / injury-time cinematic.
 * Uses the operator-supplied KYESHI artwork as the visual centerpiece while
 * preserving the live injury-time countdown from MatchContext.
 */
export default function KyeshiCallAnimation({
  timeRemaining,
  isMiniPreview = false,
}: {
  timeRemaining: number;
  isMiniPreview?: boolean;
}) {
  const particles = useMemo(() => Array.from({ length: 34 }, (_, i) => ({
    id: i,
    left: `${3 + ((i * 43) % 94)}%`,
    top: `${4 + ((i * 67) % 90)}%`,
    delay: `${(i % 11) * 0.16}s`,
    duration: `${2.4 + (i % 6) * 0.48}s`,
    size: `${2 + (i % 4)}px`,
  })), []);

  return (
    <div
      data-wab-layer-id="kyeshi-root" data-wab-layer-root="kyeshi" className={`kyeshi-call-overlay ${isMiniPreview ? 'kyeshi-call-overlay--mini' : ''}`}
      aria-label="KYESHI INJURY TIME"
    >
      <div data-wab-layer-id="kyeshi-bg" className="kyeshi-call-bg" />
      <div data-wab-layer-id="kyeshi-grid" className="kyeshi-call-grid" />
      <div data-wab-layer-id="kyeshi-gold-aura" className="kyeshi-call-gold-aura" />
      <div data-wab-layer-id="kyeshi-white-aura" className="kyeshi-call-white-aura" />
      <div data-wab-layer-id="kyeshi-blue-aura" className="kyeshi-call-blue-aura" />

      <div className="kyeshi-call-scan kyeshi-call-scan--one" />
      <div className="kyeshi-call-scan kyeshi-call-scan--two" />

      {particles.map((p) => (
        <span
          key={p.id}
          className="kyeshi-call-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      <div className="kyeshi-call-corner kyeshi-call-corner--tl" />
      <div className="kyeshi-call-corner kyeshi-call-corner--tr" />
      <div className="kyeshi-call-corner kyeshi-call-corner--bl" />
      <div className="kyeshi-call-corner kyeshi-call-corner--br" />

      <div data-wab-layer-id="kyeshi-content" className="kyeshi-call-content">
        <div data-wab-layer-id="kyeshi-kicker" className="kyeshi-call-kicker">
          <span className="kyeshi-call-kicker-line" />
          <span>INJURY TIME</span>
          <span className="kyeshi-call-kicker-line" />
        </div>

        <div data-wab-layer-id="kyeshi-art" className="kyeshi-call-art-wrap">
          <div className="kyeshi-call-ring kyeshi-call-ring--outer" />
          <div className="kyeshi-call-ring kyeshi-call-ring--inner" />
          <div className="kyeshi-call-beam kyeshi-call-beam--left" />
          <div className="kyeshi-call-beam kyeshi-call-beam--right" />
          <div className="kyeshi-call-energy kyeshi-call-energy--left" />
          <div className="kyeshi-call-energy kyeshi-call-energy--right" />
          <img
            src={kyeshiCallImageUrl}
            alt="WAB-TKD Kyeshi"
            data-wab-layer-id="kyeshi-art-image" className="kyeshi-call-art"
            draggable={false}
          />
        </div>

        <div data-wab-layer-id="kyeshi-title" className="kyeshi-call-title-wrap">
          <div data-wab-layer-id="kyeshi-title-text" className="kyeshi-call-title">KYESHI</div>
          <div data-wab-layer-id="kyeshi-subtitle" className="kyeshi-call-subtitle">INJURY TIME • OFFICIAL HOLD</div>
        </div>

        <div data-wab-layer-id="kyeshi-timer" className="kyeshi-call-timer-wrap">
          <div className="kyeshi-call-timer-label">TIME REMAINING</div>
          <div data-wab-layer-id="kyeshi-timer-value" className="kyeshi-call-timer">{formatTime(timeRemaining)}</div>
        </div>
      </div>

      <div data-wab-layer-id="kyeshi-footer" className="kyeshi-call-bottom-line">
        <span>WAB-TKD</span>
        <span className="kyeshi-call-dot" />
        <span>REFEREE HOLD</span>
        <span className="kyeshi-call-dot" />
        <span>RETURN WHEN CLEARED</span>
      </div>
    </div>
  );
}
