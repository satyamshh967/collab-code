import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateRoom from '../components/Room/CreateRoom';
import JoinRoom from '../components/Room/JoinRoom';
import { api } from '../services/api';
import { Sparkles, Terminal, Users, Cpu, Shield, ArrowRight, Zap, RefreshCw } from 'lucide-react';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [activeRooms, setActiveRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const rooms = await api.getRooms();
      setActiveRooms(rooms || []);
    } catch (e) {
      // Graceful fallback if no rooms or API offline
      setActiveRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleInstantScratchpad = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const randId = `${Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}-${Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`;
    navigate(`/room/${randId}`);
  };

  return (
    <div className="fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1.5rem 5rem 1.5rem', boxSizing: 'border-box' }}>
      {/* Hero Header */}
      <header style={{ textAlign: 'center', maxWidth: '780px', marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          padding: '0.35rem 0.9rem',
          borderRadius: '999px',
          fontSize: '0.8rem',
          color: 'var(--accent)',
          fontWeight: 600,
          marginBottom: '1.25rem',
          boxShadow: '0 0 15px rgba(56, 189, 248, 0.15)'
        }}>
          <span className="status-dot pulsing" />
          <span>Next-Gen Collaborative CRDT Development Platform</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.15, marginBottom: '1rem' }}>
          Code in Real-Time <br />
          <span className="gradient-text">Without Conflicts.</span>
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto 1.8rem auto', lineHeight: 1.6 }}>
          Live multi-user cursor awareness powered by Yjs, isolated sandboxed execution across Python, JavaScript & Java, and scalable Redis clustering.
        </p>

        {/* Quick Instant Demo CTA */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary"
            onClick={handleInstantScratchpad}
            style={{ padding: '0.65rem 1.3rem', fontSize: '0.95rem' }}
          >
            <Zap size={16} />
            Quick Scratchpad Room
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* Main Interactive Card */}
      <div className="glass-panel scale-up" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', position: 'relative' }}>
        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'create' ? 'var(--accent-gradient)' : 'transparent',
              color: activeTab === 'create' ? '#0f172a' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={15} />
            Create Room
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'join' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'transparent',
              color: activeTab === 'join' ? '#052e16' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={15} />
            Join Room
          </button>
        </div>

        {activeTab === 'create' ? <CreateRoom /> : <JoinRoom />}
      </div>

      {/* Feature Highlights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', maxWidth: '960px', width: '100%', marginTop: '3.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '10px', color: 'var(--accent)' }}>
            <Cpu size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Yjs CRDT Engine</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Zero-conflict concurrent typing with mathematical convergence guarantees.</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '10px', borderRadius: '10px', color: 'var(--neon-green)' }}>
            <Terminal size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Sandboxed Runners</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Strict CPU quotas, memory caps, network isolation, and 5-second termination.</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '10px', borderRadius: '10px', color: 'var(--neon-purple)' }}>
            <Shield size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Shared Awareness</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Live cursor flags, colored collaborator labels, and dynamic selection tracking.</p>
          </div>
        </div>
      </div>

      {/* Active Public Rooms Section */}
      {activeRooms.length > 0 && (
        <div style={{ maxWidth: '960px', width: '100%', marginTop: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-dot" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Live Active Rooms</h2>
              <span style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px' }}>
                {activeRooms.length}
              </span>
            </div>
            <button 
              onClick={fetchRooms}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
            >
              <RefreshCw size={13} className={isLoadingRooms ? 'spin' : ''} />
              Refresh
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {activeRooms.map((room) => (
              <div 
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className="glass-panel"
                style={{ padding: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{room.name || `Room #${room.id.slice(0, 8)}`}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span style={{ textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600 }}>{room.language}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--neon-green)' }}>{room.usersCount || 1} online</span>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--accent)" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
