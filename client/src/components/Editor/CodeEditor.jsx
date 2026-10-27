import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { useRoom } from '../../hooks/useRoom';
import { EDITOR_OPTIONS, LANGUAGES } from '../../utils/constants';

const CodeEditor = () => {
  const { roomId, language, updateCode, currentUser } = useRoom();
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

    // Official Monaco Yjs Binding
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness
    );
    bindingRef.current = binding;

    // Listen to awareness changes and inject cursor / selection styles dynamically per collaborator
    const handleAwarenessChange = () => {
      const activeClientIds = new Set(Array.from(provider.awareness.getStates().keys()));
      const localClientId = provider.awareness.clientID;

      // Clean up disconnected peer styles
      document.querySelectorAll("style[id^='y-cursor-style-']").forEach((el) => {
        const numId = Number(el.id.replace('y-cursor-style-', ''));
        if (!activeClientIds.has(numId) || numId === localClientId) {
          el.remove();
        }
      });

      provider.awareness.getStates().forEach((state, clientID) => {
        if (clientID === localClientId || !state?.user) return;

        const { name = 'Collaborator', color = '#38bdf8' } = state.user;
        const styleId = `y-cursor-style-${clientID}`;
        let style = document.getElementById(styleId);
        if (!style) {
          style = document.createElement('style');
          style.id = styleId;
          document.head.appendChild(style);
        }
        style.textContent = `
          .yRemoteSelection-${clientID} {
            background-color: ${color}33 !important;
            border-radius: 2px !important;
          }
          .yRemoteSelectionHead-${clientID} {
            position: absolute !important;
            box-sizing: border-box !important;
            height: 100% !important;
            border-left: 2px solid ${color} !important;
            margin-left: -1px !important;
            z-index: 25 !important;
            pointer-events: none !important;
          }
          .yRemoteSelectionHead-${clientID}::after {
            content: "${name.replace(/"/g, '\\"')}" !important;
            position: absolute !important;
            top: -1.35em !important;
            left: -2px !important;
            background-color: ${color} !important;
            color: #ffffff !important;
            font-size: 11px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-weight: 600 !important;
            padding: 1px 6px !important;
            border-radius: 3px 3px 3px 0 !important;
            white-space: nowrap !important;
            pointer-events: none !important;
            z-index: 100 !important;
            line-height: 1.2 !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;
          }
        `;
      });
    };

    provider.awareness.on('change', handleAwarenessChange);

    // Populate initial default code ONLY IF the room document is completely empty after sync
    provider.on('synced', (isSynced) => {
      if (isSynced && yText.length === 0 && defaultCode) {
        ydoc.transact(() => {
          yText.insert(0, defaultCode);
        });
      }
      if (updateCodeRef.current) {
        updateCodeRef.current(yText.toString());
      }
      handleAwarenessChange();
    });

    // Listen to changes in Yjs CRDT doc and update RoomContext code (debounced)
    let debounceTimer = null;
    const observer = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (updateCodeRef.current) {
          updateCodeRef.current(yText.toString());
        }
      }, 250);
    };
    yText.observe(observer);

    return () => {
      clearTimeout(debounceTimer);
      yText.unobserve(observer);
      document.querySelectorAll("style[id^='y-cursor-style-']").forEach((el) => el.remove());
      if (provider.awareness) {
        provider.awareness.off('change', handleAwarenessChange);
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
  }, [isEditorReady, roomId]);

  // 2. Update user awareness in place without destroying/recreating Y.Doc
  useEffect(() => {
    if (!providerRef.current || !currentUser) return;

    providerRef.current.awareness.setLocalStateField('user', {
      name: currentUser.username,
      color: currentUser.color || '#38bdf8'
    });
  }, [currentUser]);

  // 3. Update syntax highlighting when language switches without touching doc text
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const monacoLang = language === 'cpp' ? 'cpp' : language;
        monacoRef.current.editor.setModelLanguage(model, monacoLang);
      }
    }
  }, [language]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Editor
        height="100%"
        language={language === 'cpp' ? 'cpp' : language}
        theme="vs-dark"
        defaultValue=""
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
