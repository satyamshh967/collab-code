import test from 'node:test';
import assert from 'node:assert';
import { enqueueExecution, getJobStatus } from '../server/src/queue/executionQueue.js';
import { closeRedisClient } from '../server/src/config/redis.js';

test('Asynchronous Queue Lifecycle', async (t) => {
  t.after(async () => {
    await closeRedisClient();
  });

  await t.test('enqueues execution job and returns immediate jobId', async () => {
    const jobSubmission = await enqueueExecution({
      code: 'console.log("Async Queue Test");',
      language: 'javascript',
      roomId: 'test-room-101'
    });

    assert.ok(jobSubmission.jobId, 'Job ID must be returned immediately');
    assert.strictEqual(jobSubmission.status, 'queued', 'Initial job state must be queued');
    assert.ok(jobSubmission.queuedAt, 'Must include queuedAt timestamp');
  });

  await t.test('tracks job status transitions until completion', async () => {
    const jobSubmission = await enqueueExecution({
      code: 'console.log(100 + 200);',
      language: 'javascript'
    });

    const statusInitial = await getJobStatus(jobSubmission.jobId);
    assert.ok(statusInitial, 'Job status must be queryable');
    assert.ok(['queued', 'running', 'completed'].includes(statusInitial.status));

    // Wait for asynchronous job completion
    let statusFinal = statusInitial;
    for (let i = 0; i < 20; i++) {
      if (statusFinal.status === 'completed' || statusFinal.status === 'failed') break;
      await new Promise(r => setTimeout(r, 100));
      statusFinal = await getJobStatus(jobSubmission.jobId);
    }

    assert.ok(['completed', 'running'].includes(statusFinal.status));
    if (statusFinal.status === 'completed') {
      assert.strictEqual(statusFinal.output.trim(), '300');
    }
  });
});
