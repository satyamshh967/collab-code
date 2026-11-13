import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { executeCode } from './runners/index.js';
import { validateCode } from './sandbox/securityPolicy.js';
import { startExecutionWorker } from './worker/executionWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'execution-service' });
});

// Direct execution endpoint (fallback / synchronous proxy)
app.post('/execute', async (req, res) => {
  const { code, language, stdin = '' } = req.body || {};

  if (typeof code !== 'string' || !code || typeof language !== 'string' || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  const securityCheck = validateCode(code, language);
  if (!securityCheck.valid) {
    return res.status(400).json({ error: `Security validation failed: ${securityCheck.reason}` });
  }

  try {
    const result = await executeCode(language, code, typeof stdin === 'string' ? stdin : '');
    res.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ error: 'Internal server error during execution' });
  }
});

// Start BullMQ asynchronous worker
startExecutionWorker();

app.listen(PORT, () => {
  console.log(`Execution service listening on port ${PORT}`);
});
