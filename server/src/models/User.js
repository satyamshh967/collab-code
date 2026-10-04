class User {
  constructor(id, username, color, socketId, roomId, isOwner = false) {
    this.id = id;
    this.username = username;
    this.color = color;
    this.socketId = socketId;
    this.roomId = roomId;
    this.cursorPosition = { line: 0, ch: 0 };
    this.isOwner = isOwner;
  }
}

class UserManager {
  constructor() {
    this.users = new Map();
  }

  addUser(user) {
    this.users.set(user.socketId, user);
    return user;
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
    }
    return user;
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  getUsersInRoom(roomId) {
    return Array.from(this.users.values()).filter((u) => u.roomId === roomId);
  }
}

export const userManager = new UserManager();
export default User;
