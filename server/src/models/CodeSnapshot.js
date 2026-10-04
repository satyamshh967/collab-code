import { generateId, formatTimestamp } from '../utils/helpers.js';

class CodeSnapshot {
  constructor(roomId, code, language, createdBy, label) {
    this.id = generateId();
    this.roomId = roomId;
    this.code = code;
    this.language = language;
    this.timestamp = formatTimestamp();
    this.createdBy = createdBy;
    this.label = label || `Snapshot ${this.timestamp}`;
  }
}

class SnapshotManager {
  constructor() {
    this.snapshots = new Map(); // roomId -> array of snapshots
  }

  addSnapshot(snapshot) {
    if (!this.snapshots.has(snapshot.roomId)) {
      this.snapshots.set(snapshot.roomId, []);
    }
    this.snapshots.get(snapshot.roomId).push(snapshot);
    return snapshot;
  }

  getSnapshots(roomId) {
    return this.snapshots.get(roomId) || [];
  }

  getSnapshot(roomId, snapshotId) {
    const roomSnapshots = this.snapshots.get(roomId);
    if (!roomSnapshots) return null;
    return roomSnapshots.find(s => s.id === snapshotId) || null;
  }
}

export const snapshotManager = new SnapshotManager();
export default CodeSnapshot;
