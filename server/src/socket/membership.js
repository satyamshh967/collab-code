import { roomManager } from '../models/Room.js';
import { userManager } from '../models/User.js';

/**
 * Resolve the calling socket's user and room, but only if the socket actually
 * joined `roomId`. Prevents a client from acting on rooms it isn't in just by
 * knowing (or guessing) the room ID.
 */
export const getMembership = (socket, roomId) => {
  const user = userManager.getUser(socket.id);
  if (!user || user.roomId !== roomId) return null;
  const room = roomManager.findById(roomId);
  if (!room) return null;
  return { user, room };
};
