// Vercel serverless function: POST /api/npc. Holds the AI key (set AI_API_KEY in the Vercel dashboard, never in the repo).
import { handleNpcRequest, createLimiter, LIMITS } from '../server/npc-core.js';

const limiter = createLimiter({ perPlayer: Number(process.env.AI_PLAYER_DAILY) || 20, perIp: Number(process.env.AI_IP_DAILY) || 80 });

export default async function handler(req, res) {
  const origin = process.env.AI_ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (JSON.stringify(req.body || {}).length > LIMITS.body) return res.status(413).json({ error: 'Too much text.' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const { status, json } = await handleNpcRequest({ body: req.body, ip, env: process.env, limiter });
  return res.status(status).json(json);
}
