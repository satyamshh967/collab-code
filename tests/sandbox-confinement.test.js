import test from 'node:test';
import assert from 'node:assert';
import { runLocalSandbox } from '../execution-service/src/sandbox/localRunner.js';
import { validateCode, normalizeLanguage } from '../execution-service/src/sandbox/securityPolicy.js';
import { DockerManager } from '../execution-service/src/sandbox/dockerManager.js';

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

  await t.test('security policy applies to language aliases (js/py) too', () => {
    assert.strictEqual(validateCode("require('child_process')", 'js').valid, false);
    assert.strictEqual(validateCode("require('node:fs')", 'JavaScript').valid, false);
    assert.strictEqual(validateCode('import math, os', 'py').valid, false);
    assert.strictEqual(validateCode('from os.path import join', 'python').valid, false);
    assert.strictEqual(normalizeLanguage('PY'), 'python');
  });

  await t.test('security policy rejects unsupported languages and non-string code', () => {
    assert.strictEqual(validateCode('print(1)', 'cobol').valid, false);
    assert.strictEqual(validateCode({ length: 1 }, 'javascript').valid, false);
  });

  await t.test('security policy does not flag harmless lookalike identifiers', () => {
    assert.strictEqual(validateCode('import osmosis_helper', 'python').valid, true);
    assert.strictEqual(validateCode('const fsm = require("./fsm")', 'javascript').valid, true);
  });

  await t.test('sandboxed process does not inherit host secrets from the environment', async () => {
    process.env.COLLAB_TEST_SECRET = 'super-secret-value';
    try {
      const result = await runLocalSandbox('javascript', 'console.log(String(globalThis.process.env.COLLAB_TEST_SECRET))');
      assert.strictEqual(result.exitCode, 0, result.error);
      assert.strictEqual(result.output, 'undefined');
    } finally {
      delete process.env.COLLAB_TEST_SECRET;
    }
  });

  await t.test('caps stderr floods under the same 512 KB budget', async () => {
    const result = await runLocalSandbox('javascript', 'for (let i = 0; i < 20000; i++) console.error("E".repeat(80));');
    const total = Buffer.byteLength(result.output + result.error, 'utf8');
    assert.ok(total <= 512 * 1024 + 1024, `Combined output was ${total} bytes`);
    assert.ok(result.output.includes('[Output truncated'));
  });

  await t.test('closes stdin so programs reading input do not hang', async () => {
    const code = "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => console.log('got:' + d.trim()));";
    const empty = await runLocalSandbox('js', code);
    assert.strictEqual(empty.output, 'got:');
    assert.ok(empty.executionTime < 4000, `took ${empty.executionTime}ms`);

    const withInput = await runLocalSandbox('js', code, 'hello');
    assert.strictEqual(withInput.output, 'got:hello');
  });

  await t.test('preserves backslashes and quotes in source code verbatim', async () => {
    // Source contains a literal backslash-n escape and both quote styles
    const source = String.raw`console.log('tab:\t|', "it's", 'slash:\\')`;
    const result = await runLocalSandbox('javascript', source);
    assert.strictEqual(result.exitCode, 0, result.error);
    assert.strictEqual(result.output, "tab:\t| it's slash:\\");
  });

  await t.test('docker log demultiplexer splits streams and enforces the byte cap', () => {
    const frame = (type, text) => {
      const payload = Buffer.from(text, 'utf8');
      const header = Buffer.alloc(8);
      header.writeUInt8(type, 0);
      header.writeUInt32BE(payload.length, 4);
      return Buffer.concat([header, payload]);
    };
    const manager = new DockerManager();
    const chunks = [];
    const { output, error } = manager.collectLogs(
      Buffer.concat([frame(1, 'out1 '), frame(2, 'err1'), frame(1, 'out2')]),
      (c) => chunks.push(c.type)
    );
    assert.strictEqual(output, 'out1 out2');
    assert.strictEqual(error, 'err1');
    assert.deepStrictEqual(chunks, ['stdout', 'stderr', 'stdout']);

    const flood = manager.collectLogs(Buffer.concat([frame(2, 'x'.repeat(400 * 1024)), frame(1, 'y'.repeat(400 * 1024))]));
    assert.ok(flood.output.length + flood.error.length <= 512 * 1024 + 200);
    assert.ok(flood.output.includes('[Output truncated'));
  });
});
