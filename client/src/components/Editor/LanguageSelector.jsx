import React from 'react';
import { useRoom } from '../../hooks/useRoom';
import { LANGUAGES } from '../../utils/constants';

const LanguageSelector = () => {
  const { language, changeLanguage } = useRoom();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Language:</span>
      <select 
        className="input" 
        value={language} 
        onChange={(e) => changeLanguage(e.target.value)}
        style={{ padding: '0.3rem', fontSize: '0.9rem' }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
