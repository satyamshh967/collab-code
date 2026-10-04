import { DockerManager } from '../sandbox/dockerManager.js';
import { v4 as uuidv4 } from 'uuid';

const dockerManager = new DockerManager();

export const executeJava = async (code, stdin) => {
  const startTime = Date.now();
  const containerId = `java-runner-${uuidv4()}`;
  const className = extractClassName(code) || 'Main';
  
  try {
    // Escape single quotes for shell execution
    const escapedCode = code.replace(/'/g, "'\\''");
    
    // Command to write code, compile, and run
    const cmd = [
      'sh', '-c',
      `echo '${escapedCode}' > ${className}.java && javac ${className}.java && java ${className}`
    ];

    const { output, error, exitCode } = await dockerManager.runInSandbox(
      'collab-java-runner',
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
      error: err.message || 'Failed to execute Java code',
      exitCode: -1,
      executionTime: Date.now() - startTime
    };
  }
};

function extractClassName(code) {
  const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
  return match ? match[1] : null;
}
