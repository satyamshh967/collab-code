import React from 'react';
import { useRoom } from '../../hooks/useRoom';
import { COLORS } from '../../utils/constants';
import { Crown, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const UsersList = () => {
  const { users, currentUser } = useRoom();

  const displayUsers = users.length > 0 
    ? users 
    : [{ username: localStorage.getItem('codecollab_username') || 'Guest', color: '#38bdf8' }];

  const handleCopyUsername = (username) => {
    navigator.clipboard.writeText(username);
    toast.success(`Copied username "${username}"`);
  };

  return (
    <div style={{ padding: '1rem', overflowY: 'auto', height: '100%', background: 'var(--bg-secondary)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
        Active Collaborators ({displayUsers.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {displayUsers.map((user, i) => {
          const isHost = i === 0;
          const isMe = user.username === currentUser?.username;
          const color = user.color || COLORS[i % COLORS.length] || '#38bdf8';
          const initial = (user.username || 'U').charAt(0).toUpperCase();

          return (
            <div 
              key={user.id || user.socketId || i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isMe ? 'rgba(56, 189, 248, 0.08)' : 'rgba(30, 41, 59, 0.5)',
                border: isMe ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid var(--border)',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Avatar with color ring */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '12px'
                  }}>
                    {initial}
                  </div>
                  <span 
                    className="status-dot pulsing"
                    style={{ position: 'absolute', bottom: '0', right: '0', width: '8px', height: '8px', border: '1.5px solid #0f172a' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {user.username}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isHost ? (
                      <span style={{ color: 'var(--neon-amber)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                        <Crown size={11} /> Room Host
                      </span>
                    ) : (
                      <span>Collaborator</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCopyUsername(user.username)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                title="Copy username"
              >
                <Copy size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UsersList;
