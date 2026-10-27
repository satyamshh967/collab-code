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
    const startPos = model.getPositionAt(start.index);
    const endPos = model.getPositionAt(end.index);
    return new monaco.Selection(
      startPos.lineNumber,
      startPos.column,
      endPos.lineNumber,
      endPos.column
    );
  }
  return null;
};

export class MonacoBinding {
  constructor(ytext, monacoModel, editors = new Set(), awareness = null, monaco = window.monaco) {
    this.doc = ytext.doc;
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    this.editors = editors;
    this.monaco = monaco;
    this.awareness = awareness;
    this.mux = createMutex();
    this._savedSelections = new Map();
    this._decorations = new Map();

    // Preserve selection across remote transactions
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

        this.awareness.getStates().forEach((state, clientID) => {
          // Strictly skip local client's own cursor!
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
            const color = user.color || '#3b82f6';
            const name = user.name || 'User';

            // Inject CSS styles for remote peer cursor & selection
            const styleId = `y-cursor-style-${clientID}`;
            if (!document.getElementById(styleId)) {
              const style = document.createElement('style');
              style.id = styleId;
              style.textContent = `
                .yRemoteSelection-${clientID} {
                  background-color: ${color}33 !important;
                }
                .yRemoteCursorHead-${clientID} {
                  border-left: 2px solid ${color} !important;
                  margin-left: -1px;
                }
                .yRemoteCursorLabel-${clientID} {
                  background-color: ${color} !important;
                  color: #ffffff !important;
                  font-size: 10px !important;
                  font-weight: 600 !important;
                  padding: 1px 4px !important;
                  border-radius: 3px !important;
                  margin-left: 2px !important;
                  white-space: nowrap !important;
                  user-select: none !important;
                  pointer-events: none !important;
                  vertical-align: top !important;
                  display: inline-block !important;
                  line-height: 1.2 !important;
                  position: relative !important;
                  top: -0.6em !important;
                  z-index: 50 !important;
                }
              `;
              document.head.appendChild(style);
            }

            const posAnchor = monacoModel.getPositionAt(anchorAbs.index);
            const posHead = monacoModel.getPositionAt(headAbs.index);

            // Remote selection highlight (when text is highlighted)
            if (anchorAbs.index !== headAbs.index) {
              const start = anchorAbs.index < headAbs.index ? posAnchor : posHead;
              const end = anchorAbs.index < headAbs.index ? posHead : posAnchor;
              newDecorations.push({
                range: new this.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                options: {
                  className: `yRemoteSelection-${clientID}`,
                  stickiness: this.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
              });
            }

            // Remote cursor caret & username badge
            newDecorations.push({
              range: new this.monaco.Range(posHead.lineNumber, posHead.column, posHead.lineNumber, posHead.column),
              options: {
                className: `yRemoteCursor-${clientID}`,
                before: {
                  content: '\uFEFF',
                  inlineClassName: `yRemoteCursorHead-${clientID}`
                },
                after: {
                  content: ` ${name} `,
                  inlineClassName: `yRemoteCursorLabel-${clientID}`
                },
                stickiness: this.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
              }
            });
          }
        });

        this._decorations.set(editor, editor.deltaDecorations(currentDecorations, newDecorations));
      });
    };

    // Apply remote CRDT changes to Monaco
    this._ytextObserver = (event) => {
      this.mux(() => {
        let index = 0;
        event.delta.forEach((op) => {
          if (op.retain !== undefined) {
            index += op.retain;
          } else if (op.insert !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const range = new this.monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
            const insert = op.insert;
            monacoModel.applyEdits([{ range, text: insert }]);
            index += insert.length;
          } else if (op.delete !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const endPos = monacoModel.getPositionAt(index + op.delete);
            const range = new this.monaco.Range(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column);
            monacoModel.applyEdits([{ range, text: '' }]);
          }
        });

        this._savedSelections.forEach((rsel, editor) => {
          const sel = createMonacoSelectionFromRelativeSelection(editor, ytext, rsel, this.doc, this.monaco);
          if (sel !== null) {
            editor.setSelection(sel);
          }
        });
      });
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
      editors.forEach((editor) => {
        editor.onDidChangeCursorSelection(() => {
          if (editor.getModel() === monacoModel) {
            const sel = editor.getSelection();
            if (sel === null) return;

            let anchor = monacoModel.getOffsetAt(sel.getStartPosition());
            let head = monacoModel.getOffsetAt(sel.getEndPosition());

            awareness.setLocalStateField('selection', {
              anchor: Y.createRelativePositionFromTypeIndex(ytext, anchor),
              head: Y.createRelativePositionFromTypeIndex(ytext, head)
            });
          }
        });
      });

      this._awarenessChangeHandler = () => {
        this._rerenderDecorations();
      };
      awareness.on('change', this._awarenessChangeHandler);
    }
  }

  destroy() {
    this._monacoChangeHandler?.dispose();
    this._monacoDisposeHandler?.dispose();
    this.ytext.unobserve(this._ytextObserver);
    this.doc.off('beforeAllTransactions', this._beforeTransaction);
    if (this.awareness && this._awarenessChangeHandler) {
      this.awareness.off('change', this._awarenessChangeHandler);
    }
  }
}
