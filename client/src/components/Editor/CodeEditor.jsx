import React, { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useRoom } from '../../hooks/useRoom';
import { EDITOR_OPTIONS, LANGUAGES } from '../../utils/constants';

const CodeEditor = () => {
  const { code, language, updateCode, sendCursorPosition, cursors } = useRoom();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const isUpdatingRef = useRef(false);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (sendCursorPosition) {
        sendCursorPosition({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });
  };

  const handleEditorChange = useCallback((value) => {
    if (!isUpdatingRef.current) {
      updateCode(value);
    }
  }, [updateCode]);

  // Update remote cursors as Monaco decorations
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !cursors) return;

    const newDecorations = [];

    Object.entries(cursors).forEach(([userId, cursor]) => {
      if (!cursor.position) return;

      const { lineNumber, column } = cursor.position;
      const { username, color } = cursor;

      // Create a CSS class dynamically for this user's cursor color
      const className = `remote-cursor-${userId.replace(/[^a-zA-Z0-9]/g, '')}`;
      const labelClassName = `remote-cursor-label-${userId.replace(/[^a-zA-Z0-9]/g, '')}`;

      // Inject style if it doesn't exist
      if (!document.getElementById(className)) {
        const style = document.createElement('style');
        style.id = className;
        style.textContent = `
          .${className} {
            background: ${color};
            width: 2px !important;
            margin-left: -1px;
          }
          .${labelClassName} {
            background: ${color};
            color: #fff;
            padding: 1px 6px;
            border-radius: 3px 3px 3px 0;
            font-size: 11px;
            font-weight: bold;
            white-space: nowrap;
            position: relative;
            top: -1.4em;
          }
        `;
        document.head.appendChild(style);
      }

      // Cursor line decoration
      newDecorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: className,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });

      // Username label decoration
      newDecorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          after: {
            content: ` ${username}`,
            inlineClassName: labelClassName,
          },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    });

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [cursors]);

  // Handle remote code changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentValue = editor.getValue();
    if (code !== currentValue && code !== undefined) {
      isUpdatingRef.current = true;
      const position = editor.getPosition();
      editor.setValue(code);
      if (position) {
        editor.setPosition(position);
      }
      isUpdatingRef.current = false;
    }
  }, [code]);

  const defaultCode = LANGUAGES.find((l) => l.id === language)?.defaultCode || '';

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        defaultValue={defaultCode}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={EDITOR_OPTIONS}
        loading={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ marginRight: '0.5rem' }} />
            Loading Editor...
          </div>
        }
      />
    </div>
  );
};

export default CodeEditor;
