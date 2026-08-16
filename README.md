# Hunt: Showdown 1896 — Discord-бот (лоадауты + статистика)

Discord-бот на Cloudflare Workers (HTTP Interactions, без постоянного Gateway-соединения): случайный генератор лоадаутов под систему Weapon Capacity и команда для просмотра статистики игрока с [Bayou Ledger](https://bayouledger.com).

English version: [README.en.md](README.en.md)

## Команды

### `/loadout`

Случайный лоадаут: 2 слота оружия в рамках пула Weapon Capacity (5, или 6 с трейтом Quartermaster) + 8 слотов снаряжения (инструменты и расходники, не более 4 предметов на категорию расходников: Throwables, Placeables, Shots, Tarot Cards).

Опции:

| Опция | Тип | Описание |
|---|---|---|
| `quartermaster` | bool | Пул Weapon Capacity 6 вместо 5 |
| `melee_only` | bool | Одно из двух оружий гарантированно ближнего боя |
| `exclude` | string | Список исключаемых предметов через запятую (по названию) |

### `/huntstats <steam>`

Принимает SteamID64, ссылку на steamcommunity.com или Steam vanity-имя. Резолвит его в SteamID64 (через Steam Web API, если это не готовый SteamID64), парсит публичную страницу `bayouledger.com/p/<SteamID64>` и присылает embed с MMR, KD, KDA, Kills, Deaths, Assists, Bounty, Playstyle (архетип) и Level.

## Источники данных и их ограничения — читайте перед использованием

### `src/data/items.json` (оружие/инструменты/расходники)

В ТЗ было два community-датасета как источник: [dearvoodoo/Hunt-Showdown-API](https://github.com/dearvoodoo/Hunt-Showdown-API) и [neumanf/hunt-showdown-api](https://github.com/neumanf/hunt-showdown-api). Перед адаптацией оба были проверены:

- **dearvoodoo/Hunt-Showdown-API** — каждый JSON-файл (`weapon.json`, `tool.json`, `consumable.json` и т.д.) на момент проверки (2026-08-16) содержит **одну демонстрационную запись**, а не полный каталог предметов.
- **neumanf/hunt-showdown-api** — это заготовка C#/EF Core API-проекта без единого встроенного JSON с данными; предполагает собственную БД, которую ещё нужно наполнить.

Ни один из источников не дал готового к прямой адаптации полного списка, поэтому `src/data/items.json` **составлен вручную** по открытой вики-информации и общим знаниям об игре. Список представительный, а не исчерпывающий, а точная стоимость Weapon Capacity по тирам размера оружия (1–5) — приближение. Категория Tarot Cards — условная заглушка под соответствующий тип расходников из ТЗ. **Сверяйте вручную с внутриигровым лоадаут-экраном или официальной вики перед использованием после крупных патчей.**

### Bayou Ledger (`/huntstats`)

У Bayou Ledger **нет официального публичного API для сторонних разработчиков** — есть только их собственный официальный Discord-бот и интеграция Discord Linked Roles. `/huntstats` работает через парсинг публичной HTML-страницы профиля (`src/lib/bayouledger.ts`, cheerio по CSS-классам вроде `.tile-key`/`.tile-val`, `dt.stat-label`/`dd.stat-row`), а не через документированный контракт API. При изменении вёрстки сайта парсер может сломаться и потребует обновления.

Перед продакшн-использованием стоит написать разработчику Bayou Ledger в их Telegram — [t.me/bayouledger](https://t.me/bayouledger) — и спросить про официальный доступ к данным; судя по их публичным постам, они открыты к диалогу с сообществом.

## Архитектура

HTTP Interactions (вебхук-механизм Discord для slash-команд) на Cloudflare Workers — без Gateway-соединения, чистый request → response. Деплой через GitHub-интеграцию Cloudflare Workers (пуш в репозиторий → автодеплой). Результаты `/huntstats` кэшируются на ~12 минут (Cloudflare KV, если настроен `STATS_CACHE`, иначе in-memory `Map` с TTL внутри одного изолята Worker'а — не переживает cold start, поэтому для продакшна рекомендуется настроить KV).

```
src/server.ts             — верификация подписи, роутинг интеракций
src/commands/loadout.ts   — команда /loadout
src/commands/huntstats.ts — команда /huntstats
src/lib/weapons.ts        — подбор оружия по Weapon Capacity
src/lib/gear.ts           — подбор снаряжения (8 слотов, лимиты категорий)
src/lib/steam.ts          — резолв SteamID64 через Steam Web API
src/lib/bayouledger.ts    — скрапер профиля Bayou Ledger
src/lib/cache.ts          — кэш (KV или in-memory) с TTL
src/data/items.json       — датасет оружия/инструментов/расходников
src/register-commands.ts  — регистрация slash-команд в Discord
```

## Переменные окружения

| Переменная | Назначение | Где взять |
|---|---|---|
| `DISCORD_PUBLIC_KEY` | Проверка подписи входящих интеракций | Discord Developer Portal → ваше приложение → General Information → Public Key |
| `DISCORD_TOKEN` | Токен бота (используется только `register-commands.ts`) | Discord Developer Portal → ваше приложение → Bot → Reset Token |
| `DISCORD_APPLICATION_ID` | ID приложения (для регистрации команд) | Discord Developer Portal → ваше приложение → General Information → Application ID |
| `STEAM_API_KEY` | Резолв vanity-имён Steam в SteamID64 | [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) — бесплатно, нужен домен (можно указать `localhost`) |

Локально: скопируйте `.dev.vars.example` в `.dev.vars` и заполните значения (файл в `.gitignore`, не коммитится). В продакшне — через `wrangler secret put <ИМЯ>`, никогда не хардкодите секреты в коде.

## Деплой на Cloudflare Workers через GitHub

1. Запушьте этот репозиторий в свой GitHub.
2. В [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create → Workers → Import a repository, подключите репозиторий.
3. Cloudflare сам подхватит `wrangler.toml` (build command не нужен — TypeScript компилируется самим wrangler/esbuild при деплое).
4. Задайте секреты в настройках Worker'а (Settings → Variables) либо локально командой:

```bash
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_TOKEN
wrangler secret put DISCORD_APPLICATION_ID
wrangler secret put STEAM_API_KEY
```

5. (Опционально, для персистентного кэша `/huntstats` между запросами) создайте KV namespace и раскомментируйте секцию `[[kv_namespaces]]` в `wrangler.toml`:

```bash
wrangler kv namespace create STATS_CACHE
```

6. Дальнейшие пуши в подключённую ветку будут автодеплоиться.

## Регистрация slash-команд в Discord

После того как секреты `DISCORD_TOKEN` и `DISCORD_APPLICATION_ID` доступны локально (например, в `.dev.vars` или экспортированы в окружение):

```bash
npm install
npm run register
```

Команды регистрируются глобально (может занять до часа на распространение по Discord) — при желании быстрее тестировать, зарегистрируйте их per-guild, поправив `register-commands.ts`.

Затем в Discord Developer Portal укажите **Interactions Endpoint URL** вашего Worker'а (например, `https://hunt-showdown-bot.<ваш-поддомен>.workers.dev`) в General Information → Interactions Endpoint URL — Discord должен успешно провалидировать эндпоинт (PING/PONG), прежде чем это поле сохранится.

## Лицензия

MIT — см. [LICENSE](LICENSE).
