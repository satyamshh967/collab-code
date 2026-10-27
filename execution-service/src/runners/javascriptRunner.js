import { dockerManager } from '../sandbox/dockerManager.js';
import { runLocalSandbox } from '../sandbox/localRunner.js';

export const executeJavascript = async (code, stdin = '', onChunk = null) => {
  const startTime = Date.now();
  
  try {
    const isDocker = await dockerManager.isDockerAvailable();
    if (isDocker) {
      const escapedCode = code.replace(/'/g, "'\\''");
      const cmd = [
        'sh', '-c',
        `echo '${escapedCode}' > main.js && node main.js`
      ];

      const { output, error, exitCode } = await dockerManager.runInSandbox(
        'collab-node-runner',
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
    return await runLocalSandbox('javascript', code, stdin, onChunk);
  } catch (err) {
    return {
      output: '',
      error: err.message || 'Failed to execute JavaScript code',
      exitCode: -1,
      executionTime: Date.now() - startTime
    };
  }
};
