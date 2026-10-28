import React from 'react';
import { useRoom } from '../../hooks/useRoom';
import { LANGUAGES } from '../../utils/constants';
import { Code2 } from 'lucide-react';

const LanguageSelector = () => {
  const { language, changeLanguage } = useRoom();

  return (
    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Code2 size={13} style={{ position: 'absolute', left: '10px', color: 'var(--accent)', pointerEvents: 'none' }} />
        <select 
          className="input" 
          value={language} 
          onChange={(e) => changeLanguage(e.target.value)}
          style={{ 
            padding: '0.35rem 1.8rem 0.35rem 2rem', 
            fontSize: '0.82rem',
            fontWeight: 600,
            background: 'rgba(30, 41, 59, 0.7)',
            borderColor: 'var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)'
          }}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id} style={{ background: '#0f172a', color: '#f1f5f9' }}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LanguageSelector;
