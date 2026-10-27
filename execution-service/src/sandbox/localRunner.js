import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_OUTPUT_BYTES = 512 * 1024; // 512 KB
const TIMEOUT_MS = 5000;              // 5 seconds

export const runLocalSandbox = async (language, code, stdin = '', onChunk = null) => {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-run-'));

  try {
    let executable = '';
    let args = [];
    let filename = '';

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        filename = path.join(tempDir, 'main.js');
        fs.writeFileSync(filename, code, 'utf8');
        executable = process.platform === 'win32' ? 'node.exe' : 'node';
        args = ['--max-old-space-size=128', filename];
        break;

      case 'python':
      case 'py':
        filename = path.join(tempDir, 'main.py');
        fs.writeFileSync(filename, code, 'utf8');
        executable = process.platform === 'win32' ? 'python.exe' : 'python3';
        args = ['-u', filename];
        break;

      case 'java':
        filename = path.join(tempDir, 'Main.java');
        fs.writeFileSync(filename, code, 'utf8');
        executable = process.platform === 'win32' ? 'java.exe' : 'java';
        args = ['-Xmx128m', filename];
        break;

      default:
        throw new Error(`Unsupported fallback execution language: ${language}`);
    }

    return await new Promise((resolve) => {
      let output = '';
      let error = '';
      let outputSize = 0;
      let outputTruncated = false;
      let isTimeout = false;

      const child = spawn(executable, args, {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'sandbox' },
        windowsHide: true
      });

      const timer = setTimeout(() => {
        isTimeout = true;
        try {
          child.kill('SIGKILL');
        } catch (e) {}
      }, TIMEOUT_MS);

      if (stdin && child.stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }

      child.stdout.on('data', (chunk) => {
        if (outputTruncated) return;

        const text = chunk.toString('utf8');
        if (outputSize + chunk.length >= MAX_OUTPUT_BYTES) {
          const remaining = Math.max(0, MAX_OUTPUT_BYTES - outputSize);
          output += text.slice(0, remaining);
          output += '\n[Output truncated: exceeded 512KB limit to prevent memory exhaustion]';
          outputTruncated = true;
          try {
            child.kill('SIGKILL');
          } catch (e) {}
        } else {
          output += text;
          outputSize += chunk.length;
          if (onChunk) onChunk({ chunk: text, type: 'stdout' });
        }
      });

      child.stderr.on('data', (chunk) => {
        if (outputTruncated) return;
        const text = chunk.toString('utf8');
        error += text;
        if (onChunk) onChunk({ chunk: text, type: 'stderr' });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          output: output.trim(),
          error: isTimeout ? 'Execution timed out (strictly terminated after 5 seconds)' : error.trim(),
          exitCode: isTimeout ? 124 : (outputTruncated ? 0 : (code ?? 0)),
          executionTime: Date.now() - startTime
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          output: output.trim(),
          error: `Process error: ${err.message}`,
          exitCode: -1,
          executionTime: Date.now() - startTime
        });
      });
    });
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
};
