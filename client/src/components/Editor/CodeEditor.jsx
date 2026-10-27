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

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);
  };

  // Setup Yjs CRDT Provider & Monaco Binding
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !monacoRef.current || !roomId) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Destroy existing binding/provider if roomId changed
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

    // Setup awareness (cursor, selection, username, color)
    const storedUsername = localStorage.getItem('codecollab_username') || 'Guest';
    const username = currentUser?.username || storedUsername;
    const color = currentUser?.color || '#38bdf8';

    provider.awareness.setLocalStateField('user', {
      name: username,
      color: color
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
      updateCode(yText.toString());
    });

    // Listen to changes in Yjs CRDT doc and update RoomContext code
    const observer = () => {
      updateCode(yText.toString());
    };
    yText.observe(observer);

    return () => {
      yText.unobserve(observer);
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
  }, [isEditorReady, roomId, currentUser, defaultCode, updateCode]);

  // Handle external snapshot restore or code updates
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
