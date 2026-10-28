import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { LANGUAGES } from '../../utils/constants';
import { generateUsername } from '../../utils/helpers';
import { Sparkles, Dices, ArrowRight, ShieldCheck } from 'lucide-react';

const CreateRoom = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('codecollab_username') || generateUsername());
  const [language, setLanguage] = useState('javascript');
  const [isInterview, setIsInterview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRandomizeName = () => {
    const newName = generateUsername();
    setUsername(newName);
    toast('Generated new username!', { icon: '🎲' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setIsLoading(true);
    try {
      localStorage.setItem('codecollab_username', username.trim() || generateUsername());
      const room = await api.createRoom({ name: name.trim(), language, isInterview });
      toast.success('Room created successfully! 🎉');
      navigate(`/room/${room.id || room.roomId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create room via API');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Room Name
        </label>
        <input 
          className="input" 
          placeholder="e.g. Algorithms & Cocktails" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
          autoFocus
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Your Display Name
          </label>
          <button
            type="button"
            onClick={handleRandomizeName}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
            title="Randomize username"
          >
            <Dices size={13} />
            Randomize
          </button>
        </div>
        <input 
          className="input" 
          placeholder="Your Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
          required 
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Programming Language
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.id;
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id)}
                style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center'
                }}
              >
                {lang.name}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--accent)" />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Interview Mode</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Structured technical interview workspace</div>
          </div>
        </div>
        <input 
          type="checkbox" 
          checked={isInterview} 
          onChange={e => setIsInterview(e.target.checked)} 
          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
        />
      </div>

      <button 
        type="submit" 
        className="btn btn-primary" 
        disabled={isLoading} 
        style={{ padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.3rem' }}
      >
        {isLoading ? (
          <>
            <span className="spinner" style={{ width: '16px', height: '16px' }} />
            Creating Workspace...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Create Collaborative Room
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
};

export default CreateRoom;
