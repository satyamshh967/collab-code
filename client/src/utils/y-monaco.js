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
    this.mux = createMutex();
    this._savedSelections = new Map();

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

    this._decorations = new Map();
    this._rerenderDecorations = () => {
      editors.forEach((editor) => {
        if (awareness && editor.getModel() === monacoModel) {
          const currentDecorations = this._decorations.get(editor) || [];
          const newDecorations = [];

          awareness.getStates().forEach((state, clientID) => {
            if (
              clientID !== this.doc.clientID &&
              state.selection != null &&
              state.selection.anchor != null &&
              state.selection.head != null
            ) {
              const anchorAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.anchor, this.doc);
              const headAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.head, this.doc);

              if (anchorAbs !== null && headAbs !== null && anchorAbs.type === ytext && headAbs.type === ytext) {
                let start, end, afterContentClassName, beforeContentClassName;
                const user = state.user || {};
                const color = user.color || '#3b82f6';
                const name = user.name || 'User';

                // Inject user cursor style dynamically
                const styleId = `y-cursor-${clientID}`;
                if (!document.getElementById(styleId)) {
                  const style = document.createElement('style');
                  style.id = styleId;
                  style.textContent = `
                    .yRemoteSelection-${clientID} {
                      background-color: ${color}33;
                    }
                    .yRemoteSelectionHead-${clientID} {
                      position: absolute;
                      border-left: 2px solid ${color};
                      height: 100%;
                    }
                    .yRemoteSelectionHead-${clientID}::after {
                      position: absolute;
                      content: "${name}";
                      top: -1.3em;
                      left: -2px;
                      font-size: 10px;
                      font-weight: 600;
                      color: #fff;
                      background-color: ${color};
                      padding: 1px 5px;
                      border-radius: 3px;
                      white-space: nowrap;
                      pointer-events: none;
                      z-index: 100;
                    }
                  `;
                  document.head.appendChild(style);
                }

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

                newDecorations.push({
                  range: new this.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                  options: {
                    className: `yRemoteSelection yRemoteSelection-${clientID}`,
                    afterContentClassName,
                    beforeContentClassName
                  }
                });
              }
            }
          });

          this._decorations.set(editor, editor.deltaDecorations(currentDecorations, newDecorations));
        } else {
          this._decorations.delete(editor);
        }
      });
    };

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

    const ytextValue = ytext.toString();
    if (monacoModel.getValue() !== ytextValue) {
      monacoModel.setValue(ytextValue);
    }

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
        awareness.on('change', this._rerenderDecorations);
      });
      this.awareness = awareness;
    }
  }

  destroy() {
    this._monacoChangeHandler?.dispose();
    this._monacoDisposeHandler?.dispose();
    this.ytext.unobserve(this._ytextObserver);
    this.doc.off('beforeAllTransactions', this._beforeTransaction);
    if (this.awareness) {
      this.awareness.off('change', this._rerenderDecorations);
    }
  }
}
