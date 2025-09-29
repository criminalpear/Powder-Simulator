# Quantum Infinite — Fixed Build

**Quantum Infinite** — Fixed Build ensures base materials are always available and adds default proxy support for your Vercel route.

## Quick start

1. Unzip and upload the files to your GitHub Pages repo (root or `/docs`).
2. Open `index.html` in a browser (or visit your GitHub Pages URL).
3. Settings → Proxy URL is prefilled with the Vercel endpoint you provided. Enable the proxy checkbox to use it.

## Proxy usage

If you deployed a proxy at `https://v0-api-route-generation.vercel.app/api/generate`, it's already prefilled in Settings. The client will send requests like:

```json
{
  "parents": [
    { "id": "iron", "name": "Iron", "color": "#aaaaaa", "flow": "static" },
    { "id": "carbon", "name": "Carbon", "color": "#333333", "flow": "powder" }
  ]
}
```

Expected response format (JSON):

```json
{
  "id": "steel",
  "name": "Steel",
  "color": "#888888",
  "flow": "static",
  "density": 7.9,
  "flammable": false,
  "conductive": true,
  "description": "An alloy of iron and carbon, strong and durable."
}
```

## Notes

- The deterministic generator is used as a safe fallback if the proxy fails or is disabled.
- This build seeds the unlocked materials if none exist in localStorage so you'll always see the base set.
- Export/Import saves are available in Settings for backups.

Enjoy — tell me what to add next (crafting lab, achievements, critters, icons, sound, balance, etc.)!
