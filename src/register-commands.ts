// This file runs under Node (via `tsx`), not the Workers runtime, so it
// needs `process` — declared minimally here rather than pulling in
// @types/node, which would otherwise clash with @cloudflare/workers-types.
declare const process: {
  env: Record<string, string | undefined>;
  exit(code: number): never;
};

const commands = [
  {
    name: "loadout",
    description: "Случайный лоадаут для Hunt: Showdown 1896",
    options: [
      {
        name: "quartermaster",
        description: "Трейт Quartermaster — Weapon Capacity 6 вместо 5",
        type: 5, // BOOLEAN
        required: false,
      },
      {
        name: "melee_only",
        description: "Заставить одно из двух оружий быть оружием ближнего боя",
        type: 5, // BOOLEAN
        required: false,
      },
      {
        name: "exclude",
        description: "Исключить предметы по названию, через запятую",
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: "huntstats",
    description: "Статистика игрока Hunt: Showdown с Bayou Ledger",
    options: [
      {
        name: "steam",
        description: "SteamID64, ссылка на профиль Steam или vanity-имя",
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const applicationId = process.env.DISCORD_APPLICATION_ID;

  if (!token || !applicationId) {
    console.error("Задайте DISCORD_TOKEN и DISCORD_APPLICATION_ID в окружении перед запуском.");
    process.exit(1);
  }

  const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    console.error(`Discord API вернул ${response.status}: ${await response.text()}`);
    process.exit(1);
  }

  const registered = (await response.json()) as Array<{ name: string }>;
  console.log(`Зарегистрировано команд: ${registered.length} (${registered.map((c) => c.name).join(", ")})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
