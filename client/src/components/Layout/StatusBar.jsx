import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, Keyboard, Play, Lock } from 'lucide-react';
import { useRoom } from '../../hooks/useRoom';
import { LANGUAGES, RUNNABLE_LANGUAGES } from '../../utils/constants';

/** Cursor position + selection, read straight from Monaco so typing doesn't re-render the app. */
const CursorPosition = ({ editor }) => {
  const [pos, setPos] = useState({ line: 1, column: 1, selected: 0 });

  useEffect(() => {
    if (!editor) return undefined;
    const update = () => {
      const position = editor.getPosition();
      const selection = editor.getSelection();
      const model = editor.getModel();
      const selected = selection && model ? model.getValueInRange(selection).length : 0;
      if (position) setPos({ line: position.lineNumber, column: position.column, selected });
    };
    update();
    const disposable = editor.onDidChangeCursorSelection(update);
    return () => disposable.dispose();
  }, [editor]);

  return (
    <span className="status-item">
      Ln {pos.line}, Col {pos.column}
      {pos.selected > 0 && <span style={{ color: '#a78bfa' }}>({pos.selected} selected)</span>}
    </span>
  );
};

const StatusBar = ({ unreadMessages, onOpenChat, onOpenPeople, onShowShortcuts }) => {
  const { editor, language, users, executionState, syncStatus } = useRoom();
  const languageName = LANGUAGES.find((l) => l.id === language)?.name || language;
  const runnable = RUNNABLE_LANGUAGES.has(language);
  const { status, executionTime, runBy } = executionState;

  let runSummary = null;
  if (status === 'queued' || status === 'running') {
    runSummary = <span style={{ color: '#7dd3fc' }}>{runBy ? `${runBy} is running code...` : 'Running...'}</span>;
  } else if (status === 'completed') {
    runSummary = <span style={{ color: '#34d399' }}>Last run OK · {executionTime}ms</span>;
  } else if (status === 'failed') {
    runSummary = <span style={{ color: '#f87171' }}>Last run failed</span>;
  }

  return (
    <footer className="status-bar" role="status">
      <div className="status-bar-group">
        <span className="status-item" title={syncStatus === 'connected' ? 'Shared document is in sync' : 'Waiting for the shared document'}>
          <span className="status-dot" style={{ width: 6, height: 6, background: syncStatus === 'connected' ? 'var(--success)' : 'var(--warning)' }} />
          {syncStatus === 'connected' ? 'Synced' : 'Syncing'}
        </span>
        <button className="status-item clickable" onClick={onOpenPeople} title="Show people in this room">
          <Users size={12} /> {users.length}
        </button>
        <button className="status-item clickable" onClick={onOpenChat} title="Open chat (Ctrl+Shift+M)">
          <MessageSquare size={12} />
          {unreadMessages > 0 ? <span style={{ color: '#c4b5fd', fontWeight: 600 }}>{unreadMessages} new</span> : 'Chat'}
        </button>
        <span className="hide-mobile">{runSummary}</span>
      </div>

      <div className="status-bar-group">
        <CursorPosition editor={editor} />
        <span className="status-item hide-mobile">{languageName}</span>
        <span className="status-item hide-mobile" title={runnable ? 'This language can be run' : 'Editing only: running this language is not supported yet'}>
          {runnable ? <Play size={11} /> : <Lock size={11} />}
          {runnable ? 'Runnable' : 'Edit only'}
        </span>
        <button className="status-item clickable hide-mobile" onClick={onShowShortcuts} title="Keyboard shortcuts (?)">
          <Keyboard size={12} />
        </button>
      </div>
    </footer>
  );
};

export default StatusBar;
