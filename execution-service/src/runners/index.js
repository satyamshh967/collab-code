import { dockerManager } from '../sandbox/dockerManager.js';
import { runLocalSandbox } from '../sandbox/localRunner.js';
import { normalizeLanguage } from '../sandbox/securityPolicy.js';

/**
 * Per-language container configuration. Source code is handed to the container
 * as base64 in an env var and decoded inside, so it never passes through shell
 * quoting/`echo` escape processing (which corrupted code containing `\n`, `'`...).
 */
const DOCKER_RUNTIMES = {
  javascript: { image: 'collab-node-runner', file: 'main.js', run: 'node main.js' },
  python: { image: 'collab-python-runner', file: 'main.py', run: 'python3 -u main.py' },
  java: { image: 'collab-java-runner', file: 'Main.java', run: 'javac Main.java && java -Xmx96m Main' }
};

export const executeCode = async (language, code, stdin = '', onChunk = null) => {
  const startTime = Date.now();
  const lang = normalizeLanguage(language);

  if (!lang) {
    return {
      output: '',
      error: `Unsupported execution language: ${language}`,
      exitCode: -1,
      executionTime: 0
    };
  }

  try {
    if (await dockerManager.isDockerAvailable()) {
      const runtime = DOCKER_RUNTIMES[lang];
      const env = [`SOURCE_B64=${Buffer.from(code, 'utf8').toString('base64')}`];
      const cmd = ['sh', '-c', `printf '%s' "$SOURCE_B64" | base64 -d > ${runtime.file} && unset SOURCE_B64 && ${runtime.run}`];

      const { output, error, exitCode } = await dockerManager.runInSandbox(runtime.image, cmd, stdin, onChunk, env);
      return { output, error, exitCode, executionTime: Date.now() - startTime };
    }

    // Local process fallback when no Docker daemon is reachable
    return await runLocalSandbox(lang, code, stdin, onChunk);
  } catch (err) {
    return {
      output: '',
      error: err.message || `Failed to execute ${lang} code`,
      exitCode: -1,
      executionTime: Date.now() - startTime
    };
  }
};
