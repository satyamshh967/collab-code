import React, { useState } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { formatTime } from '../../utils/helpers';
import { Camera, RotateCcw, Plus, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const SnapshotPanel = () => {
  const { snapshots, saveSnapshot, restoreSnapshot } = useRoom();
  const [label, setLabel] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (label.trim()) {
      saveSnapshot(label.trim());
      setLabel('');
    } else {
      toast.error('Please enter a snapshot label');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', background: 'var(--bg-secondary)' }}>
      {/* Save Snapshot Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input 
          className="input" 
          style={{ flex: 1, fontSize: '0.82rem', padding: '0.45rem 0.75rem' }} 
          placeholder="e.g. Working checkpoint v1..." 
          value={label} 
          onChange={(e) => setLabel(e.target.value)} 
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem' }}>
          <Plus size={14} />
          Save
        </button>
      </form>

      {/* Snapshots Timeline List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {snapshots.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--neon-purple)' }}>
              <Camera size={20} />
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              No Snapshots Yet
            </div>
            <div style={{ fontSize: '0.78rem' }}>Take code snapshots to preserve version checkpoints.</div>
          </div>
        ) : (
          snapshots.map((snap) => (
            <div 
              key={snap.id} 
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid var(--border)',
                padding: '0.75rem',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {snap.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} />
                  <span>{formatTime(snap.timestamp)}</span>
                  {snap.language && (
                    <span style={{ textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600, marginLeft: '4px' }}>
                      • {snap.language}
                    </span>
                  )}
                </div>
              </div>

              <button 
                className="btn" 
                onClick={() => restoreSnapshot(snap.id)} 
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                title="Restore this code snapshot"
              >
                <RotateCcw size={12} />
                Restore
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SnapshotPanel;
