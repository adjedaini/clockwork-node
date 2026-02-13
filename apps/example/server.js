/**
 * Example Express app using startClockwork().
 * Run: npm run start (from repo root: npm run dev:example)
 * With autoConsole: true (default), console.* is auto-attached to the current request.
 */
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

import express from 'express';
import { startClockwork } from '@adjedaini/clockwork-node';

const clockwork = startClockwork({
  path: '/__clockwork',
  ui: true,
  autoConsole: true,
  autoErrors: true,
  autoDb: false,
  captureRequestBody: true,
  captureResponseBody: true,
  ignoreStartsWith: ['/admin'],
});

const app = express();
app.use(express.json());

// Clockwork: API + UI + request capture. Request context is set so console.* and errors correlate.
app.use(clockwork.middleware);

function getRequestId(req) {
  return req.clockworkId ?? null;
}

function log(req, level, message, context) {
  const id = getRequestId(req);
  if (id) clockwork.core.captureLog(id, level, message, context);
}

app.get('/api/hello', (req, res) => {
  console.log('Processing hello request');
  log(req, 'debug', 'Debug information', { user: 'test' });
  const greeting = { message: 'Hello from Clockwork Node!', timestamp: new Date().toISOString() };
  res.json(greeting);
});

app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  log(req, 'info', `Fetching user ${userId}`);
  await new Promise((r) => setTimeout(r, 50));
  const id = getRequestId(req);
  if (id) {
    clockwork.core.addQuery(id, {
      query: 'SELECT * FROM users WHERE id = $1',
      bindings: [userId],
      duration: 52,
      connection: 'postgres',
    });
  }
  res.json({ id: userId, name: 'John Doe', email: 'john@example.com' });
});

app.post('/api/users', async (req, res) => {
  log(req, 'info', 'Creating new user', { body: req.body });
  if (!req.body?.name || !req.body?.email) {
    log(req, 'error', 'Validation failed', { missing: ['name', 'email'] });
    return res.status(400).json({ error: 'Name and email are required' });
  }
  const id = getRequestId(req);
  if (id) {
    clockwork.core.addQuery(id, {
      query: 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      bindings: [req.body.name, req.body.email],
      duration: 80,
      connection: 'postgres',
    });
  }
  const user = {
    id: Math.random().toString(36).slice(2, 9),
    ...req.body,
    created_at: new Date().toISOString(),
  };
  res.status(201).json(user);
});

app.get('/api/slow', async (req, res) => {
  log(req, 'warning', 'Slow endpoint accessed');
  await new Promise((r) => setTimeout(r, 800));
  res.json({ message: 'Slow operation completed' });
});

const PORT = Number(process.env.PORT) || 3001;
const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       Clockwork Example — Node.js Debugging & Metrics       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📊 API:    http://localhost:${PORT}/__clockwork`);
  console.log(`🎨 App:    http://localhost:${PORT}/__clockwork/app\n`);
  console.log('Try: GET /api/hello  GET /api/users/123  POST /api/users  GET /api/slow');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Try: PORT=${PORT + 1} npm run start\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
