import express from 'express';
import { getRooms, createRoom, getRoom, joinRoom, deleteRoom } from '../controllers/roomController.js';
import { validateRoomCreation, validateJoinRoom } from '../middleware/validation.js';

const router = express.Router();

router.get('/', getRooms);
router.post('/', validateRoomCreation, createRoom);
router.post('/create', validateRoomCreation, createRoom);
router.get('/:id', getRoom);
router.post('/:id/join', validateJoinRoom, joinRoom);
router.delete('/:id', deleteRoom);

export default router;
