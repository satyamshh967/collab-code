import { DockerManager } from '../sandbox/dockerManager.js';

const dockerManager = new DockerManager();

export const executeJavascript = async (code, stdin) => {
  const startTime = Date.now();
  
  try {
    const escapedCode = code.replace(/'/g, "'\\''");
    
    const cmd = [
      'sh', '-c',
      `echo '${escapedCode}' > main.js && node main.js`
    ];

    const { output, error, exitCode } = await dockerManager.runInSandbox(
      'collab-node-runner',
      cmd,
      stdin
    );

    return {
      output,
      error,
      exitCode,
      executionTime: Date.now() - startTime
    };
  } catch (err) {
    return {
      output: '',
      error: err.message || 'Failed to execute JavaScript code',
      exitCode: -1,
      executionTime: Date.now() - startTime
    };
  }
};
