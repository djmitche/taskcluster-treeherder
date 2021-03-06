const assert = require('assert');
const Handler = require('../src/handler');
const taskDefinition = require('./fixtures/task');
const statusMessage = require('./fixtures/task_status');
const jobMessage = require('./fixtures/job_message');
const parseRoute = require('../src/util/route_parser');
const Monitor = require('taskcluster-lib-monitor');
const taskcluster = require('taskcluster-client');

let handler, task, status, expected, pushInfo;

suite('handle completed job', () => {
  beforeEach(async () => {
    handler = new Handler({
      prefix: 'treeherder',
      queue: new taskcluster.Queue(),
      monitor: await Monitor({
        project: 'tc-treeherder-test',
        credentials: {},
        mock: true,
      }),
    });
    task = JSON.parse(taskDefinition);
    status = JSON.parse(statusMessage);
    expected = JSON.parse(jobMessage);
    pushInfo = parseRoute(task.routes[0]);
  });

  test('valid message', async () => {
    let actual;
    handler.publishJobMessage = (pushInfo, job) => {
      actual = job;
    };

    let scheduled = new Date();
    let started = new Date();
    let resolved = new Date();
    started.setMinutes(started.getMinutes() + 5);
    resolved.setMinutes(resolved.getMinutes() + 10);

    status.status.runs[0] = {
      runId: 0,
      state: 'completed',
      reasonCreated: 'scheduled',
      scheduled: scheduled.toISOString(),
      started: started.toISOString(),
      resolved: resolved.toISOString(),
    };

    expected.state = 'completed';
    expected.result = 'success';
    expected.timeStarted = started.toISOString();
    expected.timeCompleted = resolved.toISOString();
    expected.logs = [
      {
        name: 'builds-4h',
        url: 'https://queue.taskcluster.net/v1/task/5UMTRzgESFG3Bn8kCBwxxQ/runs/0/artifacts/public/logs/live_backing.log', // eslint-disable-line max-len
      },
    ];

    let job = await handler.handleTaskCompleted(pushInfo, task, status);
    assert.deepEqual(actual, expected);
  });
});
