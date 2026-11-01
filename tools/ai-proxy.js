// Local test server for the AI NPC chat: `AI_MOCK=1 node tools/ai-proxy.js` (no key needed), or set AI_API_KEY in your own shell.
// Then run the game with VITE_AI_URL=http://localhost:8787/api/npc
import http from 'node:http';
import { handleNpcRequest, createLimiter, LIMITS } from '../server/npc-core.js';

const limiter = createLimiter();
const port = Number(process.env.PORT) || 8787;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST' || req.url !== '/api/npc') { res.writeHead(404).end(); return; }
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > LIMITS.body) req.destroy(); });
  req.on('end', async () => {
    let body = null;
    try { body = JSON.parse(raw); } catch { /* handled as a bad request */ }
    const { status, json } = await handleNpcRequest({ body, ip: req.socket.remoteAddress, env: process.env, limiter });
    res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(json));
  });
}).listen(port, () => console.log(`AI NPC proxy on http://localhost:${port}/api/npc ${process.env.AI_MOCK ? '(mock mode)' : process.env.AI_API_KEY ? '' : '(no AI_API_KEY set: requests will fail)'}`));
