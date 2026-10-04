import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 3001,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  executionServiceUrl: process.env.EXECUTION_SERVICE_URL || 'http://localhost:3002',
  nodeEnv: process.env.NODE_ENV || 'development',
};
