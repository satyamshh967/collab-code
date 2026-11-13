import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateUsername } from '../../utils/helpers';
import { ROOM_ID_PATTERN, getUsername, setUsername as saveUsername } from '../../utils/storage';
import toast from 'react-hot-toast';
import { LogIn, Clipboard, Dices, ArrowRight } from 'lucide-react';

// Accepts a bare room code or a full invite link
const extractRoomId = (text) => {
  const trimmed = (text || '').trim();
  const match = trimmed.match(/\/room\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : trimmed.replace(/^#/, '');
};

const JoinRoom = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState(() => getUsername() || generateUsername());
  const navigate = useNavigate();

  const handleRandomizeName = () => {
    const newName = generateUsername();
    setUsername(newName);
    toast('Generated new username!', { icon: '🎲' });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const id = extractRoomId(text);
      if (id) {
        setRoomId(id);
        toast.success('Pasted room code');
      }
    } catch (e) {
      toast.error('Unable to read clipboard');
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const id = extractRoomId(roomId);
    if (!id || !username.trim()) {
      toast.error('Room code and display name are required');
      return;
    }
    if (!ROOM_ID_PATTERN.test(id)) {
      toast.error('Room codes use only letters, numbers, - and _');
      return;
    }
    saveUsername(username.trim().slice(0, 32));
    navigate(`/room/${id}`);
  };

  return (
    <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
          <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700 }}>
            #
          </span>
          <input 
            className="input" 
            placeholder="e.g. d412-4123" 
            value={roomId} 
            onChange={e => setRoomId(extractRoomId(e.target.value))} 
            required 
            style={{ paddingLeft: '28px', fontFamily: 'monospace' }}
          />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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

      <div style={{ background: '#141418', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        💡 <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> Paste an invite URL or short Room ID to jump straight into the collaborative session.
      </div>

      <button 
        type="submit" 
        className="btn btn-primary" 
        style={{ padding: '0.7rem', fontSize: '0.9rem', marginTop: '0.2rem', borderRadius: '6px' }}
      >
        <LogIn size={15} />
        Join Workspace
        <ArrowRight size={15} />
      </button>
    </form>
  );
};

export default JoinRoom;
