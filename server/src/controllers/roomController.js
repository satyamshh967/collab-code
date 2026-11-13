import { roomManager } from '../models/Room.js';
import { generateId, sanitizeInput } from '../utils/helpers.js';
import { DEFAULT_SNIPPETS } from '../utils/defaultSnippets.js';

export const getRooms = (req, res) => {
  try {
    const rooms = roomManager.getAll().map(room => ({
      id: room.id,
      name: room.name,
      language: room.language,
      usersCount: room.users.size,
      isInterviewRoom: room.isInterviewRoom,
      createdAt: room.createdAt
    }));
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRoom = (req, res) => {
  try {
    const { name, language, isInterview, isInterviewRoom } = req.body;
    const isInterviewMode = Boolean(isInterviewRoom ?? isInterview ?? false);
    const safeName = sanitizeInput(name).slice(0, 64) || 'Untitled Room';
    const safeLanguage = Object.hasOwn(DEFAULT_SNIPPETS, language) ? language : 'javascript';
    const roomId = generateId();
    // interviewConfig is not accepted from clients: it is server-controlled state
    const room = roomManager.create(roomId, safeName, safeLanguage, isInterviewMode);
    
    res.status(201).json({
      id: room.id,
      roomId: room.id,
      name: room.name,
      language: room.language,
      isInterviewRoom: room.isInterviewRoom
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
};

export const getRoom = (req, res) => {
  try {
    const { id } = req.params;
    const room = roomManager.findById(id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.status(200).json({
      id: room.id,
      name: room.name,
      language: room.language,
      usersCount: room.users.size,
      isInterviewRoom: room.isInterviewRoom,
      createdAt: room.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinRoom = (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    
    const room = roomManager.findById(id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.status(200).json({ message: 'Room exists, proceed to socket connection' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRoom = (req, res) => {
  try {
    const { id } = req.params;
    const deleted = roomManager.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
