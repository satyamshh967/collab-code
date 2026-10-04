import { roomManager } from '../models/Room.js';
import { generateId } from '../utils/helpers.js';

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
    const { name, language, isInterviewRoom, interviewConfig } = req.body;
    const roomId = generateId();
    const room = roomManager.create(roomId, name, language, isInterviewRoom, interviewConfig);
    
    res.status(201).json({
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
