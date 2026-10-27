import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { LANGUAGES } from '../../utils/constants';
import { generateUsername } from '../../utils/helpers';

const CreateRoom = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('codecollab_username') || generateUsername());
  const [language, setLanguage] = useState('javascript');
  const [isInterview, setIsInterview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      localStorage.setItem('codecollab_username', username.trim() || generateUsername());
      const room = await api.createRoom({ name: name.trim(), language, isInterview });
      toast.success('Room created successfully');
      navigate(`/room/${room.id || room.roomId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create room via API');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', width: '320px', border: '1px solid var(--bg-tertiary)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
      <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Create Room</h2>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input className="input" placeholder="Room Name" value={name} onChange={e => setName(e.target.value)} required />
        <input className="input" placeholder="Your Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <select className="input" value={language} onChange={e => setLanguage(e.target.value)}>
          {LANGUAGES.map(lang => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={isInterview} onChange={e => setIsInterview(e.target.checked)} />
          Interview Mode
        </label>
        <button type="submit" className="btn" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
          {isLoading ? 'Creating...' : 'Create'}
        </button>
      </form>
    </div>
  );
};

export default CreateRoom;
