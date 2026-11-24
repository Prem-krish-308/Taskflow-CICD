const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => server.close(resolve));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('frontend health, static page and API proxy routing', async () => {
  const seen = [];
  const task = http.createServer((req, res) => {
    seen.push(['task', req.method, req.url]);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.method === 'GET' ? [] : { id: '123', title: 'Test', status: 'todo', priority: 'high' }));
  });
  const analytics = http.createServer((req, res) => {
    seen.push(['analytics', req.method, req.url]);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
    total: 0,
    done: 0,
    open: 0,
    completion_rate: 0,
    priority: { low: 0, medium: 0, high: 0 }}));
  });
  const taskPort = await listen(task);
  const analyticsPort = await listen(analytics);
  const probe = http.createServer();
  const port = await listen(probe);
  await close(probe);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: require('node:path').resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port), TASK_SERVICE_URL: `http://127.0.0.1:${taskPort}`, ANALYTICS_SERVICE_URL: `http://127.0.0.1:${analyticsPort}` },
    stdio: 'ignore'
  });
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      if (child.exitCode !== null) throw new Error('Frontend process exited');
      try { const r = await fetch(`http://127.0.0.1:${port}/health`); if (r.ok) { ready = true; break; } } catch {}
      await sleep(100);
    }
    assert.ok(ready, 'Frontend did not start');
    const base = `http://127.0.0.1:${port}`;
    assert.equal((await (await fetch(`${base}/health`)).json()).service, 'frontend');
    const html = await fetch(base);
    assert.equal(html.status, 200);
    const page = await html.text();

    assert.match(page, /<html/i);
    assert.match(page, /id="priority"/);
    assert.match(page, /id="high-count"/);
    assert.match(page, /id="medium-count"/);
    assert.match(page, /id="low-count"/);
    assert.equal(
    (await fetch(`${base}/api/tasks`)).status,
    200
);

const created = await fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: {
        'content-type': 'application/json'
    },
    body: JSON.stringify({
        title: 'Test',
        priority: 'high'
    })
});

assert.equal(created.status, 200);
assert.equal((await created.json()).priority, 'high');

const updated = await fetch(`${base}/api/tasks/123`, {
    method: 'PATCH',
    headers: {
        'content-type': 'application/json'
    },
    body: JSON.stringify({
        priority: 'high'
    })
});

assert.equal(updated.status, 200);
assert.equal((await updated.json()).priority, 'high');

const stats = await fetch(`${base}/api/stats`);

assert.equal(stats.status, 200);

assert.deepEqual((await stats.json()).priority, {
    low: 0,
    medium: 0,
    high: 0
});

assert.deepEqual(seen, [
    ['task', 'GET', '/api/tasks'],
    ['task', 'POST', '/api/tasks'],
    ['task', 'PATCH', '/api/tasks/123'],
    ['analytics', 'GET', '/api/stats']
]);
  } finally {
    child.kill();
    await Promise.all([close(task), close(analytics)]);
  }
});
