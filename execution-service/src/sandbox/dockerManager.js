import Docker from 'dockerode';
import stream from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const MAX_OUTPUT_BYTES = 512 * 1024; // 512 KB strict buffer limit
const DEFAULT_TIMEOUT_MS = 5000;      // 5 seconds strict limit

export class DockerManager {
  constructor() {
    this.docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '//./pipe/docker_engine' });
    this.memoryLimit = 128 * 1024 * 1024; // 128 MB
    this.memorySwap = 128 * 1024 * 1024;  // 128 MB (0 swap)
    this.cpuQuota = 50000;                 // 0.5 CPU
    this.cpuPeriod = 100000;
    this.timeout = parseInt(process.env.EXECUTION_TIMEOUT || `${DEFAULT_TIMEOUT_MS}`, 10);
  }

  async isDockerAvailable() {
    try {
      await this.docker.ping();
      return true;
    } catch (e) {
      return false;
    }
  }

  async runInSandbox(image, cmd, stdinStr = '', onChunk = null) {
    let container = null;
    let timer = null;

    try {
      container = await this.docker.createContainer({
        Image: image,
        Cmd: cmd,
        Tty: false,
        OpenStdin: true,
        StdinOnce: true,
        HostConfig: {
          Memory: this.memoryLimit,
          MemorySwap: this.memorySwap,
          CpuQuota: this.cpuQuota,
          CpuPeriod: this.cpuPeriod,
          NetworkMode: 'none', // Strictly isolated from external network
          AutoRemove: false,
          SecurityOpt: ['no-new-privileges:true']
        }
      });

      await container.start();

      if (stdinStr) {
        try {
          const attachStream = await container.attach({ stream: true, stdin: true, stdout: false, stderr: false });
          attachStream.write(stdinStr);
          attachStream.end();
        } catch (e) {
          console.warn('[DockerManager] Stdin write error:', e.message);
        }
      }

      // Strict 5-second timeout promise
      let isTimeout = false;
      const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(async () => {
          isTimeout = true;
          try {
            await container.kill({ signal: 'SIGKILL' });
          } catch (e) {}
          resolve({ StatusCode: -1, Error: 'Execution timed out (5s limit)' });
        }, this.timeout);
      });

      const waitPromise = container.wait();
      const waitResult = await Promise.race([waitPromise, timeoutPromise]);
      clearTimeout(timer);

      // Stream logs and enforce output buffer limit
      const logs = await container.logs({ stdout: true, stderr: true });
      let output = '';
      let error = isTimeout ? 'Execution timed out (strictly terminated after 5 seconds)' : '';
      let outputSize = 0;
      let outputTruncated = false;

      const outStream = new stream.PassThrough();
      const errStream = new stream.PassThrough();

      outStream.on('data', (chunk) => {
        const text = chunk.toString('utf8');
        if (outputSize + chunk.length > MAX_OUTPUT_BYTES) {
          if (!outputTruncated) {
            output += text.slice(0, Math.max(0, MAX_OUTPUT_BYTES - outputSize));
            output += '\n[Output truncated: exceeded 512KB limit to prevent memory exhaustion]';
            outputTruncated = true;
          }
        } else {
          output += text;
          outputSize += chunk.length;
          if (onChunk) onChunk({ chunk: text, type: 'stdout' });
        }
      });

      errStream.on('data', (chunk) => {
        const text = chunk.toString('utf8');
        error += text;
        if (onChunk) onChunk({ chunk: text, type: 'stderr' });
      });

      this.parseLogs(logs, outStream, errStream);

      try {
        await container.remove({ force: true });
      } catch (e) {}

      return {
        output: output.trim(),
        error: error.trim(),
        exitCode: isTimeout ? 124 : (waitResult.StatusCode ?? 0)
      };
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (container) {
        try {
          await container.remove({ force: true });
        } catch (e) {}
      }
      throw err;
    }
  }

  parseLogs(buffer, outStream, errStream) {
    let offset = 0;
    while (offset < buffer.length) {
      if (offset + 8 > buffer.length) break;
      const type = buffer.readUInt8(offset);
      const length = buffer.readUInt32BE(offset + 4);
      offset += 8;

      if (offset + length > buffer.length) break;
      const payload = buffer.subarray(offset, offset + length);

      if (type === 1) outStream.write(payload);
      else if (type === 2) errStream.write(payload);

      offset += length;
    }
    outStream.end();
    errStream.end();
  }
}

export const dockerManager = new DockerManager();
