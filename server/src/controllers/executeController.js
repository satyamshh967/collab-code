import { sanitizeInput } from '../utils/helpers.js';
import { enqueueExecution, getJobStatus } from '../queue/executionQueue.js';

// Only languages the execution service can actually run. Keep in sync with
// execution-service/src/sandbox/securityPolicy.js
const LANGUAGE_ALIASES = { javascript: 'javascript', js: 'javascript', python: 'python', py: 'python', java: 'java' };
const MAX_CODE_LENGTH = 50000;
const MAX_STDIN_LENGTH = 64 * 1024;

/**
 * Enqueue code execution job asynchronously
 */
export const executeCode = async (req, res) => {
  try {
    const { code, language, stdin = '', roomId = null, userId = null, runBy = null } = req.body || {};

    if (typeof code !== 'string' || !code.trim() || typeof language !== 'string' || !language) {
      return res.status(400).json({ error: 'Code and language are required fields' });
    }

    const normalizedLanguage = LANGUAGE_ALIASES[language.trim().toLowerCase()];
    if (!normalizedLanguage) {
      return res.status(400).json({ error: `Running '${language}' code is not supported yet` });
    }

    if (code.length > MAX_CODE_LENGTH) {
      return res.status(413).json({ error: `Code exceeds the ${MAX_CODE_LENGTH} character limit` });
    }

    if (typeof stdin !== 'string' || stdin.length > MAX_STDIN_LENGTH) {
      return res.status(400).json({ error: 'stdin must be a string of at most 64 KB' });
    }

    const safeRoomId = typeof roomId === 'string' && roomId ? roomId : null;
    const safeRunBy = sanitizeInput(typeof runBy === 'string' ? runBy : '').slice(0, 32) || null;
    const roomChannel = req.io && safeRoomId ? req.io.to(safeRoomId) : null;

    const job = await enqueueExecution({
      code,
      language: normalizedLanguage,
      stdin,
      roomId: safeRoomId,
      userId: typeof userId === 'string' ? userId : null,
      // Standalone mode (no Redis worker): broadcast progress to the room
      // directly so collaborators see the run, not just the person polling.
      onEvent: roomChannel
        ? (type, data) => roomChannel.emit(`execution:${type}`, data)
        : null
    });

    // Notify room that execution has been triggered
    if (roomChannel) {
      roomChannel.emit('execution:status', {
        jobId: job.jobId,
        status: 'queued',
        language: normalizedLanguage,
        roomId: safeRoomId,
        runBy: safeRunBy
      });
    }

    return res.status(202).json({
      jobId: job.jobId,
      status: job.status,
      message: 'Code execution job queued successfully'
    });
  } catch (error) {
    console.error('Execute code error:', error.message);
    return res.status(500).json({ error: 'Failed to queue code execution' });
  }
};

/**
 * Poll job status and output
 */
export const checkJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json(status);
  } catch (error) {
    console.error('Check job status error:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve job status' });
  }
};
