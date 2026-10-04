import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateUsername } from '../../utils/helpers';
import toast from 'react-hot-toast';

const JoinRoom = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState(generateUsername());
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim() || !username.trim()) {
      toast.error('Room ID and Username are required');
      return;
    }
    localStorage.setItem('codecollab_username', username);
    navigate(`/room/${roomId}`);
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', width: '320px', border: '1px solid var(--bg-tertiary)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
      <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Join Room</h2>
      <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input className="input" placeholder="Room ID" value={roomId} onChange={e => setRoomId(e.target.value)} required />
        <input className="input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <button type="submit" className="btn" style={{ marginTop: '0.5rem', background: 'var(--success)', color: '#000' }}>Join</button>
      </form>
    </div>
  );
};

export default JoinRoom;
