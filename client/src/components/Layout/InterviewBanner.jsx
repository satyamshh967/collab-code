import React, { useState, useEffect } from 'react';

const InterviewBanner = () => {
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hr default

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1.5rem', background: 'var(--warning)', color: '#000', fontWeight: 'bold' }}>
      <span>Interview Mode</span>
      <span>Time Remaining: {formatTime(timeLeft)}</span>
      <button style={{ background: 'transparent', border: '1px solid #000', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
        End Interview
      </button>
    </div>
  );
};

export default InterviewBanner;
