import React from 'react';
import CreateRoom from '../components/Room/CreateRoom';
import JoinRoom from '../components/Room/JoinRoom';

const HomePage = () => {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>CodeCollab</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Real-Time Collaborative Coding Platform</p>
      </header>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem' }}>
        <CreateRoom />
        <JoinRoom />
      </div>
    </div>
  );
};

export default HomePage;
