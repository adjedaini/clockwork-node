# @adjedaini/clockwork-node

Framework-agnostic debugging, profiling, and metrics for Node.js. One middleware: API + optional UI + request capture. No separate services.

---

## Install

```bash
npm install @adjedaini/clockwork-node
```

## Use

```javascript
import express from 'express';
import { createClockwork } from '@adjedaini/clockwork-node';

const clockwork = createClockwork({
  path: '/__clockwork',
  ui: true,
  captureRequestBody: true,
  captureResponseBody: true,
});

const app = express();
app.use(express.json());
app.use(clockwork.middleware);

app.get('/api/hello', (req, res) => {
  const id = req._clockworkId;
  if (id) clockwork.core.captureLog(id, 'info', 'Processing hello');
  res.json({ message: 'Hello' });
});

app.listen(3000);
```

Open **http://localhost:3000/__clockwork/app**. Hit routes to see requests, logs, and metrics.

---

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `path` | `'/__clockwork'` | Base path for API and UI. |
| `ui` | `true` | Enable built-in dashboard at `{path}/app`. |
| `uiPath` | (package dist) | Override UI directory. |
| `captureRequestBody` | `true` | Capture request body. |
| `captureResponseBody` | `true` | Capture response body. |
| `ignoreStartsWith` | `[]` | Skip paths that start with these. |
| `core.maxRequests` | `100` | Ring buffer size. |

**API:** `GET {path}`, `GET {path}/:id`, `GET {path}/latest`, `GET {path}/metrics`.

---

## Monorepo

Published package: **@adjedaini/clockwork-node** (root).

- **Root:** `npm run build` → build packages (shared, core, transport-http, ui), bundle root entry, copy UI to `dist/public`.
- **Scripts:** `build`, `build:packages`, `build:ui`, `build:root`, `build:copy-ui`, `dev:example`, `dev:ui`, `clean`.

---

## License

MIT
