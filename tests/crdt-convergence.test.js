import test from 'node:test';
import assert from 'node:assert';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

test('CRDT: Concurrent typing convergence between multiple peers', async (t) => {
  await t.test('converges deterministically when peers insert simultaneously at index 0', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const textA = docA.getText('monaco');
    const textB = docB.getText('monaco');

    // Both start with a common base
    textA.insert(0, 'function calculate() {}\n');
    const baseUpdate = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, baseUpdate);

    assert.strictEqual(textA.toString(), textB.toString());

    // Peer A inserts a comment at index 0
    textA.insert(0, '// Author: Alice\n');

    // Peer B simultaneously inserts an import at index 0
    textB.insert(0, 'import { math } from "./math.js";\n');

    // Cross-sync updates
    const updateA = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB));
    const updateB = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA));

    Y.applyUpdate(docB, updateA);
    Y.applyUpdate(docA, updateB);

    // Verify mathematical CRDT convergence
    assert.strictEqual(textA.toString(), textB.toString(), 'Documents must converge to the exact same text');
    assert.ok(textA.toString().includes('calculate()'), 'Preserves base text');
    assert.ok(textA.toString().includes('Author: Alice'), 'Preserves Peer A edit');
    assert.ok(textA.toString().includes('import { math }'), 'Preserves Peer B edit');
  });

  await t.test('converges during interleaved concurrent deletions and insertions', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const textA = docA.getText('monaco');
    const textB = docB.getText('monaco');

    textA.insert(0, 'const total = items.reduce((acc, curr) => acc + curr, 0);');
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    // Peer A deletes part of the expression
    textA.delete(6, 5); // deletes 'total'
    textA.insert(6, 'sum');

    // Peer B modifies the end
    textB.delete(textB.length - 2, 1); // modifies initial value
    textB.insert(textB.length - 1, '100');

    // Exchange updates
    const updateA = Y.encodeStateAsUpdate(docA);
    const updateB = Y.encodeStateAsUpdate(docB);

    Y.applyUpdate(docB, updateA);
    Y.applyUpdate(docA, updateB);

    assert.strictEqual(textA.toString(), textB.toString(), 'Interleaved edits must converge identical text');
  });

  await t.test('awareness state accurately propagates cursor and user metadata', () => {
    const doc = new Y.Doc();
    const awarenessA = new awarenessProtocol.Awareness(doc);
    const awarenessB = new awarenessProtocol.Awareness(doc);

    awarenessA.setLocalStateField('user', {
      name: 'Satyam',
      color: '#0078d4',
      cursor: { lineNumber: 12, column: 5 }
    });

    const update = awarenessProtocol.encodeAwarenessUpdate(awarenessA, [doc.clientID]);
    awarenessProtocol.applyAwarenessUpdate(awarenessB, update, 'origin');

    const peerState = awarenessB.getStates().get(doc.clientID);
    assert.ok(peerState, 'Awareness state must be received by peer B');
    assert.strictEqual(peerState.user.name, 'Satyam');
    assert.strictEqual(peerState.user.color, '#0078d4');
    assert.deepStrictEqual(peerState.user.cursor, { lineNumber: 12, column: 5 });
  });
});
