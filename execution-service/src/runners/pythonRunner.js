import { dockerManager } from '../sandbox/dockerManager.js';
import { runLocalSandbox } from '../sandbox/localRunner.js';

export const executePython = async (code, stdin = '', onChunk = null) => {
  const startTime = Date.now();
  
  try {
    const isDocker = await dockerManager.isDockerAvailable();
    if (isDocker) {
      const escapedCode = code.replace(/'/g, "'\\''");
      const cmd = [
        'sh', '-c',
        `echo '${escapedCode}' > main.py && python3 main.py`
      ];

      const { output, error, exitCode } = await dockerManager.runInSandbox(
        'collab-python-runner',
        cmd,
        stdin,
        onChunk
      );

      return {
        output,
        error,
        exitCode,
        executionTime: Date.now() - startTime
      };
    }

    // Secure local sandbox fallback
    return await runLocalSandbox('python', code, stdin, onChunk);
  } catch (err) {
    return {
      output: '',
      error: err.message || 'Failed to execute Python code',
      exitCode: -1,
      executionTime: Date.now() - startTime
    };
  }
};
