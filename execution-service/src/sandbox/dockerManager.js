import Docker from 'dockerode';
import dotenv from 'dotenv';

dotenv.config();

const MAX_OUTPUT_BYTES = 512 * 1024; // 512 KB across stdout + stderr
const DEFAULT_TIMEOUT_MS = 5000;      // 5 seconds
const TRUNCATION_NOTICE = '\n[Output truncated: exceeded 512KB limit to prevent memory exhaustion]';

const defaultSocketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';

export class DockerManager {
  constructor() {
    this.docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || defaultSocketPath });
    this.memoryLimit = 128 * 1024 * 1024; // 128 MB
    this.memorySwap = 128 * 1024 * 1024;  // 128 MB (0 swap)
    this.cpuQuota = 50000;                 // 0.5 CPU
    this.cpuPeriod = 100000;
    this.pidsLimit = 128;                  // fork-bomb protection (JVM needs ~30 threads)
    this.timeout = parseInt(process.env.EXECUTION_TIMEOUT || `${DEFAULT_TIMEOUT_MS}`, 10) || DEFAULT_TIMEOUT_MS;
    this._availability = null;
    this._availabilityCheckedAt = 0;
  }

  /** Ping the daemon, caching the answer for 10s so every run doesn't pay for it. */
  async isDockerAvailable() {
    const now = Date.now();
    if (this._availability !== null && now - this._availabilityCheckedAt < 10000) {
      return this._availability;
    }
    try {
      await this.docker.ping();
      this._availability = true;
    } catch (e) {
      this._availability = false;
    }
    this._availabilityCheckedAt = now;
    return this._availability;
  }

  async runInSandbox(image, cmd, stdinStr = '', onChunk = null, env = []) {
    let container = null;
    let timer = null;

    try {
      container = await this.docker.createContainer({
        Image: image,
        Cmd: cmd,
        Env: env,
        Tty: false,
        OpenStdin: true,
        StdinOnce: true,
        AttachStdin: true,
        HostConfig: {
          Memory: this.memoryLimit,
          MemorySwap: this.memorySwap,
          CpuQuota: this.cpuQuota,
          CpuPeriod: this.cpuPeriod,
          PidsLimit: this.pidsLimit,
          NetworkMode: 'none', // Strictly isolated from external network
          AutoRemove: false,
          CapDrop: ['ALL'],
          SecurityOpt: ['no-new-privileges:true']
        }
      });

      // Attach BEFORE start so no input is lost, then always close stdin so
      // programs that read input receive EOF instead of hanging until timeout.
      const stdinStream = await container.attach({ stream: true, hijack: true, stdin: true, stdout: false, stderr: false });
      await container.start();
      try {
        if (stdinStr) stdinStream.write(stdinStr);
        stdinStream.end();
      } catch (e) {
        console.warn('[DockerManager] Stdin write error:', e.message);
      }

      let isTimeout = false;
      const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(async () => {
          isTimeout = true;
          try {
            await container.kill({ signal: 'SIGKILL' });
          } catch (e) {}
          resolve({ StatusCode: -1 });
        }, this.timeout);
      });

      const waitResult = await Promise.race([container.wait(), timeoutPromise]);
      clearTimeout(timer);

      const logs = await container.logs({ stdout: true, stderr: true });
      const { output, error } = this.collectLogs(logs, onChunk);

      try {
        await container.remove({ force: true });
      } catch (e) {}

      return {
        output: output.trim(),
        error: isTimeout
          ? `Execution timed out (strictly terminated after ${this.timeout / 1000} seconds)`
          : error.trim(),
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

  /**
   * Demultiplex Docker's 8-byte-header log frames into stdout/stderr text,
   * enforcing a single byte budget across both streams.
   */
  collectLogs(buffer, onChunk = null) {
    let output = '';
    let error = '';
    let totalBytes = 0;
    let offset = 0;

    while (offset + 8 <= buffer.length) {
      const type = buffer.readUInt8(offset);
      const length = buffer.readUInt32BE(offset + 4);
      offset += 8;
      if (offset + length > buffer.length) break;

      let payload = buffer.subarray(offset, offset + length);
      offset += length;

      const remaining = MAX_OUTPUT_BYTES - totalBytes;
      const truncated = payload.length > remaining;
      if (truncated) payload = payload.subarray(0, Math.max(0, remaining));
      totalBytes += payload.length;

      const text = payload.toString('utf8');
      const streamType = type === 2 ? 'stderr' : 'stdout';
      if (type === 1) output += text;
      else if (type === 2) error += text;
      if (onChunk && text && (type === 1 || type === 2)) onChunk({ chunk: text, type: streamType });

      if (truncated) {
        output += TRUNCATION_NOTICE;
        break;
      }
    }

    return { output, error };
  }
}

export const dockerManager = new DockerManager();
