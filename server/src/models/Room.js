import { formatTimestamp } from '../utils/helpers.js';

class Room {
  constructor(id, name, language, isInterviewRoom = false, interviewConfig = null) {
    this.id = id;
    this.name = name;
    this.language = language || 'javascript';
    this.code = '';
    this.users = new Map(); // socketId -> user
    this.chatMessages = [];
    this.codeSnapshots = [];
    this.createdAt = formatTimestamp();
    this.createdBy = null;
    this.isInterviewRoom = isInterviewRoom;
    this.interviewConfig = interviewConfig || {
      interviewer: null,
      candidate: null,
      timeLimit: 0,
      startedAt: null
    };
  }

  addUser(user) {
    this.users.set(user.socketId, user);
    if (this.users.size === 1) {
      this.createdBy = user.id;
      user.isOwner = true;
    }
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    this.users.delete(socketId);
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

  addSnapshot(snapshot) {
    this.codeSnapshots.push(snapshot);
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
