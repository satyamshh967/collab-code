import Docker from 'dockerode';
import stream from 'stream';
import dotenv from 'dotenv';

dotenv.config();

export class DockerManager {
  constructor() {
    this.docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '//./pipe/docker_engine' });
    this.maxMemory = process.env.MAX_MEMORY || '256m';
    this.maxCpu = parseFloat(process.env.MAX_CPU || '0.5');
    this.timeout = parseInt(process.env.EXECUTION_TIMEOUT || '30000', 10);
  }

  async runInSandbox(image, cmd, stdinStr) {
    let container = null;
    try {
      container = await this.docker.createContainer({
        Image: image,
        Cmd: cmd,
        Tty: false,
        OpenStdin: true,
        StdinOnce: true,
        HostConfig: {
          Memory: this.parseMemory(this.maxMemory),
          CpuQuota: Math.floor(this.maxCpu * 100000),
          CpuPeriod: 100000,
          NetworkMode: 'none',
          AutoRemove: false, // We remove it manually to capture exit status
        }
      });

      await container.start();

      if (stdinStr) {
        const attachOpts = { stream: true, stdin: true, stdout: false, stderr: false };
        const attachStream = await container.attach(attachOpts);
        attachStream.write(stdinStr);
        attachStream.end();
      }

      // Timeout handling
      let isTimeout = false;
      const timeoutPromise = new Promise(resolve => {
        setTimeout(async () => {
          isTimeout = true;
          try { await container.kill(); } catch (e) {}
          resolve({ StatusCode: -1, Error: 'Execution timed out' });
        }, this.timeout);
      });

      const waitPromise = container.wait();
      const waitResult = await Promise.race([waitPromise, timeoutPromise]);

      const logs = await container.logs({ stdout: true, stderr: true });
      let output = '';
      let error = isTimeout ? 'Execution timed out' : '';

      // dockerode demuxStream helps separate stdout and stderr
      const outStream = new stream.PassThrough();
      const errStream = new stream.PassThrough();
      
      outStream.on('data', chunk => output += chunk.toString('utf8'));
      errStream.on('data', chunk => error += chunk.toString('utf8'));

      // Clean stream using dockerode's internal method (requires handling docker header)
      // For simplicity in this implementation, we parse the raw log buffer
      this.parseLogs(logs, outStream, errStream);

      await container.remove({ force: true });

      return {
        output: output.trim(),
        error: error.trim(),
        exitCode: waitResult.StatusCode
      };

    } catch (err) {
      if (container) {
        try { await container.remove({ force: true }); } catch (e) {}
      }
      throw err;
    }
  }

  parseLogs(buffer, outStream, errStream) {
    let offset = 0;
    while (offset < buffer.length) {
      const type = buffer.readUInt8(offset);
      const length = buffer.readUInt32BE(offset + 4);
      offset += 8;
      
      const payload = buffer.subarray(offset, offset + length);
      if (type === 1) outStream.write(payload);
      else if (type === 2) errStream.write(payload);
      
      offset += length;
    }
    outStream.end();
    errStream.end();
  }

  parseMemory(memStr) {
    const value = parseInt(memStr, 10);
    if (memStr.endsWith('m')) return value * 1024 * 1024;
    if (memStr.endsWith('g')) return value * 1024 * 1024 * 1024;
    return value;
  }
}
