import * as Y from 'yjs';

const createMutex = () => {
  let token = true;
  return (f) => {
    if (token) {
      token = false;
      try {
        f();
      } finally {
        token = true;
      }
    }
  };
};

class RelativeSelection {
  constructor(start, end, direction) {
    this.start = start;
    this.end = end;
    this.direction = direction;
  }
}

const createRelativeSelection = (editor, monacoModel, type) => {
  const sel = editor.getSelection();
  if (sel !== null) {
    const startPos = sel.getStartPosition();
    const endPos = sel.getEndPosition();
    const start = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(startPos));
    const end = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(endPos));
    return new RelativeSelection(start, end, sel.getDirection());
  }
  return null;
};

const createMonacoSelectionFromRelativeSelection = (editor, type, relSel, doc, monaco) => {
  const start = Y.createAbsolutePositionFromRelativePosition(relSel.start, doc);
  const end = Y.createAbsolutePositionFromRelativePosition(relSel.end, doc);
  if (start !== null && end !== null && start.type === type && end.type === type) {
    const model = editor.getModel();
    if (!model) return null;
    const startPos = model.getPositionAt(start.index);
    const endPos = model.getPositionAt(end.index);
    if (monaco?.Selection?.createWithDirection && typeof relSel.direction === 'number') {
      return monaco.Selection.createWithDirection(
        startPos.lineNumber,
        startPos.column,
        endPos.lineNumber,
        endPos.column,
        relSel.direction
      );
    }
    if (monaco?.Selection) {
      return new monaco.Selection(
        startPos.lineNumber,
        startPos.column,
        endPos.lineNumber,
        endPos.column
      );
    }
    return {
      startLineNumber: startPos.lineNumber,
      startColumn: startPos.column,
      endLineNumber: endPos.lineNumber,
      endColumn: endPos.column,
      selectionStartLineNumber: startPos.lineNumber,
      selectionStartColumn: startPos.column,
      positionLineNumber: endPos.lineNumber,
      positionColumn: endPos.column
    };
  }
  return null;
};

export class MonacoBinding {
  constructor(ytext, monacoModel, editors = new Set(), awareness = null, monaco = (typeof window !== 'undefined' ? window.monaco : null)) {
    this.doc = ytext.doc;
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    this.editors = editors;
    this.monaco = monaco || (typeof window !== 'undefined' ? window.monaco : null);
    this.awareness = awareness;
    this.mux = createMutex();
    this._isApplyingRemote = false;
    this._savedSelections = new Map();
    this._decorations = new Map();
    this._editorDisposables = [];

    // Preserve local selection across incoming remote transactions
    this._beforeTransaction = () => {
      this.mux(() => {
        this._savedSelections = new Map();
        editors.forEach((editor) => {
          if (editor.getModel() === monacoModel) {
            const rsel = createRelativeSelection(editor, monacoModel, ytext);
            if (rsel !== null) {
              this._savedSelections.set(editor, rsel);
            }
          }
        });
      });
    };
    this.doc.on('beforeAllTransactions', this._beforeTransaction);

    // Render remote peer cursors and selections
    this._rerenderDecorations = () => {
      editors.forEach((editor) => {
        if (!this.awareness || editor.getModel() !== monacoModel) {
          this._decorations.delete(editor);
          return;
        }

        const currentDecorations = this._decorations.get(editor) || [];
        const newDecorations = [];
        const localClientId = this.awareness.clientID;
        const activeClientIds = new Set(Array.from(this.awareness.getStates().keys()));

        // Clean up orphan styles for clients who disconnected
        document.querySelectorAll("style[id^='y-cursor-style-']").forEach((el) => {
          const rawId = el.id.replace('y-cursor-style-', '');
          const numId = Number(rawId);
          if (!activeClientIds.has(numId) || numId === localClientId) {
            el.remove();
          }
        });

        this.awareness.getStates().forEach((state, clientID) => {
          // Strictly skip local client's own cursor
          if (clientID === localClientId || clientID === this.doc.clientID) {
            return;
          }

          if (
            !state ||
            !state.selection ||
            state.selection.anchor == null ||
            state.selection.head == null
          ) {
            return;
          }

          const anchorAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.anchor, this.doc);
          const headAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.head, this.doc);

          if (anchorAbs !== null && headAbs !== null && anchorAbs.type === ytext && headAbs.type === ytext) {
            const user = state.user || {};
            const color = user.color || '#38bdf8';
            const name = user.name || 'Collaborator';

            // Inject or update dynamic peer CSS style
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

            let start, end, afterContentClassName, beforeContentClassName;
            if (anchorAbs.index < headAbs.index) {
              start = monacoModel.getPositionAt(anchorAbs.index);
              end = monacoModel.getPositionAt(headAbs.index);
              afterContentClassName = `yRemoteSelectionHead yRemoteSelectionHead-${clientID}`;
              beforeContentClassName = null;
            } else {
              start = monacoModel.getPositionAt(headAbs.index);
              end = monacoModel.getPositionAt(anchorAbs.index);
              afterContentClassName = null;
              beforeContentClassName = `yRemoteSelectionHead yRemoteSelectionHead-${clientID}`;
            }

            const RangeClass = this.monaco?.Range || (typeof window !== 'undefined' ? window.monaco?.Range : null);
            const range = RangeClass
              ? new RangeClass(start.lineNumber, start.column, end.lineNumber, end.column)
              : { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column };

            const stickiness = this.monaco?.editor?.TrackedRangeStickiness?.NeverGrowsWhenTypingAtEdges ?? 1;

            newDecorations.push({
              range,
              options: {
                className: `yRemoteSelection yRemoteSelection-${clientID}`,
                afterContentClassName,
                beforeContentClassName,
                stickiness
              }
            });
          }
        });

        this._decorations.set(editor, editor.deltaDecorations(currentDecorations, newDecorations));
      });
    };

    // Apply remote CRDT changes to Monaco without moving local user's cursor
    this._ytextObserver = (event) => {
      if (event.transaction.origin === this) return;
      this._isApplyingRemote = true;
      try {
        this.mux(() => {
          let index = 0;
          event.delta.forEach((op) => {
            if (op.retain !== undefined) {
              index += op.retain;
            } else if (op.insert !== undefined) {
              const pos = monacoModel.getPositionAt(index);
              const RangeClass = this.monaco?.Range || (typeof window !== 'undefined' ? window.monaco?.Range : null);
              const range = RangeClass
                ? new RangeClass(pos.lineNumber, pos.column, pos.lineNumber, pos.column)
                : { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column };
              const insert = op.insert;
              monacoModel.applyEdits([{ range, text: insert, forceMoveMarkers: true }]);
              index += insert.length;
            } else if (op.delete !== undefined) {
              const pos = monacoModel.getPositionAt(index);
              const endPos = monacoModel.getPositionAt(index + op.delete);
              const RangeClass = this.monaco?.Range || (typeof window !== 'undefined' ? window.monaco?.Range : null);
              const range = RangeClass
                ? new RangeClass(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column)
                : { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: endPos.lineNumber, endColumn: endPos.column };
              monacoModel.applyEdits([{ range, text: '' }]);
            }
          });

          // Restore and anchor local user's own cursor selection
          this._savedSelections.forEach((rsel, editor) => {
            const sel = createMonacoSelectionFromRelativeSelection(editor, ytext, rsel, this.doc, this.monaco);
            if (sel !== null) {
              editor.setSelection(sel);
            }
          });
        });
      } finally {
        this._isApplyingRemote = false;
      }
      this._rerenderDecorations();
    };
    ytext.observe(this._ytextObserver);

    // Initial value alignment
    const ytextValue = ytext.toString();
    if (monacoModel.getValue() !== ytextValue) {
      monacoModel.setValue(ytextValue);
    }

    // Capture local typing into Yjs CRDT
    this._monacoChangeHandler = monacoModel.onDidChangeContent((event) => {
      this.mux(() => {
        this.doc.transact(() => {
          event.changes.sort((a, b) => b.rangeOffset - a.rangeOffset).forEach((change) => {
            ytext.delete(change.rangeOffset, change.rangeLength);
            ytext.insert(change.rangeOffset, change.text);
          });
        }, this);
      });
    });

    this._monacoDisposeHandler = monacoModel.onWillDispose(() => {
      this.destroy();
    });

    // Capture local cursor/selection changes and broadcast to awareness
    if (awareness) {
      const broadcastSelection = () => {
        // Prevent broadcasting intermediate cursor jumps while applying remote updates
        if (this._isApplyingRemote) return;

        editors.forEach((editor) => {
          if (editor.getModel() === monacoModel) {
            const sel = editor.getSelection();
            if (sel === null) return;

            let anchor = monacoModel.getOffsetAt(sel.getStartPosition());
            let head = monacoModel.getOffsetAt(sel.getEndPosition());

            const isRTL = sel.getDirection?.() === 1 ||
              (this.monaco?.SelectionDirection && sel.getDirection?.() === this.monaco.SelectionDirection.RTL);

            if (isRTL) {
              const tmp = anchor;
              anchor = head;
              head = tmp;
            }

            awareness.setLocalStateField('selection', {
              anchor: Y.createRelativePositionFromTypeIndex(ytext, anchor),
              head: Y.createRelativePositionFromTypeIndex(ytext, head)
            });
          }
        });
      };

      editors.forEach((editor) => {
        const disposable = editor.onDidChangeCursorSelection(broadcastSelection);
        this._editorDisposables.push(disposable);
      });

      // Broadcast initial cursor position right away
      setTimeout(broadcastSelection, 100);

      this._awarenessChangeHandler = () => {
        this._rerenderDecorations();
      };
      awareness.on('change', this._awarenessChangeHandler);
    }
  }

  destroy() {
    this._editorDisposables.forEach((disp) => disp?.dispose?.());
    this._editorDisposables = [];
    this._monacoChangeHandler?.dispose();
    this._monacoDisposeHandler?.dispose();
    this.ytext.unobserve(this._ytextObserver);
    this.doc.off('beforeAllTransactions', this._beforeTransaction);
    if (this.awareness && this._awarenessChangeHandler) {
      this.awareness.off('change', this._awarenessChangeHandler);
    }
    document.querySelectorAll("style[id^='y-cursor-style-']").forEach((el) => el.remove());
    this.editors.forEach((editor) => {
      const decs = this._decorations.get(editor);
      if (decs) {
        editor.deltaDecorations(decs, []);
      }
    });
    this._decorations.clear();
  }
}
