const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const sharedState = {
  revision: 1,
  project: {
    name: 'Programmmanagement 2026',
    description: 'Gemeinsamer, klar strukturierter Zeitplan mit Aufgaben und Zuständigkeiten.',
    tasks: [
      {
        id: randomUUID(),
        title: 'Kick-off & Scope',
        owner: 'Projektleitung',
        start: '2026-04-08',
        due: '2026-04-14',
        status: 'In Arbeit',
        priority: 'Hoch',
        notes: 'Ziele, Stakeholder und Milestones abstimmen.'
      },
      {
        id: randomUUID(),
        title: 'Anforderungen validieren',
        owner: 'Business Analyse',
        start: '2026-04-15',
        due: '2026-04-25',
        status: 'Offen',
        priority: 'Mittel',
        notes: 'Workshops mit Fachbereichen durchführen.'
      }
    ]
  },
  updatedAt: new Date().toISOString()
};

const presence = new Map();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function cleanupPresence() {
  const now = Date.now();
  for (const [sessionId, entry] of presence.entries()) {
    if (now - entry.lastSeen > 30000) {
      presence.delete(sessionId);
    }
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const safePath = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^\.\.(\/|\\|$)/, '');
  const target = safePath === '/' ? '/index.html' : safePath;
  const filePath = path.join(PUBLIC_DIR, target);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    };

    res.writeHead(200, {
      'Content-Type': typeMap[ext] || 'application/octet-stream'
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/state')) {
      if (req.method === 'GET') {
        sendJson(res, 200, sharedState);
        return;
      }

      if (req.method === 'PUT') {
        const body = await readBody(req);
        const payload = JSON.parse(body || '{}');

        if (!payload.project || !Array.isArray(payload.project.tasks)) {
          sendJson(res, 400, { error: 'Ungültiges Projektformat.' });
          return;
        }

        if (Number(payload.baseRevision) !== sharedState.revision) {
          sendJson(res, 409, {
            error: 'Konflikt erkannt. Bitte neu laden und erneut speichern.',
            serverState: sharedState
          });
          return;
        }

        sharedState.project = payload.project;
        sharedState.revision += 1;
        sharedState.updatedAt = new Date().toISOString();

        sendJson(res, 200, { ok: true, revision: sharedState.revision, updatedAt: sharedState.updatedAt });
        return;
      }
    }

    if (req.url.startsWith('/api/presence')) {
      if (req.method === 'POST') {
        const body = await readBody(req);
        const payload = JSON.parse(body || '{}');
        if (!payload.sessionId || !payload.userName) {
          sendJson(res, 400, { error: 'sessionId und userName sind erforderlich.' });
          return;
        }

        presence.set(payload.sessionId, { userName: payload.userName, lastSeen: Date.now() });
        cleanupPresence();
        const users = [...presence.values()].map((entry) => entry.userName);
        sendJson(res, 200, { users, count: users.length });
        return;
      }
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: 'Serverfehler', details: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`PM Tool läuft auf http://localhost:${PORT}`);
});
