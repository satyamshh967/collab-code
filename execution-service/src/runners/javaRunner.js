import { dockerManager } from '../sandbox/dockerManager.js';
import { runLocalSandbox } from '../sandbox/localRunner.js';

export const executeJava = async (code, stdin = '', onChunk = null) => {
  const startTime = Date.now();
  
  try {
    const isDocker = await dockerManager.isDockerAvailable();
    if (isDocker) {
      const escapedCode = code.replace(/'/g, "'\\''");
      const cmd = [
        'sh', '-c',
        `echo '${escapedCode}' > Main.java && javac Main.java && java Main`
      ];

      const { output, error, exitCode } = await dockerManager.runInSandbox(
        'collab-java-runner',
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
    return await runLocalSandbox('java', code, stdin, onChunk);
  } catch (err) {
    return {
      output: '',
      error: err.message || 'Failed to execute Java code',
      exitCode: -1,
      executionTime: Date.now() - startTime
    };
  }
};
