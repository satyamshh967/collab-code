import express from 'express';
import { executeCode } from '../controllers/executeController.js';
import { validateExecution } from '../middleware/validation.js';

const router = express.Router();

router.post('/', validateExecution, executeCode);

export default router;
