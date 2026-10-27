import React, { useState } from 'react';
import { useRoom } from '../../hooks/useRoom';

const OutputPanel = () => {
  const { code, language, executionState, runCode, clearExecutionOutput } = useRoom();
  const [isExpanded, setIsExpanded] = useState(true);

  const { status, output, error, exitCode, executionTime } = executionState;
  const isRunning = status === 'queued' || status === 'running';

  const handleRun = () => {
    runCode(code, language);
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'queued':
        return (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#854d0e', color: '#fef08a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="spinner" style={{ width: '10px', height: '10px' }} />
            Queued (BullMQ)
          </span>
        );
      case 'running':
        return (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#1e40af', color: '#93c5fd', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="spinner" style={{ width: '10px', height: '10px' }} />
            Executing Sandbox
          </span>
        );
      case 'completed':
        return (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#166534', color: '#86efac' }}>
            ✓ Success ({executionTime}ms)
          </span>
        );
      case 'failed':
        return (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#991b1b', color: '#fca5a5' }}>
            ✕ Error (Exit {exitCode ?? 1})
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ height: isExpanded ? '32%' : '42px', background: '#18181b', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', transition: 'height 0.25s ease' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.8rem', background: '#202024', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #27272a' : 'none' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#e4e4e7' }}>Terminal Output</span>
          {getStatusBadge()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn"
            onClick={(e) => { e.stopPropagation(); clearExecutionOutput(); }}
            style={{ background: '#27272a', color: '#a1a1aa', padding: '0.25rem 0.6rem', fontSize: '12px', borderRadius: '4px', border: '1px solid #3f3f46' }}
          >
            Clear
          </button>
          <button
            className="btn"
            onClick={(e) => { e.stopPropagation(); handleRun(); }}
            disabled={isRunning}
            style={{
              background: isRunning ? '#3f3f46' : '#22c55e',
              color: isRunning ? '#a1a1aa' : '#052e16',
              fontWeight: 600,
              padding: '0.25rem 0.8rem',
              fontSize: '12px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            {isRunning && <span className="spinner" style={{ width: '12px', height: '12px' }} />}
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', fontFamily: 'Menlo, Monaco, "Courier New", monospace', fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#d4d4d8', background: '#09090b' }}>
          {output && <div style={{ color: '#e4e4e7' }}>{output}</div>}
          {error && <div style={{ color: '#f87171', marginTop: output ? '6px' : 0 }}>{error}</div>}
          {!output && !error && !isRunning && (
            <div style={{ color: '#52525b', fontStyle: 'italic' }}>
              Click "Run Code" to asynchronously execute in sandboxed environment.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OutputPanel;
