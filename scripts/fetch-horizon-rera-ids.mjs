import fs from 'node:fs/promises';

const detailsPath = '../.work/project_details.json';
const outputPath = '../.work/horizon-rera-ids.json';
const details = JSON.parse(await fs.readFile(detailsPath, 'utf8'));
let existing = [];
try {
  existing = JSON.parse(await fs.readFile(outputPath, 'utf8'));
} catch {}
const byUrl = new Map(existing.map((item) => [item.sourceUrl, item]));

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/<!--.*?-->/gs, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchOne(detail) {
  let error = 'unknown error';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(detail.sourceUrl, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; atlas-database-import/1.0)',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        error = `HTTP ${response.status}`;
      } else {
        const html = await response.text();
        const registration = decodeHtml(
          html.match(/<dd class="tocrera"[^>]*>(.*?)<\/dd>/s)?.[1] ?? '',
        );
        if (registration) {
          return { sourceUrl: detail.sourceUrl, registration };
        }
        error = 'RERA number missing';
      }
    } catch (caught) {
      error = caught?.message ?? String(caught);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 400));
  }
  return { sourceUrl: detail.sourceUrl, registration: null, error };
}

const pending = details.filter((detail) => !byUrl.has(detail.sourceUrl));
let nextIndex = 0;
let completed = 0;
let lastSaved = 0;

async function save(force = false) {
  if (!force && completed - lastSaved < 200) return;
  lastSaved = completed;
  const ordered = details
    .map((detail) => byUrl.get(detail.sourceUrl))
    .filter(Boolean);
  await fs.writeFile(outputPath, JSON.stringify(ordered));
  console.log(
    JSON.stringify({ completed, remaining: pending.length - completed }),
  );
}

async function worker() {
  while (true) {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= pending.length) return;
    const detail = pending[index];
    byUrl.set(detail.sourceUrl, await fetchOne(detail));
    completed += 1;
    await save();
  }
}

await Promise.all(Array.from({ length: 16 }, () => worker()));
await save(true);
const ordered = details.map((detail) => byUrl.get(detail.sourceUrl));
console.log(
  JSON.stringify(
    {
      total: ordered.length,
      withRegistration: ordered.filter((item) => item.registration).length,
      failures: ordered.filter((item) => !item.registration).length,
    },
    null,
    2,
  ),
);
