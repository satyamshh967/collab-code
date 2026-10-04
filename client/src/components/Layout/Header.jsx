import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRoom } from '../../hooks/useRoom';
import LanguageSelector from '../Editor/LanguageSelector';

const Header = () => {
  const navigate = useNavigate();
  const { roomId, users, leaveRoom } = useRoom();

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      leaveRoom();
      navigate('/');
    }
  };

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--bg-tertiary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>
          CodeCollab
        </Link>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Room: {roomId || '...'}</span>
        <span style={{ background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--success)' }}>
          {users.length} Online
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <LanguageSelector />
        <button className="btn" onClick={handleLeave} style={{ background: 'var(--error)' }}>
          Leave Room
        </button>
      </div>
    </header>
  );
};

export default Header;
