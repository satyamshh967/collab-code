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
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
        Active Collaborators ({displayUsers.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {displayUsers.map((user, i) => {
          const isHost = i === 0;
          const isMe = user.username === currentUser?.username;
          const color = user.color || COLORS[i % COLORS.length] || '#8b5cf6';
          const initial = (user.username || 'U').charAt(0).toUpperCase();

          return (
            <div 
              key={user.id || user.socketId || i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isMe ? 'rgba(139, 92, 246, 0.12)' : '#19191e',
                border: isMe ? '1px solid #8b5cf6' : '1px solid var(--border)',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Avatar with color ring */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}>
                    {initial}
                  </div>
                  <span 
                    className="status-dot pulsing"
                    style={{ position: 'absolute', bottom: '0', right: '0', width: '7px', height: '7px', border: '1.5px solid #141418' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                      {user.username}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '9px', background: 'rgba(139, 92, 246, 0.25)', color: '#c4b5fd', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isHost ? (
                      <span style={{ color: 'var(--neon-amber)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                        <Crown size={10} /> Room Host
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
