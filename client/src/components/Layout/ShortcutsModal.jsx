import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS = [
  { keys: [MOD, 'Enter'], label: 'Run code' },
  { keys: [MOD, 'S'], label: 'Save a snapshot' },
  { keys: [MOD, 'B'], label: 'Toggle sidebar' },
  { keys: [MOD, 'J'], label: 'Toggle output panel' },
  { keys: [MOD, 'Shift', 'M'], label: 'Open chat' },
  { keys: [MOD, 'F'], label: 'Find in file' },
  { keys: ['Alt', '↑ / ↓'], label: 'Move line up / down' },
  { keys: [MOD, '/'], label: 'Toggle comment' },
  { keys: ['?'], label: 'Show this help' }
];

const ShortcutsModal = ({ onClose }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 id="shortcuts-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Keyboard shortcuts</h2>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SHORTCUTS.map(({ keys, label }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 4px', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ display: 'inline-flex', gap: 4 }}>
                {keys.map((k) => <kbd key={k}>{k}</kbd>)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
