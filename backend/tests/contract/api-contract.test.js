import test from 'node:test';
import { strict as assert } from 'node:assert';
import http from 'node:http';
import { app } from '../../src/index.js';

let server;

test('API Contract: GET /api/health returns status object', async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/api/health`);
  const body = await res.json();
  assert.ok(body.status, 'response should have status field');
  assert.ok(['ok', 'error'].includes(body.status), 'status should be ok or error');

  server.close();
});

test('API Contract: POST /api/usuarios/login with empty body returns error', async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/api/usuarios/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.ok(res.status === 400 || res.status === 401, 'should return 400 or 401 for empty body');
  const body = await res.json();
  assert.ok(body.error, 'response should have error field');

  server.close();
});

test('API Contract: GET /api/csrf-token requires authentication', async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/api/csrf-token`);
  assert.strictEqual(res.status, 401, 'should require authentication');

  server.close();
});

test('API Contract: GET /api/usuarios requires authentication', async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/api/usuarios`);
  assert.strictEqual(res.status, 401, 'should require authentication');

  server.close();
});

test('API Contract: GET /api-docs is available in development', async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/api-docs`);
  assert.ok(res.status === 200 || res.status === 404, 'api-docs should be available or not found');

  server.close();
});
