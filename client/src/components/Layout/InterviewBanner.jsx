import React, { useEffect, useMemo, useState } from 'react';
import { Timer, Plus, Square } from 'lucide-react';
import { useRoom } from '../../hooks/useRoom';

const formatDuration = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const InterviewBanner = () => {
  const { interview, currentUser, endInterview, extendInterview } = useRoom();
  const [now, setNow] = useState(Date.now());

  // Server time minus local time when this snapshot arrived, so every
  // participant's countdown agrees even if their clocks differ.
  const skew = useMemo(() => (interview?.serverNow ? interview.serverNow - Date.now() : 0), [interview]);

  const ended = Boolean(interview?.endedAt);
  useEffect(() => {
    if (!interview || ended) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [interview, ended]);

  if (!interview) return null;

  const serverNow = ended ? interview.endedAt : now + skew;
  const elapsed = interview.startedAt ? serverNow - interview.startedAt : 0;
  const remaining = interview.durationMs - elapsed;
  const overtime = remaining < 0;
  const urgent = !ended && remaining < 5 * 60 * 1000;
  const isHost = Boolean(currentUser?.isOwner);

  const tone = ended
    ? { bg: 'rgba(113, 113, 122, 0.12)', border: 'rgba(113, 113, 122, 0.3)', fg: '#a1a1aa' }
    : urgent
      ? { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', fg: '#fca5a5' }
      : { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', fg: '#fcd34d' };

  return (
    <div
      role="timer"
      aria-live="off"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '0.4rem 1rem', background: tone.bg, borderBottom: `1px solid ${tone.border}`,
        color: tone.fg, fontSize: '0.82rem', fontWeight: 600, flexShrink: 0
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Timer size={15} />
        {ended ? 'Interview ended' : 'Interview in progress'}
      </span>

      <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontSize: '0.95rem' }}>
        {ended
          ? `Total time ${formatDuration(elapsed)}`
          : overtime
            ? `Over time by ${formatDuration(-remaining)}`
            : `${formatDuration(remaining)} left`}
      </span>

      {isHost && !ended ? (
        <span style={{ display: 'inline-flex', gap: 6 }}>
          <button className="icon-btn bordered" style={{ height: 26, color: tone.fg }} onClick={extendInterview} title="Add 10 minutes for everyone">
            <Plus size={13} /> 10 min
          </button>
          <button
            className="icon-btn bordered"
            style={{ height: 26, color: '#fca5a5' }}
            onClick={() => window.confirm('End the interview for everyone?') && endInterview()}
          >
            <Square size={11} /> End
          </button>
        </span>
      ) : (
        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{isHost ? '' : 'Timer controlled by the host'}</span>
      )}
    </div>
  );
};

export default InterviewBanner;
