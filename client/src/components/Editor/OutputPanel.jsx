import React, { useState } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { api } from '../../services/api';

const OutputPanel = () => {
  const { code, language } = useRoom();
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleRun = async () => {
    setLoading(true);
    setOutput('Running...\n');
    try {
      const res = await api.executeCode(code, language);
      setOutput(res.output || res.error || 'Execution finished.');
    } catch (err) {
      setOutput('Error: Failed to execute code via API. Mock execution finished.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: isExpanded ? '30%' : '40px', background: '#1e1e1e', borderTop: '1px solid var(--bg-tertiary)', display: 'flex', flexDirection: 'column', transition: 'height 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-secondary)', cursor: 'pointer' }} onClick={() => setIsExpanded(!isExpanded)}>
        <span style={{ fontWeight: 'bold' }}>Output</span>
        <div>
          <button className="btn" onClick={(e) => { e.stopPropagation(); setOutput(''); }} style={{ background: 'var(--bg-tertiary)', marginRight: '0.5rem', padding: '0.2rem 0.5rem' }}>Clear</button>
          <button className="btn" onClick={(e) => { e.stopPropagation(); handleRun(); }} disabled={loading} style={{ background: 'var(--success)', color: '#000', padding: '0.2rem 0.5rem' }}>
            {loading ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div style={{ flex: 1, padding: '0.5rem', overflowY: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
          {output || 'Click "Run" to see the output here.'}
        </div>
      )}
    </div>
  );
};

export default OutputPanel;
