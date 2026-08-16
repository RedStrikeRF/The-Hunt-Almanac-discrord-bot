# Hunt: Showdown 1896 — Discord Bot (loadouts + stats)

A Discord bot on Cloudflare Workers (HTTP Interactions — no persistent Gateway connection): a random loadout generator built around the Weapon Capacity system, plus a command to look up a player's stats from [Bayou Ledger](https://bayouledger.com).

Русская версия: [README.md](README.md)

## Commands

### `/loadout`

Random loadout: 2 weapon slots within the Weapon Capacity pool (5, or 6 with the Quartermaster trait) + 8 gear slots (tools and consumables, at most 4 items per consumable category: Throwables, Placeables, Shots, Tarot Cards).

Options:

| Option | Type | Description |
|---|---|---|
| `quartermaster` | bool | Weapon Capacity pool of 6 instead of 5 |
| `melee_only` | bool | Force one of the two weapons to be melee |
| `exclude` | string | Comma-separated list of item names to exclude |

### `/huntstats <steam>`

Accepts a SteamID64, a steamcommunity.com URL, or a Steam vanity name. Resolves it to a SteamID64 (via the Steam Web API when it isn't one already), scrapes the public `bayouledger.com/p/<SteamID64>` page, and replies with an embed showing MMR, KD, KDA, Kills, Deaths, Assists, Bounty, Playstyle (archetype), and Level.

## Data sources and their limitations — read before relying on this

### `src/data/items.json` (weapons/tools/consumables)

The spec named two community datasets as a source: [dearvoodoo/Hunt-Showdown-API](https://github.com/dearvoodoo/Hunt-Showdown-API) and [neumanf/hunt-showdown-api](https://github.com/neumanf/hunt-showdown-api). Both were checked before adapting anything:

- **dearvoodoo/Hunt-Showdown-API** — as of the check (2026-08-16), each JSON file (`weapon.json`, `tool.json`, `consumable.json`, etc.) contains **a single sample entry**, not a full catalog.
- **neumanf/hunt-showdown-api** — a scaffolded C#/EF Core API project with no bundled JSON data at all; it expects its own database to be populated separately.

Neither source produced a ready-to-adapt full item list, so `src/data/items.json` was **compiled by hand** from public wiki information and general game knowledge. The list is representative, not exhaustive, and the Weapon Capacity cost per size tier (1–5) is an approximation. The Tarot Cards category is a placeholder standing in for that consumable type from the spec. **Cross-check manually against the in-game loadout screen or the official wiki, especially after major balance patches.**

### Bayou Ledger (`/huntstats`)

Bayou Ledger has **no official public API for third-party developers** — only their own official Discord bot and a Discord Linked Roles integration. `/huntstats` works by parsing the public profile HTML page (`src/lib/bayouledger.ts`, using cheerio against CSS classes like `.tile-key`/`.tile-val` and `dt.stat-label`/`dd.stat-row`), not a documented API contract. If the site's markup changes, the parser can break and will need updating.

Before relying on this in production, consider reaching out to Bayou Ledger's developer on Telegram — [t.me/bayouledger](https://t.me/bayouledger) — to ask about official data access; based on their public posts they seem open to talking with the community.

## Architecture

HTTP Interactions (Discord's webhook mechanism for slash commands) on Cloudflare Workers — no Gateway connection, plain request → response. Deployed via Cloudflare Workers' GitHub integration (push to the repo → auto-deploy). `/huntstats` results are cached for ~12 minutes (Cloudflare KV if `STATS_CACHE` is configured, otherwise an in-memory `Map` with a TTL scoped to a single Worker isolate — it does not survive a cold start, so KV is recommended for production).

```
src/server.ts             — signature verification, interaction routing
src/commands/loadout.ts   — /loadout command
src/commands/huntstats.ts — /huntstats command
src/lib/weapons.ts        — weapon selection within Weapon Capacity
src/lib/gear.ts           — gear selection (8 slots, category caps)
src/lib/steam.ts          — SteamID64 resolution via the Steam Web API
src/lib/bayouledger.ts    — Bayou Ledger profile scraper
src/lib/cache.ts          — KV-or-in-memory cache with TTL
src/data/items.json       — weapon/tool/consumable dataset
src/register-commands.ts  — registers the slash commands with Discord
```

## Environment variables

| Variable | Purpose | Where to get it |
|---|---|---|
| `DISCORD_PUBLIC_KEY` | Verifies incoming interaction signatures | Discord Developer Portal → your app → General Information → Public Key |
| `DISCORD_TOKEN` | Bot token (used only by `register-commands.ts`) | Discord Developer Portal → your app → Bot → Reset Token |
| `DISCORD_APPLICATION_ID` | App ID, needed to register commands | Discord Developer Portal → your app → General Information → Application ID |
| `STEAM_API_KEY` | Resolves Steam vanity names to SteamID64 | [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) — free, requires a domain (`localhost` works) |

Locally: copy `.dev.vars.example` to `.dev.vars` and fill in the values (it's gitignored, never committed). In production, set secrets with `wrangler secret put <NAME>` — never hardcode secrets in code.

## Deploying to Cloudflare Workers via GitHub

1. Push this repository to your own GitHub.
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create → Workers → Import a repository, connect the repo.
3. Cloudflare picks up `wrangler.toml` automatically (no separate build command — TypeScript is bundled by wrangler/esbuild at deploy time).
4. Set the secrets on the Worker (Settings → Variables), or locally via:

```bash
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_TOKEN
wrangler secret put DISCORD_APPLICATION_ID
wrangler secret put STEAM_API_KEY
```

5. (Optional, for a `/huntstats` cache that persists across requests) create a KV namespace and uncomment the `[[kv_namespaces]]` block in `wrangler.toml`:

```bash
wrangler kv namespace create STATS_CACHE
```

6. Further pushes to the connected branch will auto-deploy.

## Registering the slash commands with Discord

Once `DISCORD_TOKEN` and `DISCORD_APPLICATION_ID` are available locally (e.g. in `.dev.vars` or exported into your shell):

```bash
npm install
npm run register
```

Commands are registered globally (propagation across Discord can take up to an hour) — for faster iteration, register them per-guild instead by adjusting `register-commands.ts`.

Then, in the Discord Developer Portal, set your Worker's URL (e.g. `https://hunt-showdown-bot.<your-subdomain>.workers.dev`) as the **Interactions Endpoint URL** under General Information — Discord needs to successfully validate the endpoint (PING/PONG) before it will save.

## License

MIT — see [LICENSE](LICENSE).
