import { formatTimestamp } from '../utils/helpers.js';

const DEFAULT_INTERVIEW_MS = 45 * 60 * 1000;
const MAX_INTERVIEW_MS = 3 * 60 * 60 * 1000;

class Room {
  constructor(id, name, language, isInterviewRoom = false, interviewConfig = null) {
    this.id = id;
    this.name = name;
    this.language = language || 'javascript';
    this.code = '';
    this.users = new Map(); // socketId -> user
    this.chatMessages = [];
    this.createdAt = formatTimestamp();
    this.createdBy = null;
    this.isInterviewRoom = isInterviewRoom;
    this.interviewConfig = interviewConfig || {
      interviewer: null,
      candidate: null,
      timeLimit: 0,
      startedAt: null
    };
    // Shared interview clock. Every client derives "time left" from these
    // server timestamps, so all participants see the same countdown.
    this.interview = isInterviewRoom
      ? { startedAt: null, durationMs: DEFAULT_INTERVIEW_MS, endedAt: null }
      : null;
  }

  /** Start the interview clock when the first participant arrives. */
  ensureInterviewStarted() {
    if (this.interview && !this.interview.startedAt) {
      this.interview.startedAt = Date.now();
    }
  }

  extendInterview(ms) {
    if (!this.interview || this.interview.endedAt) return false;
    this.interview.durationMs = Math.min(this.interview.durationMs + ms, MAX_INTERVIEW_MS);
    return true;
  }

  endInterview() {
    if (!this.interview || this.interview.endedAt) return false;
    this.interview.endedAt = Date.now();
    return true;
  }

  addUser(user) {
    this.users.set(user.socketId, user);
    if (this.users.size === 1) {
      if (!this.createdBy) this.createdBy = user.id;
      user.isOwner = true;
    }
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    this.users.delete(socketId);
    // Hand ownership to the longest-present remaining user
    if (user?.isOwner && this.users.size > 0) {
      const [nextOwner] = this.users.values();
      nextOwner.isOwner = true;
    }
    return user;
  }

  updateCode(code) {
    this.code = code;
  }

  addChatMessage(message) {
    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
  }

  setInterviewMode(config) {
    this.isInterviewRoom = true;
    this.interviewConfig = { ...this.interviewConfig, ...config };
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  create(id, name, language, isInterviewRoom, interviewConfig) {
    const room = new Room(id, name, language, isInterviewRoom, interviewConfig);
    this.rooms.set(id, room);
    return room;
  }

  findById(id) {
    return this.rooms.get(id);
  }

  getAll() {
    return Array.from(this.rooms.values());
  }

  delete(id) {
    return this.rooms.delete(id);
  }
}

export const roomManager = new RoomManager();
export default Room;
