import React, { useRef, useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from '../../utils/y-monaco';
import { useRoom } from '../../hooks/useRoom';
import { EDITOR_OPTIONS } from '../../utils/constants';
import { getOrCreateUsername, DEFAULT_EDITOR_SETTINGS } from '../../utils/storage';

const THEME_NAME = 'codecollab-dark';

// Editor theme matched to the app palette instead of stock vs-dark
const defineTheme = (monaco) => {
  monaco.editor.defineTheme(THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c084fc' },
      { token: 'string', foreground: '7dd3fc' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'type', foreground: '34d399' }
    ],
    colors: {
      'editor.background': '#111113',
      'editor.lineHighlightBackground': '#1a1a20',
      'editor.selectionBackground': '#8b5cf640',
      'editorLineNumber.foreground': '#3f3f46',
      'editorLineNumber.activeForeground': '#a1a1aa',
      'editorCursor.foreground': '#a78bfa',
      'editorIndentGuide.background1': '#1f1f26',
      'editorWidget.background': '#1a1a20',
      'editorWidget.border': '#2e2e38',
      'scrollbarSlider.background': '#2b2b3480'
    }
  });
};

const CodeEditor = ({ settings = DEFAULT_EDITOR_SETTINGS }) => {
  const { roomId, language, currentUser, registerCodeGetter, setSyncStatus, setEditor } = useRoom();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const providerRef = useRef(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  // Context callbacks are stable, but keep refs so the Yjs effect below only
  // re-runs when the room (not a callback identity) changes.
  const callbacksRef = useRef({ registerCodeGetter, setSyncStatus });
  callbacksRef.current = { registerCodeGetter, setSyncStatus };
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditor(editor);
    setIsEditorReady(true);
    editor.focus();
  };

  useEffect(() => () => setEditor(null), [setEditor]);

  // 1. One Yjs document + provider + Monaco binding per room session
  useEffect(() => {
    if (!isEditorReady || !roomId) return undefined;
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!model) return undefined;

    const { registerCodeGetter: register, setSyncStatus: reportStatus } = callbacksRef.current;
    setHasSynced(false);
    reportStatus('connecting');

    const ydoc = new Y.Doc();
    const serverHttpUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
    const wsUrl = `${serverHttpUrl.replace(/^http/, 'ws')}/yjs`;
    const provider = new WebsocketProvider(wsUrl, roomId, ydoc, { connect: true });
    providerRef.current = provider;
    const yText = ydoc.getText('monaco');

    provider.awareness.setLocalStateField('user', {
      name: currentUserRef.current?.username || getOrCreateUsername(),
      color: currentUserRef.current?.color || '#38bdf8'
    });

    const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness, monacoRef.current);

    // "Run" and "Download" read the live document on demand. Nothing is pushed
    // into React state per keystroke, so typing never re-renders the app.
    register(() => yText.toString());

    const onStatus = ({ status }) => reportStatus(status);
    const onSync = (isSynced) => {
      if (isSynced) {
        setHasSynced(true);
        reportStatus('connected');
      }
    };
    provider.on('status', onStatus);
    provider.on('sync', onSync);

    return () => {
      register(null);
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      provider.awareness.setLocalState(null);
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
      providerRef.current = null;
      reportStatus('disconnected');
    };
  }, [isEditorReady, roomId]);

  // 2. Keep our presence (name/color) current without recreating the doc
  useEffect(() => {
    if (!providerRef.current || !currentUser) return;
    providerRef.current.awareness.setLocalStateField('user', {
      name: currentUser.username,
      color: currentUser.color || '#38bdf8'
    });
  }, [currentUser]);

  // 3. Syntax highlighting follows the room language
  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (monacoRef.current && model) {
      monacoRef.current.editor.setModelLanguage(model, language);
    }
  }, [language, isEditorReady]);

  const options = useMemo(() => ({
    ...EDITOR_OPTIONS,
    fontSize: settings.fontSize,
    minimap: { enabled: settings.minimap },
    wordWrap: settings.wordWrap ? 'on' : 'off'
  }), [settings.fontSize, settings.minimap, settings.wordWrap]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        theme={THEME_NAME}
        beforeMount={defineTheme}
        defaultValue=""
        onMount={handleEditorDidMount}
        options={options}
        loading={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <span className="spinner" /> Loading editor...
          </div>
        }
      />
      {isEditorReady && !hasSynced && (
        <div style={{
          position: 'absolute', top: 12, right: 24, zIndex: 5,
          display: 'inline-flex', alignItems: 'center', gap: 8
        }}>
          <span className="pill warn"><span className="spinner" style={{ width: 9, height: 9, borderTopColor: '#fbbf24' }} />Loading shared document...</span>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
