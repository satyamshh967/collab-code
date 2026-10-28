import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRoom } from '../../hooks/useRoom';
import LanguageSelector from '../Editor/LanguageSelector';
import { Share2, Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { fireEmojiBurst } from '../../utils/confetti';

const QUICK_REACTIONS = ['🔥', '🚀', '🎉', '❤️', '👏', '🧠'];

const Header = () => {
  const navigate = useNavigate();
  const { roomId, users, leaveRoom, sendMessage } = useRoom();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      leaveRoom();
      navigate('/');
    }
  };

  const displayRoomId = roomId
    ? roomId.length > 10
      ? `${roomId.slice(0, 8)}...`
      : roomId
    : '...';

  const copyInviteLink = async () => {
    if (!roomId) return;
    const inviteUrl = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      toast.success('Invite link copied! Share it with your peers 🚀');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      toast.error('Failed to copy invite link');
    }
  };

  const copyRoomIdOnly = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedId(true);
      toast.success(`Room ID #${roomId.slice(0, 8)} copied!`);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      toast.error('Failed to copy Room ID');
    }
  };

  const handleSendReaction = (emoji) => {
    fireEmojiBurst(emoji);
    sendMessage(`reacted ${emoji}`);
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.55rem 1.25rem',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      height: '56px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 50
    }}>
      {/* Left Section: Logo, Room Badge, Online Facepile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#0f172a',
            fontSize: '0.9rem',
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
          }}>
            ⚡
          </div>
          <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.5px' }}>
            Code<span className="gradient-text">Collab</span>
          </span>
        </Link>
        
        {/* Shortened Room ID Pill */}
        {roomId && (
          <div 
            onClick={copyRoomIdOnly}
            title={`Full Room ID: ${roomId} (Click to copy ID)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--border)',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>#</span>
            <span style={{ fontWeight: 600 }}>{displayRoomId}</span>
            {copiedId ? <Check size={12} color="var(--success)" /> : <Copy size={12} color="var(--text-secondary)" />}
          </div>
        )}

        {/* Collaborators Avatar Stack (Facepile) */}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {users.slice(0, 4).map((u, idx) => {
              const initial = (u.username || 'G').charAt(0).toUpperCase();
              const userColor = u.color || '#38bdf8';
              return (
                <div
                  key={idx}
                  title={`${u.username} (Online)`}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: userColor,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginLeft: idx === 0 ? '0' : '-8px',
                    border: '2px solid #0f172a',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    cursor: 'default',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)'; e.currentTarget.style.zIndex = '10'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.zIndex = '1'; }}
                >
                  {initial}
                </div>
              );
            })}
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            marginLeft: '6px',
            padding: '0.2rem 0.5rem',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: 'var(--neon-green)',
            fontWeight: 600
          }}>
            <span className="status-dot pulsing" style={{ width: '6px', height: '6px' }} />
            <span>{users.length} Online</span>
          </div>
        </div>
      </div>
      
      {/* Right Section: Quick Reactions, Language, Share, Leave */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Fun Quick Reaction Bar */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2px 6px', gap: '2px' }}>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendReaction(emoji)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '3px 4px',
                borderRadius: '50%',
                lineHeight: 1,
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              title={`Send reaction: ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <LanguageSelector />

        {/* Share Invite Link Button */}
        <button 
          className="btn"
          onClick={copyInviteLink}
          style={{
            background: copiedLink ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.1)',
            color: copiedLink ? 'var(--neon-green)' : 'var(--accent)',
            border: copiedLink ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)',
            padding: '0.35rem 0.75rem',
            fontSize: '0.82rem',
            borderRadius: '8px'
          }}
          title="Copy shareable invite link to clipboard"
        >
          {copiedLink ? <Check size={14} color="var(--neon-green)" /> : <Share2 size={14} />}
          <span>{copiedLink ? 'Copied! ✓' : 'Share'}</span>
        </button>

        {/* Leave Room Button */}
        <button 
          className="btn btn-danger" 
          onClick={handleLeave} 
          style={{ 
            padding: '0.35rem 0.75rem', 
            fontSize: '0.82rem',
            borderRadius: '8px'
          }}
        >
          Leave
        </button>
      </div>
    </header>
  );
};

export default Header;
