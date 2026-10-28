import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateRoom from '../components/Room/CreateRoom';
import JoinRoom from '../components/Room/JoinRoom';
import { api } from '../services/api';
import { Sparkles, Users, ArrowRight, Zap, RefreshCw, Copy, Check } from 'lucide-react';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [activeRooms, setActiveRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const rooms = await api.getRooms();
      setActiveRooms(rooms || []);
    } catch (e) {
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

  const sampleSnippet = `// Collaborative Sandbox Engine (CRDT + Docker)
import { YDoc, WebsocketProvider } from 'collab-code';

const doc = new YDoc();
const awareness = doc.getAwareness();

awareness.setLocalStateField('user', {
  name: 'Developer',
  color: '#8b5cf6',
  cursor: { line: 12, column: 4 }
});

export async function executeSandbox(source, lang) {
  return await runner.dispatch({ code: source, language: lang });
}`;

  const copySampleCode = async () => {
    try {
      await navigator.clipboard.writeText(sampleSnippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Navbar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 2rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#ffffff',
            fontSize: '0.85rem'
          }}>
            ⚡
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.3px', color: '#f4f4f5' }}>
            Code<span style={{ color: '#a78bfa' }}>Collab</span>
          </span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '4px',
            background: '#1f1f26',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontWeight: 600,
            letterSpacing: '0.04em'
          }}>
            v2.0
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="btn"
            onClick={handleInstantScratchpad}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', borderRadius: '6px' }}
          >
            <Zap size={14} color="#a78bfa" />
            <span>Instant Scratchpad</span>
          </button>
        </div>
      </nav>

      {/* Main Full-Width Content Viewport */}
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem 1.5rem 3rem 1.5rem',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        {/* Hero Banner */}
        <div style={{ textAlign: 'left', maxWidth: '820px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            padding: '0.25rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#c4b5fd',
            fontWeight: 600,
            marginBottom: '0.85rem'
          }}>
            <span className="status-dot pulsing" style={{ width: '6px', height: '6px', background: '#10b981' }} />
            <span>Real-Time Collaborative CRDT Environment</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.85rem)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: '0.6rem', color: '#f4f4f5' }}>
            Code Together. <span style={{ color: '#a78bfa' }}>Zero Conflicts.</span>
          </h1>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.55 }}>
            Sub-millisecond cursor awareness, sandboxed multi-language execution containers, and deterministic state convergence.
          </p>
        </div>

        {/* Dashboard 2-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.75rem',
          width: '100%',
          alignItems: 'start'
        }}>
          {/* Left Column: Room Setup Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
            {/* Tab Switcher */}
            <div style={{
              display: 'flex',
              background: '#131316',
              padding: '3px',
              borderRadius: '6px',
              marginBottom: '1.25rem',
              border: '1px solid var(--border)'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: activeTab === 'create' ? '1px solid #8b5cf6' : '1px solid transparent',
                  background: activeTab === 'create' ? 'rgba(139, 92, 246, 0.14)' : 'transparent',
                  color: activeTab === 'create' ? '#f4f4f5' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={14} color={activeTab === 'create' ? '#a78bfa' : 'currentColor'} />
                Create Room
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('join')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: activeTab === 'join' ? '1px solid #8b5cf6' : '1px solid transparent',
                  background: activeTab === 'join' ? 'rgba(139, 92, 246, 0.14)' : 'transparent',
                  color: activeTab === 'join' ? '#f4f4f5' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users size={14} color={activeTab === 'join' ? '#a78bfa' : 'currentColor'} />
                Join Room
              </button>
            </div>

            {activeTab === 'create' ? <CreateRoom /> : <JoinRoom />}
          </div>

          {/* Right Column: Code Editor Workbench Preview & Active Rooms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Workbench Code Editor Preview Styled after Reference */}
            <div className="glass-panel" style={{ overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.65rem 1rem',
                borderBottom: '1px solid var(--border)',
                background: '#141418',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', userSelect: 'none' }}>
                  CODE EDITOR
                </span>
                <button
                  type="button"
                  onClick={copySampleCode}
                  style={{
                    background: '#1d1d22',
                    border: '1px solid #2e2e38',
                    color: '#e4e4e7',
                    borderRadius: '5px',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    userSelect: 'none'
                  }}
                >
                  {copiedSnippet ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{ padding: '1rem', background: '#111113', overflowX: 'auto', userSelect: 'none', WebkitUserSelect: 'none' }}>
                <pre style={{
                  margin: 0,
                  fontFamily: "'Fira Code', 'Consolas', monospace",
                  fontSize: '0.8rem',
                  lineHeight: '1.6',
                  color: '#e4e4e7',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  cursor: 'default'
                }}>
                  <code style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                    <span style={{ color: '#71717a' }}>{'// Collaborative Sandbox Engine (CRDT + Docker)'}</span>{'\n'}
                    <span style={{ color: '#c084fc' }}>import</span> {'{ YDoc, WebsocketProvider }'} <span style={{ color: '#c084fc' }}>from</span> <span style={{ color: '#38bdf8' }}>'collab-code'</span>;{'\n\n'}
                    <span style={{ color: '#c084fc' }}>const</span> <span style={{ color: '#fbbf24' }}>doc</span> = <span style={{ color: '#c084fc' }}>new</span> <span style={{ color: '#34d399' }}>YDoc</span>();{'\n'}
                    <span style={{ color: '#c084fc' }}>const</span> <span style={{ color: '#fbbf24' }}>awareness</span> = doc.<span style={{ color: '#60a5fa' }}>getAwareness</span>();{'\n\n'}
                    awareness.<span style={{ color: '#60a5fa' }}>setLocalStateField</span>(<span style={{ color: '#38bdf8' }}>'user'</span>, {'{'}{'\n'}
                    {'  '}name: <span style={{ color: '#38bdf8' }}>'Developer'</span>,{'\n'}
                    {'  '}color: <span style={{ color: '#a78bfa' }}>'#8b5cf6'</span>,{'\n'}
                    {'  '}cursor: {'{ '}line: <span style={{ color: '#f59e0b' }}>12</span>, column: <span style={{ color: '#f59e0b' }}>4</span> {'}'}{'\n'}
                    {'}'});{'\n\n'}
                    <span style={{ color: '#c084fc' }}>export async function</span> <span style={{ color: '#60a5fa' }}>executeSandbox</span>(source, lang) {'{'}{'\n'}
                    {'  '}<span style={{ color: '#c084fc' }}>return await</span> runner.<span style={{ color: '#60a5fa' }}>dispatch</span>({'{ '}code: source, language: lang {'}'});{'\n'}
                    {'}'}
                  </code>
                </pre>
              </div>
            </div>

            {/* Active Public Rooms */}
            <div className="glass-panel" style={{ padding: '1.25rem', userSelect: 'none', WebkitUserSelect: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ACTIVE WORKSPACES ({activeRooms.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchRooms}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    userSelect: 'none'
                  }}
                >
                  <RefreshCw size={12} className={isLoadingRooms ? 'spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {activeRooms.length === 0 ? (
                <div style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: '#131316',
                  borderRadius: '6px',
                  border: '1px dashed var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  userSelect: 'none'
                }}>
                  No public sessions running. Create a new room to start collaborating!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => navigate(`/room/${room.id}`)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#141418',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease',
                        userSelect: 'none'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f4f4f5', marginBottom: '2px' }}>
                          {room.name || `Room #${room.id.slice(0, 8)}`}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: '#a78bfa', fontWeight: 600, textTransform: 'uppercase' }}>{room.language}</span>
                          <span>•</span>
                          <span style={{ color: '#10b981' }}>{room.usersCount || 1} online</span>
                        </div>
                      </div>
                      <ArrowRight size={14} color="#a78bfa" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
