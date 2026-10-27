import express from 'express';
import { executeCode, checkJobStatus } from '../controllers/executeController.js';

const router = express.Router();

router.post('/', executeCode);
router.get('/status/:jobId', checkJobStatus);

export default router;
