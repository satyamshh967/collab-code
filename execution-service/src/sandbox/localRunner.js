import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { normalizeLanguage } from './securityPolicy.js';

export const MAX_OUTPUT_BYTES = 512 * 1024; // 512 KB across stdout + stderr
export const TIMEOUT_MS = 5000;              // 5 seconds
const TRUNCATION_NOTICE = '\n[Output truncated: exceeded 512KB limit to prevent memory exhaustion]';

// Only these variables are forwarded to user code. Everything else (Redis URLs,
// API keys, cloud credentials...) stays out of the sandboxed process.
const ENV_ALLOWLIST = [
  'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC',
  'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'LANG', 'LC_ALL', 'JAVA_HOME'
];

const buildSandboxEnv = (tempDir) => {
  const env = {};
  for (const key of ENV_ALLOWLIST) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.NODE_ENV = 'sandbox';
  env.PYTHONIOENCODING = 'utf-8';
  env.PYTHONDONTWRITEBYTECODE = '1';
  env.HOME = tempDir;
  return env;
};

const resolveCommand = (language, tempDir, code) => {
  switch (language) {
    case 'javascript': {
      const filename = path.join(tempDir, 'main.js');
      fs.writeFileSync(filename, code, 'utf8');
      // Use the exact Node binary running this service rather than whatever is on PATH
      return { executable: process.execPath, args: ['--max-old-space-size=128', filename] };
    }
    case 'python': {
      const filename = path.join(tempDir, 'main.py');
      fs.writeFileSync(filename, code, 'utf8');
      return { executable: process.platform === 'win32' ? 'python' : 'python3', args: ['-u', filename] };
    }
    case 'java': {
      const filename = path.join(tempDir, 'Main.java');
      fs.writeFileSync(filename, code, 'utf8');
      return { executable: 'java', args: ['-Xmx128m', filename] };
    }
    default:
      throw new Error(`Unsupported fallback execution language: ${language}`);
  }
};

export const runLocalSandbox = async (language, code, stdin = '', onChunk = null) => {
  const startTime = Date.now();
  const lang = normalizeLanguage(language);
  if (!lang) {
    throw new Error(`Unsupported fallback execution language: ${language}`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-run-'));

  try {
    const { executable, args } = resolveCommand(lang, tempDir, code);

    return await new Promise((resolve) => {
      let output = '';
      let error = '';
      let totalBytes = 0;
      let outputTruncated = false;
      let isTimeout = false;
      let settled = false;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ...result, executionTime: Date.now() - startTime });
      };

      const child = spawn(executable, args, {
        cwd: tempDir,
        env: buildSandboxEnv(tempDir),
        windowsHide: true
      });

      const timer = setTimeout(() => {
        isTimeout = true;
        try { child.kill('SIGKILL'); } catch (e) {}
      }, TIMEOUT_MS);

      // Always close stdin so programs that read input see EOF instead of hanging
      child.stdin.on('error', () => {}); // EPIPE if the child exits before reading
      if (stdin) child.stdin.write(stdin);
      child.stdin.end();

      const capture = (type) => (chunk) => {
        if (outputTruncated) return;

        let text = chunk.toString('utf8');
        if (totalBytes + chunk.length > MAX_OUTPUT_BYTES) {
          text = chunk.subarray(0, Math.max(0, MAX_OUTPUT_BYTES - totalBytes)).toString('utf8');
          outputTruncated = true;
          try { child.kill('SIGKILL'); } catch (e) {}
        }
        totalBytes += Buffer.byteLength(text, 'utf8');

        if (type === 'stdout') output += text;
        else error += text;

        if (outputTruncated) {
          output += TRUNCATION_NOTICE;
        }
        if (onChunk && text) onChunk({ chunk: text, type });
      };

      child.stdout.on('data', capture('stdout'));
      child.stderr.on('data', capture('stderr'));

      child.on('close', (exitCode) => {
        finish({
          output: output.trim(),
          error: isTimeout
            ? `Execution timed out (strictly terminated after ${TIMEOUT_MS / 1000} seconds)`
            : error.trim(),
          exitCode: isTimeout ? 124 : (outputTruncated ? 0 : (exitCode ?? 0))
        });
      });

      child.on('error', (err) => {
        const hint = err.code === 'ENOENT' ? ` (is '${executable}' installed and on PATH?)` : '';
        finish({
          output: output.trim(),
          error: `Process error: ${err.message}${hint}`,
          exitCode: -1
        });
      });
    });
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
};
