import React, { useState } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { formatTime } from '../../utils/helpers';

const SnapshotPanel = () => {
  const { snapshots, saveSnapshot, restoreSnapshot } = useRoom();
  const [label, setLabel] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (label.trim()) {
      saveSnapshot(label);
      setLabel('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
      <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input 
          className="input" 
          style={{ flex: 1 }} 
          placeholder="Snapshot label..." 
          value={label} 
          onChange={(e) => setLabel(e.target.value)} 
        />
        <button type="submit" className="btn">Save</button>
      </form>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {snapshots.length === 0 && <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No snapshots saved</div>}
        {snapshots.map((snap) => (
          <div key={snap.id} style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{snap.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatTime(snap.timestamp)}</div>
            </div>
            <button className="btn" onClick={() => restoreSnapshot(snap.id)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Restore</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SnapshotPanel;
