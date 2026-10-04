import { DockerManager } from '../sandbox/dockerManager.js';

const dockerManager = new DockerManager();

export const executePython = async (code, stdin) => {
  const startTime = Date.now();
  
  try {
    const escapedCode = code.replace(/'/g, "'\\''");
    
    const cmd = [
      'sh', '-c',
      `echo '${escapedCode}' > main.py && python3 main.py`
    ];

    const { output, error, exitCode } = await dockerManager.runInSandbox(
      'collab-python-runner',
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
      error: err.message || 'Failed to execute Python code',
      exitCode: -1,
      executionTime: Date.now() - startTime
    };
  }
};
