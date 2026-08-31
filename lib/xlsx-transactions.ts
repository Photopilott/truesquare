import { strFromU8, unzipSync } from 'fflate';

import type { WorkbookTransactionRow } from '@/lib/transaction-import';

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1] ?? null;
}

function cellText(value: string) {
  return decodeXml(value.replace(/<[^>]+>/g, ''));
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0];
  if (!letters) return null;
  let total = 0;
  const upper = letters.toUpperCase();
  for (let index = 0; index < upper.length; index += 1) {
    total = total * 26 + upper.charCodeAt(index) - 64;
  }
  return total - 1;
}

function sharedStrings(xml: string | null) {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    cellText(match[1]),
  );
}

function transactionSheetPath(workbookXml: string, relationshipsXml: string) {
  const sheet = [...workbookXml.matchAll(/<sheet\b[^>]*\/>/g)].find(
    (match) => attribute(match[0], 'name') === 'Transactions',
  );
  const relationshipId = sheet ? attribute(sheet[0], 'r:id') : null;
  if (!relationshipId) return null;
  const relationship = [...relationshipsXml.matchAll(/<Relationship\b[^>]*\/>/g)].find(
    (match) => attribute(match[0], 'Id') === relationshipId,
  );
  const target = relationship ? attribute(relationship[0], 'Target') : null;
  if (!target) return null;
  return target.startsWith('/') ? target.slice(1) : `xl/${target}`;
}

export function readTransactionsWorkbook(
  arrayBuffer: ArrayBuffer,
): WorkbookTransactionRow[] {
  const files = unzipSync(new Uint8Array(arrayBuffer));
  const textFile = (path: string) =>
    files[path] ? strFromU8(files[path]) : null;
  const workbookXml = textFile('xl/workbook.xml');
  const relationshipsXml = textFile('xl/_rels/workbook.xml.rels');
  if (!workbookXml || !relationshipsXml) {
    throw new Error('This is not a supported Excel workbook.');
  }
  const sheetPath = transactionSheetPath(workbookXml, relationshipsXml);
  if (!sheetPath || !files[sheetPath]) {
    throw new Error('This workbook needs a sheet named “Transactions”.');
  }

  const strings = sharedStrings(textFile('xl/sharedStrings.xml'));
  const sheetXml = strFromU8(files[sheetPath]);
  const rows = [...sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map(
    (rowMatch) => {
      const cells: Array<string | number | null> = [];
      for (const cellMatch of rowMatch[1].matchAll(
        /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
      )) {
        const reference = attribute(cellMatch[1], 'r');
        const index = reference ? columnIndex(reference) : null;
        if (index == null) continue;
        const type = attribute(cellMatch[1], 't');
        const contents = cellMatch[2] ?? '';
        const raw = contents.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? null;
        const inline = contents.match(/<is\b[^>]*>([\s\S]*?)<\/is>/)?.[1];
        if (type === 's' && raw != null) {
          cells[index] = strings[Number(raw)] ?? null;
        } else if (type === 'inlineStr' && inline != null) {
          cells[index] = cellText(inline);
        } else if (type === 'str' && raw != null) {
          cells[index] = decodeXml(raw);
        } else if (raw != null) {
          const number = Number(raw);
          cells[index] = Number.isFinite(number) ? number : decodeXml(raw);
        } else {
          cells[index] = null;
        }
      }
      return cells;
    },
  );

  const headers = rows.shift()?.map((value) => String(value ?? '').trim()) ?? [];
  if (!headers.includes('Record ID') || !headers.includes('Zapkey URL')) {
    throw new Error('The Transactions sheet is missing its required columns.');
  }
  return rows
    .map((cells) =>
      Object.fromEntries(
        headers
          .map((header, index) => [header, cells[index] ?? null])
          .filter(([header]) => header),
      ),
    )
    .filter((row) => Object.values(row).some((value) => value != null));
}
