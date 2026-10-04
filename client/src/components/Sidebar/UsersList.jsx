import React from 'react';
import { useRoom } from '../../hooks/useRoom';
import { COLORS } from '../../utils/constants';

const UsersList = () => {
  const { users } = useRoom();

  // If no users (e.g. testing locally without socket mock completely running)
  const displayUsers = users.length > 0 ? users : [{ username: localStorage.getItem('codecollab_username') || 'Guest' }];

  return (
    <div style={{ padding: '1rem', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {displayUsers.map((user, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i % COLORS.length] }}></div>
            <span>{user.username}</span>
            {i === 0 && <span title="Room Owner">👑</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersList;
