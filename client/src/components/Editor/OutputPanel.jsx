import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { Play, Copy, Trash2, ChevronDown, ChevronUp, Check, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';
import { fireConfetti } from '../../utils/confetti';

const OutputPanel = () => {
  const { code, language, executionState, runCode, clearExecutionOutput } = useRoom();
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [elapsedTimer, setElapsedTimer] = useState(0);
  const timerRef = useRef(null);

  const { status, output, error, exitCode, executionTime } = executionState;
  const isRunning = status === 'queued' || status === 'running';

  // Live stopwatch while code is running
  useEffect(() => {
    if (isRunning) {
      setElapsedTimer(0);
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTimer(((Date.now() - start) / 1000).toFixed(1));
      }, 100);
    } else {
      clearInterval(timerRef.current);
      if (status === 'completed' && exitCode === 0) {
        fireConfetti();
      }
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, status, exitCode]);

  const handleRun = useCallback(() => {
    runCode(code, language);
  }, [code, language, runCode]);

  // Global Ctrl+Enter / Cmd+Enter keyboard shortcut to Run Code
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning) {
          handleRun();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, handleRun]);

  const handleCopyOutput = async () => {
    const textToCopy = [output, error].filter(Boolean).join('\n');
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Terminal output copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error('Failed to copy output');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'queued':
        return (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span className="spinner" style={{ width: '9px', height: '9px', borderColor: 'rgba(245, 158, 11, 0.3)', borderTopColor: '#fbbf24' }} />
            Queued (BullMQ) • {elapsedTimer}s
          </span>
        );
      case 'running':
        return (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span className="spinner" style={{ width: '9px', height: '9px' }} />
            Executing Sandbox • {elapsedTimer}s
          </span>
        );
      case 'completed':
        return (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ✓ Success ({executionTime}ms)
          </span>
        );
      case 'failed':
        return (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ✕ Error (Exit {exitCode ?? 1})
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      height: isExpanded ? '34%' : '38px',
      background: '#111113',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'height 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      position: 'relative',
      minWidth: 0,
      width: '100%',
      overflow: 'hidden'
    }}>
      {/* Terminal Titlebar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.4rem 1rem',
          background: '#141418',
          borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
          userSelect: 'none'
        }}
      >
        {/* Left: Terminal Title & Chevron */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Terminal size={13} color="#a78bfa" />
            <span>TERMINAL OUTPUT</span>
            {isExpanded ? <ChevronDown size={13} color="var(--text-muted)" /> : <ChevronUp size={13} color="var(--text-muted)" />}
          </div>

          {getStatusBadge()}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {(output || error) && (
            <button
              className="btn"
              onClick={handleCopyOutput}
              style={{ padding: '0.2rem 0.55rem', fontSize: '11px', borderRadius: '5px', background: '#1d1d22', border: '1px solid #2e2e38' }}
              title="Copy output to clipboard"
            >
              {copied ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          <button
            className="btn"
            onClick={clearExecutionOutput}
            style={{ padding: '0.2rem 0.55rem', fontSize: '11px', borderRadius: '5px', background: '#1d1d22', border: '1px solid #2e2e38' }}
            title="Clear output"
          >
            <Trash2 size={11} />
            <span>Clear</span>
          </button>

          {/* Clean Run Code Button */}
          <button
            className="btn btn-primary"
            onClick={handleRun}
            disabled={isRunning}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '11px',
              borderRadius: '5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="Run Code in sandboxed container (Ctrl+Enter)"
          >
            {isRunning ? (
              <>
                <span className="spinner" style={{ width: '11px', height: '11px' }} />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={11} fill="#ffffff" />
                <span>Run Code</span>
                <span style={{ fontSize: '9px', opacity: 0.75, marginLeft: '2px' }}>(Ctrl+↵)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      {isExpanded && (
        <div style={{
          flex: 1,
          padding: '0.75rem 1rem',
          overflowY: 'auto',
          fontFamily: "'Fira Code', Menlo, Monaco, 'Courier New', monospace",
          fontSize: '12px',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          color: '#e4e4e7',
          background: '#111113'
        }}>
          {/* Prompt prefix */}
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.35rem', fontSize: '11px' }}>
            <span style={{ color: '#10b981' }}>user@collab</span>
            <span style={{ color: 'var(--text-muted)' }}>:</span>
            <span style={{ color: '#a78bfa' }}>~/sandbox</span>
            <span>$ run {language}</span>
          </div>

          {output && <div style={{ color: '#f4f4f5' }}>{output}</div>}
          {error && <div style={{ color: '#f87171', marginTop: output ? '6px' : 0 }}>{error}</div>}

          {!output && !error && !isRunning && (
            <div style={{ color: '#52525b', fontStyle: 'italic', marginTop: '4px' }}>
              Press <strong style={{ color: '#a1a1aa' }}>Run Code</strong> or hit <kbd style={{ background: '#1c1c22', padding: '1px 5px', borderRadius: '4px', border: '1px solid #2e2e38', color: '#d4d4d8' }}>Ctrl+Enter</kbd> to execute in an isolated container sandbox.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OutputPanel;
