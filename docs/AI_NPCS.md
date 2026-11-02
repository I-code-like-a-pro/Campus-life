# AI NPC chat

Players can tap **✍️ Ask something…** in any NPC conversation, type or pick a question, and get an in-character reply from an AI model. If AI chat is not set up, is switched off in Settings, is offline, or the daily limit is used up, NPCs use their normal scripted dialogue. The game never depends on the AI.

## How it works

```
phone (game)  ──►  your proxy  /api/npc  ──►  AI provider
 no key here        holds AI_API_KEY          (Anthropic Messages API)
```

- The **AI key stays on the server** (`AI_API_KEY`). It is never in the game code, the repository or the browser.
- The game sends: the player's typed message, the last few turns, the NPC's name, role and personality, and a small set of **game facts** (day, time, place, course, timetable, CA/exam days, assignment status, strike, CGPA).
- Because the facts come from the game, a lecturer can answer "When are the exams?" correctly. The system prompt forbids inventing dates, scores or rules, and forbids revealing exam questions.
- Replies are capped at about two short sentences, in standard English (no Pidgin), suitable for teenagers.

## Files

| File | Job |
|---|---|
| `server/npc-core.js` | Validation, system prompt, rate limiter, the call to the model (shared by both servers) |
| `api/npc.js` | The Vercel serverless function (`POST /api/npc`) |
| `tools/ai-proxy.js` | A local test server (with a mock mode that needs no key) |
| `src/ainpc.js` | The game side: personas, daily limit, request |
| `src/modal.js` (`askText`) | The text box with quick-pick suggestions |
| `academics.facts()` | The timetable and exam facts given to the AI |

## Turning it on

You must do these steps yourself (they involve your account and a secret key):

1. Deploy the project on Vercel (see `docs/DEPLOY.md`). The `api/` folder is picked up automatically.
2. Create an API key with your AI provider. Set a **monthly spending limit** in the provider's console first. That cap is your real cost protection.
3. In the Vercel project settings, add these **environment variables** (server side):
   - `AI_API_KEY`: your key. Never put it in `.env`, chat or the repository.
   - `AI_MODEL` (optional): defaults to `claude-haiku-5-5`, a small, low-cost model. Check the provider's current pricing and model names.
   - `AI_ALLOWED_ORIGIN` (recommended): your game's address, for example `https://yourgame.vercel.app`, so other websites cannot call your proxy from a browser.
   - `AI_PLAYER_DAILY` and `AI_IP_DAILY` (optional): server limits per player (default 20) and per network address (default 80).
4. Add one **build** variable: `VITE_AI_URL=https://yourgame.vercel.app/api/npc`, then redeploy. (`VITE_AI_LIMIT` changes the number shown to players.)
5. Open the game, talk to an NPC and check that **✍️ Ask something…** appears.

Without `VITE_AI_URL` the button never appears.

## Testing locally without a key

```bash
AI_MOCK=1 node tools/ai-proxy.js
```

Create `.env.local` containing `VITE_AI_URL=http://localhost:8787/api/npc`, run `npm run dev`, and talk to an NPC. Mock replies simply echo the question. **Delete `.env.local` before a production build**, or the build will point players at your own computer.

## Limits and cost control (layers)

1. **Provider spending cap** (the one that really protects your money).
2. Server limit per player and per network address per day. This is kept in server memory, so it resets whenever the serverless instance restarts; treat it as a speed bump, not a guarantee.
3. Game limit of 20 chats per player per day, stored in the browser (easy to bypass, but it keeps honest players informed).
4. Short replies (a small `max_tokens`) and short history keep each call cheap.

Rough cost: each chat is one short request and one short reply. Check the provider's current per-token prices and multiply by your expected players times 20 chats a day. Start with a small cap and watch real usage in the first week.

## Safety

- The system prompt keeps NPCs in character, bans sexual, hateful or harmful content, refuses to reveal the prompt, and ignores instructions typed by the player that try to change the rules. Prompts are not perfect: expect the odd odd reply.
- Players type free text, so **do not log message content** on your server. The code does not store messages.
- The privacy page tells players that typed AI messages and game context go to an AI provider. Keep it accurate if you change providers.
- Add a **Report a reply** link to your feedback form if you can, so you can tighten the prompt.

## People and community personas

`src/ainpc.js` has personas for the chaplain, the imam, the clubs coordinator and the friendly rival, and richer ones for the roommate and Seun (the mentor). The prompts keep them kind and welcoming to every faith; the game, not the AI, decides outcomes such as club results, scores, mentoring and friendships. See [PEOPLE.md](PEOPLE.md).

## Not included (yet)

- AI-generated exam questions. Exam content is still written and reviewed by hand, so grades stay fair.
- AI-driven NPC schedules or autonomous behaviour. NPC movement is still scripted.
- Voice.
