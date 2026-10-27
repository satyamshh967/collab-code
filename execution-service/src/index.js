import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { executeJava } from './runners/javaRunner.js';
import { executePython } from './runners/pythonRunner.js';
import { executeJavascript } from './runners/javascriptRunner.js';
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
  const { code, language, stdin = '' } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  const securityCheck = validateCode(code, language);
  if (!securityCheck.valid) {
    return res.status(400).json({ error: `Security validation failed: ${securityCheck.reason}` });
  }

  try {
    let result;
    switch (language.toLowerCase()) {
      case 'java':
        result = await executeJava(code, stdin);
        break;
      case 'python':
      case 'py':
        result = await executePython(code, stdin);
        break;
      case 'javascript':
      case 'js':
        result = await executeJavascript(code, stdin);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported language' });
    }

    res.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ error: 'Internal server error during execution', details: error.message });
  }
});

// Start BullMQ asynchronous worker
startExecutionWorker();

app.listen(PORT, () => {
  console.log(`Execution service listening on port ${PORT}`);
});
