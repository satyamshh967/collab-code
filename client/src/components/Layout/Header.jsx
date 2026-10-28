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
      padding: '0.45rem 1.25rem',
      background: '#141418',
      borderBottom: '1px solid var(--border)',
      height: '52px',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 50
    }}>
      {/* Left Section: Logo, Room Badge, Online Facepile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
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
          <span style={{ color: '#f4f4f5', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.3px' }}>
            Code<span style={{ color: '#a78bfa' }}>Collab</span>
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
              background: '#1d1d22',
              border: '1px solid var(--border)',
              padding: '0.2rem 0.55rem',
              borderRadius: '5px',
              fontSize: '0.78rem',
              fontFamily: 'monospace',
              color: '#f4f4f5',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>#</span>
            <span style={{ fontWeight: 600 }}>{displayRoomId}</span>
            {copiedId ? <Check size={12} color="#10b981" /> : <Copy size={12} color="var(--text-muted)" />}
          </div>
        )}

        {/* Collaborators Avatar Stack (Facepile) */}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {users.slice(0, 4).map((u, idx) => {
              const initial = (u.username || 'G').charAt(0).toUpperCase();
              const userColor = u.color || '#8b5cf6';
              return (
                <div
                  key={idx}
                  title={`${u.username} (Online)`}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: userColor,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    marginLeft: idx === 0 ? '0' : '-6px',
                    border: '2px solid #141418',
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
            padding: '0.15rem 0.45rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            fontSize: '0.72rem',
            color: '#10b981',
            fontWeight: 600
          }}>
            <span className="status-dot pulsing" style={{ width: '5px', height: '5px' }} />
            <span>{users.length} Online</span>
          </div>
        </div>
      </div>
      
      {/* Right Section: Quick Reactions, Language, Share, Leave */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Fun Quick Reaction Bar */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#1d1d22', border: '1px solid var(--border)', borderRadius: '16px', padding: '2px 5px', gap: '2px' }}>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendReaction(emoji)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '2px 3px',
                borderRadius: '50%',
                lineHeight: 1,
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.3)'; }}
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
            background: copiedLink ? 'rgba(16, 185, 129, 0.15)' : '#1d1d22',
            color: copiedLink ? '#10b981' : '#e4e4e7',
            border: copiedLink ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border)',
            padding: '0.35rem 0.7rem',
            fontSize: '0.8rem',
            borderRadius: '6px'
          }}
          title="Copy shareable invite link to clipboard"
        >
          {copiedLink ? <Check size={13} color="#10b981" /> : <Share2 size={13} />}
          <span>{copiedLink ? 'Copied!' : 'Share'}</span>
        </button>

        {/* Leave Room Button */}
        <button 
          className="btn btn-danger" 
          onClick={handleLeave} 
          style={{ 
            padding: '0.35rem 0.7rem', 
            fontSize: '0.8rem',
            borderRadius: '6px'
          }}
        >
          Leave
        </button>
      </div>
    </header>
  );
};

export default Header;
