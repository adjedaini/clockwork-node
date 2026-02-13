# @adjedaini/clockwork-node

Framework-agnostic debugging, profiling, and metrics for Node.js. One middleware: API + optional UI + request capture. No separate services.

---

## Install

```bash
npm install @adjedaini/clockwork-node
```

## Use

### Express

```javascript
import express from 'express';
import { startClockwork } from '@adjedaini/clockwork-node';

const clockwork = startClockwork({
  path: '/__clockwork',
  ui: true,
  captureRequestBody: true,
  captureResponseBody: true,
});

const app = express();
app.use(express.json());
app.use(clockwork.middleware);

app.get('/api/hello', (req, res) => {
  const id = req.clockworkId;
  if (id) clockwork.core.captureLog(id, 'info', 'Processing hello');
  res.json({ message: 'Hello' });
});

app.listen(3000);
```

### Fastify

```javascript
import Fastify from 'fastify';
import { startClockwork } from '@adjedaini/clockwork-node';

const clockwork = startClockwork({ path: '/__clockwork', ui: true });
const app = Fastify();

app.addHook('preHandler', (req, reply, done) => {
  clockwork.middleware(
    { method: req.method, url: req.url, originalUrl: req.url, path: req.routerPath, headers: req.headers, body: req.body, query: req.query },
    { setHeader: reply.header.bind(reply), get status() { return reply; }, statusCode: reply.statusCode, on: reply.raw.on.bind(reply.raw), end: (b) => reply.raw.end(b), send: reply.send.bind(reply), json: reply.send.bind(reply) },
    done
  );
});

app.get('/api/hello', (req, reply) => {
  const id = req.raw.clockworkId;
  if (id) clockwork.core.captureLog(id, 'info', 'Hello');
  return reply.send({ message: 'Hello' });
});

app.listen({ port: 3000 });
```

### Node.js `http`

```javascript
import { createServer } from 'http';
import { startClockwork } from '@adjedaini/clockwork-node';

const clockwork = startClockwork({ path: '/__clockwork', ui: true });

const server = createServer((req, res) => {
  const reqLike = {
    method: req.method ?? 'GET',
    url: req.url,
    originalUrl: req.url,
    path: req.url?.split('?')[0],
    headers: req.headers,
  };
  const resLike = {
    setHeader: res.setHeader.bind(res),
    get statusCode() { return res.statusCode; },
    set statusCode(v) { res.statusCode = v; },
    status(code) { res.statusCode = code; return resLike; },
    on: res.on.bind(res),
    end: res.end.bind(res),
    send: (b) => { res.setHeader('Content-Type', 'application/json'); res.end(typeof b === 'string' ? b : JSON.stringify(b)); },
    json: (b) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); },
  };
  clockwork.middleware(reqLike, resLike, () => {
    if (req.url?.startsWith('/api/')) {
      const id = req.clockworkId;
      if (id) clockwork.core.captureLog(id, 'info', 'Request');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Hello' }));
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
});

server.listen(3000);
```

Open **http://localhost:3000/__clockwork/app**. UI is at `{path}/app`, API at `{path}`.

---

## TypeScript

For typed `req.clockworkId` (Express / Node), add to your `tsconfig.json` or a `.d.ts` file:

```json
{ "compilerOptions": { "types": ["@adjedaini/clockwork-node/globals"] } }
```

Or in a `.d.ts` file:

```ts
/// <reference types="@adjedaini/clockwork-node/globals" />
```

---

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `path` | `'/__clockwork'` | Base path for API and UI. UI is served at `{path}/app`. |
| `ui` | `true` | Enable built-in dashboard at `{path}/app`. |
| `uiPath` | (package dist) | Override UI directory. |
| `captureRequestBody` | `true` | Capture request body. |
| `captureResponseBody` | `true` | Capture response body. |
| `ignoreStartsWith` | `[]` | Skip paths that start with these. |
| `core.maxRequests` | `100` | Ring buffer size. |
| `core.storage` | (ring buffer) | Custom storage implementing `IRequestStorage`. |

**API:** `GET {path}`, `GET {path}/:id`, `GET {path}/latest`, `GET {path}/metrics`.

**Build output:** The published package has `dist/index.js`, `dist/index.d.ts`, and `dist/public/` (index.html + assets). Serve `dist/public` at `{path}/app` or rely on the built-in middleware.

---

## Monorepo

Only **@adjedaini/clockwork-node** (root) is published. Internal packages are `private: true`. See [docs/PACKAGE_BOUNDARIES.md](docs/PACKAGE_BOUNDARIES.md).

- **Build:** `npm run build` → packages → UI → root bundle → copy UI to `dist/public`.
- **Scripts:** `build`, `dev:example`, `dev:ui`, `test`, `clean`, `version` (changesets), `release`.

---

## License

MIT
