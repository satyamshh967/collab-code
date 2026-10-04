import axios from 'axios';
import { config } from '../config/index.js';

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'c', 'go', 'rust'];

export const executeCode = async (req, res) => {
  try {
    const { code, language, roomId } = req.body;

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: `Language ${language} is not supported` });
    }

    const response = await axios.post(`${config.executionServiceUrl}/api/execute`, {
      code,
      language,
      roomId
    }, {
      timeout: 30000 // 30 second max
    });

    res.status(200).json(response.data);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ error: 'Execution timeout (30s)' });
    }
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    console.error('Execution service error:', error.message);
    res.status(500).json({ error: 'Failed to execute code' });
  }
};
