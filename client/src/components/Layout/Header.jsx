import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRoom } from '../../hooks/useRoom';
import LanguageSelector from '../Editor/LanguageSelector';
import { Share2, Check, Copy, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const Header = () => {
  const navigate = useNavigate();
  const { roomId, users, leaveRoom } = useRoom();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      leaveRoom();
      navigate('/');
    }
  };

  // Shorten room ID for display (e.g., e4a7-8f2c or first 8 chars of a raw UUID)
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
      toast.success('Invite link copied to clipboard!');
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

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.6rem 1.5rem',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      height: '56px',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--accent)', fontWeight: '700', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
          CodeCollab
        </Link>
        
        {/* Shortened Professional Room ID Badge */}
        {roomId && (
          <div 
            onClick={copyRoomIdOnly}
            title={`Full Room ID: ${roomId} (Click to copy ID)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>#</span>
            <span style={{ fontWeight: 600 }}>{displayRoomId}</span>
            {copiedId ? <Check size={12} color="var(--success)" /> : <Copy size={12} color="var(--text-secondary)" />}
          </div>
        )}

        {/* Online Peer Counter */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'rgba(78, 201, 176, 0.1)',
          border: '1px solid rgba(78, 201, 176, 0.3)',
          padding: '0.2rem 0.55rem',
          borderRadius: '12px',
          fontSize: '0.78rem',
          color: 'var(--success)',
          fontWeight: 600
        }}>
          <Users size={12} />
          <span>{users.length} Online</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Share / Invite Link Button */}
        <button 
          className="btn"
          onClick={copyInviteLink}
          style={{
            background: copiedLink ? 'rgba(78, 201, 176, 0.15)' : 'var(--bg-tertiary)',
            color: copiedLink ? 'var(--success)' : 'var(--text-primary)',
            border: copiedLink ? '1px solid var(--success)' : '1px solid var(--border)',
            padding: '0.4rem 0.85rem',
            fontSize: '0.85rem',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Copy shareable invite link to clipboard"
        >
          {copiedLink ? <Check size={15} color="var(--success)" /> : <Share2 size={15} />}
          <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
        </button>

        <LanguageSelector />
        
        <button 
          className="btn" 
          onClick={handleLeave} 
          style={{ 
            background: 'var(--error)', 
            padding: '0.4rem 0.85rem', 
            fontSize: '0.85rem',
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
