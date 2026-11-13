import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Copy, Trash2, ChevronDown, ChevronUp, Check, Terminal, Keyboard as InputIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRoom } from '../../hooks/useRoom';
import { fireConfetti } from '../../utils/confetti';
import { LANGUAGES, RUNNABLE_LANGUAGES } from '../../utils/constants';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const StatusBadge = ({ status, exitCode, executionTime, elapsed }) => {
  switch (status) {
    case 'queued':
      return <span className="pill warn"><span className="spinner" style={{ width: 9, height: 9, borderTopColor: '#fbbf24' }} />Queued · {elapsed}s</span>;
    case 'running':
      return <span className="pill info"><span className="spinner" style={{ width: 9, height: 9, borderTopColor: '#7dd3fc' }} />Running · {elapsed}s</span>;
    case 'completed':
      return <span className="pill ok">✓ Exit 0 · {executionTime}ms</span>;
    case 'failed':
      return <span className="pill bad">✕ Exit {exitCode ?? 1}{executionTime ? ` · ${executionTime}ms` : ''}</span>;
    default:
      return null;
  }
};

const OutputPanel = ({ height = 260, collapsed = false, onToggleCollapse }) => {
  const { roomId, language, executionState, runCode, clearExecutionOutput } = useRoom();
  const [tab, setTab] = useState('output');
  const [stdin, setStdin] = useState('');
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState('0.0');
  const terminalRef = useRef(null);
  const celebratedJobRef = useRef(null);

  const { status, output, error, exitCode, executionTime, runBy, isOwnRun, jobId } = executionState;
  const isRunning = status === 'queued' || status === 'running';
  const canRun = RUNNABLE_LANGUAGES.has(language);
  const languageName = LANGUAGES.find((l) => l.id === language)?.name || language;

  // Program input is per room
  useEffect(() => { setStdin(''); }, [roomId]);

  // Live stopwatch while a run is in flight
  useEffect(() => {
    if (!isRunning) return undefined;
    const start = Date.now();
    setElapsed('0.0');
    const timer = setInterval(() => setElapsed(((Date.now() - start) / 1000).toFixed(1)), 100);
    return () => clearInterval(timer);
  }, [isRunning, jobId]);

  // Celebrate only our own successful runs, once per job
  useEffect(() => {
    if (status === 'completed' && exitCode === 0 && isOwnRun && jobId && celebratedJobRef.current !== jobId) {
      celebratedJobRef.current = jobId;
      fireConfetti();
    }
  }, [status, exitCode, isOwnRun, jobId]);

  // Jump to the output when a run starts, and keep it scrolled to the end
  useEffect(() => {
    if (isRunning) setTab('output');
  }, [isRunning]);
  useEffect(() => {
    const el = terminalRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [output, error, tab]);

  const handleRun = useCallback(() => {
    if (!canRun) {
      toast.error(`Running ${languageName} isn't supported yet. Try JavaScript, Python or Java.`);
      return;
    }
    if (collapsed) onToggleCollapse?.();
    runCode(language, stdin);
  }, [canRun, languageName, runCode, language, stdin, collapsed, onToggleCollapse]);

  // Ctrl/Cmd+Enter runs from anywhere. Capture phase so it fires before
  // Monaco, which otherwise consumes Ctrl+Enter ("insert line below").
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!isRunning) handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRunning, handleRun]);

  const handleCopyOutput = async () => {
    const text = [output, error].filter(Boolean).join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      toast.error('Could not access the clipboard');
    }
  };

  const hasOutput = Boolean(output || error);

  return (
    <section className="output-panel" style={{ height: collapsed ? 38 : height }} aria-label="Program output">
      <div className="output-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <button className="icon-btn" style={{ minWidth: 26, padding: 0 }} onClick={onToggleCollapse} title={collapsed ? 'Expand panel (Ctrl+J)' : 'Collapse panel (Ctrl+J)'} aria-expanded={!collapsed}>
            {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className={`output-tab ${tab === 'output' ? 'active' : ''}`} onClick={() => { setTab('output'); if (collapsed) onToggleCollapse?.(); }}>
            <Terminal size={12} /> Output
          </button>
          <button className={`output-tab ${tab === 'input' ? 'active' : ''}`} onClick={() => { setTab('input'); if (collapsed) onToggleCollapse?.(); }} title="Text passed to your program's standard input">
            <InputIcon size={12} /> Input
            {stdin && <span className="status-dot" style={{ width: 5, height: 5, background: 'var(--accent)' }} />}
          </button>
          <span className="hide-mobile" style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <StatusBadge status={status} exitCode={exitCode} executionTime={executionTime} elapsed={elapsed} />
            {runBy && status !== 'idle' && !isOwnRun && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>run by {runBy}</span>
            )}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {hasOutput && (
            <button className="icon-btn" onClick={handleCopyOutput} title="Copy output">
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>
          )}
          <button className="icon-btn" onClick={clearExecutionOutput} title="Clear output" disabled={!hasOutput && status === 'idle'}>
            <Trash2 size={14} />
          </button>
          <button
            className="btn btn-primary"
            onClick={handleRun}
            disabled={isRunning || !canRun}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem', height: 28, marginLeft: 4 }}
            title={canRun ? `Run code (${isMac ? '⌘' : 'Ctrl'}+Enter)` : `Running ${languageName} isn't supported yet (JavaScript, Python and Java can run)`}
          >
            {isRunning
              ? <><span className="spinner" style={{ width: 11, height: 11, borderTopColor: '#fff' }} /> Running</>
              : <><Play size={12} fill="#fff" /> Run <kbd className="hide-mobile" style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.2)', color: '#ede9fe' }}>{isMac ? '⌘' : 'Ctrl'}↵</kbd></>}
          </button>
        </div>
      </div>

      {!collapsed && tab === 'output' && (
        <div className="terminal" ref={terminalRef} aria-live="polite">
          {hasOutput ? (
            <>
              {output && <div>{output}</div>}
              {error && <div style={{ color: '#f87171', marginTop: output ? 6 : 0 }}>{error}</div>}
            </>
          ) : isRunning ? (
            <div style={{ color: 'var(--text-muted)' }}>{status === 'queued' ? 'Waiting for a sandbox...' : 'Running...'}</div>
          ) : status === 'completed' ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Program finished with no output.</div>
          ) : (
            <div style={{ color: '#52525b', lineHeight: 1.8 }}>
              {canRun ? (
                <>Press <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd> <kbd>Enter</kbd> or <strong style={{ color: '#a1a1aa' }}>Run</strong> to execute this {languageName} file in a sandbox. Everyone in the room sees the result.
                  <br />Need input? Put it in the <button onClick={() => setTab('input')} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: 0, font: 'inherit' }}>Input tab</button>.</>
              ) : (
                <>{languageName} is editable here, but running it isn't supported yet. Switch to JavaScript, Python or Java to run code.</>
              )}
            </div>
          )}
        </div>
      )}

      {!collapsed && tab === 'input' && (
        <textarea
          className="stdin-input"
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder={'Text here is sent to your program\'s standard input when you press Run.\nExample: one value per line for input() / Scanner / readline.'}
          spellCheck={false}
          aria-label="Program input (stdin)"
        />
      )}
    </section>
  );
};

export default OutputPanel;
