/**
 * Example: Node.js native http.createServer + Clockwork.
 */
import { createServer } from 'http';
import { startClockwork } from '@adjedaini/clockwork-node';

const clockwork = startClockwork({ path: '/__clockwork', ui: true });

function adaptReq(req) {
  const url = req.url ?? '/';
  const [pathname] = url.split('?');
  return {
    method: req.method ?? 'GET',
    url,
    originalUrl: url,
    path: pathname,
    headers: req.headers,
  };
}

function adaptRes(res) {
  return {
    setHeader: (n, v) => res.setHeader(n, String(v)),
    get statusCode() { return res.statusCode; },
    set statusCode(v) { res.statusCode = v; },
    status(code) { res.statusCode = code; return adaptRes(res); },
    on: (e, fn) => res.on(e, fn),
    end: (b) => res.end(b),
    send: (b) => { res.setHeader('Content-Type', 'application/json'); res.end(typeof b === 'string' ? b : JSON.stringify(b)); },
    json: (b) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); },
  };
}

const server = createServer((req, res) => {
  const reqLike = adaptReq(req);
  const resLike = adaptRes(res);
  // Attach id to Node request for app code
  const next = () => {
    const id = reqLike.clockworkId;
    if (id) req.clockworkId = id;
    if (req.url?.startsWith('/api/')) {
      if (id) clockwork.core.captureLog(id, 'info', 'Request to ' + req.url);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Hello from Node http' }));
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  };
  clockwork.middleware(reqLike, resLike, next);
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log('Node http example: http://localhost:' + PORT);
  console.log('Clockwork UI: http://localhost:' + PORT + '/__clockwork/app');
});
