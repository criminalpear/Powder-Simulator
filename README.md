# Quantum Infinite — Infinite Craft Sandbox

**Quantum Infinite** is a client-only, GitHub-Pages-friendly sandbox that evolves your sand simulator into an *infinite discovery* game.

## Features

- Deterministic infinite material generator — discover new materials by mixing existing ones.
- Physics-based mixing — materials must be adjacent for a short time to react.
- Encyclopedia that lists discovered materials and their colors/descriptions.
- Optional **proxy** support: deploy a serverless proxy (Vercel, Netlify, Cloudflare Workers) that holds your OpenAI API key; paste its URL into *Settings* to enable GPT-powered material creativity.
- Safe for public hosting — no API keys in the repo.

## How it works

1. Start with base materials (sand, water, fire, stone, plant, oil, metal).
2. Place materials in the simulation; when two different materials contact for enough ticks, the game either:
   - Uses an explicit recipe (if defined), or
   - Generates a deterministic new material from the parents, or
   - If you configured a proxy and enabled it, asks your proxy to generate a creative material (proxy must validate & sanitize).

## Deploy to GitHub Pages

1. Create a repository (public or private).
2. Upload the files from this ZIP into the repo root (or `/docs` if you prefer).
3. In GitHub repository settings → Pages, set source to `main` branch (root or `/docs`).
4. Visit `https://<your-username>.github.io/<repo>/` after a moment.

## Proxy (recommended for public GPT use)

For public usage with GPT, **do not** let clients hold your OpenAI API key. Deploy a tiny proxy that:

- Accepts POST requests with `{ parents: [...] }`.
- Calls OpenAI with your server-side key.
- Validates that the response is safe (IDs, color format, numeric ranges).
- Returns JSON `{ id,name,color,flow,density,flammable,conductive,description }`.

### Example serverless stub (Node / Vercel)

```js
// api/generate.js (Vercel / Netlify style)
import fetch from 'node-fetch';
export default async function handler(req, res){
  const parents = req.body.parents;
  // validate parents...
  // build prompt and call OpenAI using process.env.OPENAI_KEY
  // parse & sanitize response
  res.json(generatedMaterial);
}
```

## Local usage & save

- Settings and unlocked materials are stored in `localStorage`.
- Export/import saves in Settings for backups.

## Security notes

- If you paste a proxy URL and enable proxy, the browser will send requests to that URL. Make sure the proxy is yours and secured.
- Never paste your raw OpenAI key into a public website.

## Credits

Built from your original Quantum Sand simulator — upgraded into an infinite-craft prototype with deterministic generation and optional GPT proxy support.

Enjoy — and tell me which features you want next (crafting lab, research points, critters, achievements, icons, sound, etc.)!
