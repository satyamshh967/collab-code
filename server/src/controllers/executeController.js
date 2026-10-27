import { enqueueExecution, getJobStatus } from '../queue/executionQueue.js';

const SUPPORTED_LANGUAGES = ['javascript', 'js', 'python', 'py', 'java', 'cpp', 'c', 'go', 'rust'];

/**
 * Enqueue code execution job asynchronously
 */
export const executeCode = async (req, res) => {
  try {
    const { code, language, stdin = '', roomId = null, userId = null } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required fields' });
    }

    if (!SUPPORTED_LANGUAGES.includes(language.toLowerCase())) {
      return res.status(400).json({ error: `Language '${language}' is not supported` });
    }

    const job = await enqueueExecution({
      code,
      language: language.toLowerCase(),
      stdin,
      roomId,
      userId
    });

    // Notify room that execution has been triggered
    if (req.io && roomId) {
      req.io.to(roomId).emit('execution:status', {
        jobId: job.jobId,
        status: 'queued',
        language,
        roomId
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
