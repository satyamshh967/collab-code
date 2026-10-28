import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateUsername } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { LogIn, Clipboard, Dices, ArrowRight } from 'lucide-react';

const JoinRoom = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('codecollab_username') || generateUsername());
  const navigate = useNavigate();

  const handleRandomizeName = () => {
    const newName = generateUsername();
    setUsername(newName);
    toast('Generated new username!', { icon: '🎲' });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // If full URL was pasted, extract room ID
      const match = text.match(/\/room\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setRoomId(match[1]);
        toast.success('Pasted Room ID from invite link!');
      } else if (text.trim()) {
        setRoomId(text.trim());
        toast.success('Pasted from clipboard!');
      }
    } catch (e) {
      toast.error('Unable to read clipboard');
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim() || !username.trim()) {
      toast.error('Room ID and Username are required');
      return;
    }
    localStorage.setItem('codecollab_username', username.trim());
    navigate(`/room/${roomId.trim()}`);
  };

  return (
    <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Room ID or Code
          </label>
          <button
            type="button"
            onClick={handlePaste}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
          >
            <Clipboard size={13} />
            Paste
          </button>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700 }}>
            #
          </span>
          <input 
            className="input" 
            placeholder="e.g. d412-4123" 
            value={roomId} 
            onChange={e => setRoomId(e.target.value)} 
            required 
            style={{ paddingLeft: '28px', fontFamily: 'monospace' }}
          />
        </div>
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

      <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        💡 <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> You can paste an invite link or room ID directly into the input above to jump in with your peers.
      </div>

      <button 
        type="submit" 
        className="btn btn-success" 
        style={{ padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.3rem' }}
      >
        <LogIn size={16} />
        Join Workspace
        <ArrowRight size={16} />
      </button>
    </form>
  );
};

export default JoinRoom;
