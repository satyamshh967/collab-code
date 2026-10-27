import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from '../../utils/y-monaco';
import { useRoom } from '../../hooks/useRoom';
import { EDITOR_OPTIONS, LANGUAGES } from '../../utils/constants';

const CodeEditor = () => {
  const { roomId, code, language, updateCode, currentUser } = useRoom();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const defaultCode = LANGUAGES.find((l) => l.id === language)?.defaultCode || '';
  const updateCodeRef = useRef(updateCode);
  updateCodeRef.current = updateCode;

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);
  };

  // 1. Initialize Yjs CRDT Provider & Monaco Binding once per room session
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !monacoRef.current || !roomId) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Clean up any existing instances
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const serverHttpUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
    const wsUrl = serverHttpUrl.replace(/^http/, 'ws') + '/yjs';

    const provider = new WebsocketProvider(wsUrl, roomId, ydoc, {
      connect: true
    });
    providerRef.current = provider;

    const yText = ydoc.getText('monaco');

    // Set initial awareness state
    const storedUsername = localStorage.getItem('codecollab_username') || 'Guest';
    provider.awareness.setLocalStateField('user', {
      name: currentUser?.username || storedUsername,
      color: currentUser?.color || '#38bdf8'
    });

    // Monaco Yjs Binding with native monaco instance
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness,
      monaco
    );
    bindingRef.current = binding;

    // Populate initial default code if document is empty
    provider.on('synced', (isSynced) => {
      if (isSynced && yText.length === 0 && defaultCode) {
        ydoc.transact(() => {
          yText.insert(0, defaultCode);
        });
      }
      if (updateCodeRef.current) {
        updateCodeRef.current(yText.toString());
      }
      if (bindingRef.current && bindingRef.current._rerenderDecorations) {
        bindingRef.current._rerenderDecorations();
      }
    });

    // Listen to changes in Yjs CRDT doc and update RoomContext code
    const observer = () => {
      if (updateCodeRef.current) {
        updateCodeRef.current(yText.toString());
      }
    };
    yText.observe(observer);

    return () => {
      yText.unobserve(observer);
      if (provider.awareness) {
        provider.awareness.setLocalState(null);
      }
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorReady, roomId]); // ONLY re-create when editor is ready or roomId changes!

  // 2. Update user awareness in place without destroying/recreating Y.Doc
  useEffect(() => {
    if (!providerRef.current || !currentUser) return;

    providerRef.current.awareness.setLocalStateField('user', {
      name: currentUser.username,
      color: currentUser.color || '#38bdf8'
    });
  }, [currentUser]);

  // 3. Handle external snapshot restore or code updates
  useEffect(() => {
    if (!ydocRef.current) return;
    const yText = ydocRef.current.getText('monaco');
    if (code !== undefined && code !== yText.toString()) {
      ydocRef.current.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, code);
      });
    }
  }, [code]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        defaultValue={defaultCode}
        onMount={handleEditorDidMount}
        options={EDITOR_OPTIONS}
        loading={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ marginRight: '0.5rem' }} />
            Initializing CRDT Editor...
          </div>
        }
      />
    </div>
  );
};

export default CodeEditor;
