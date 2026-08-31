export type TransactionImportRowStatus =
  | 'ready'
  | 'needs_review'
  | 'rejected';

export type WorkbookTransactionRow = Record<string, unknown>;

export type PreparedTransactionImportRow = {
  ordinal: number;
  sourceRecordId: string;
  location: string | null;
  sourceLocation: string | null;
  society: string | null;
  propertyType: string | null;
  unitNumber: string | null;
  floor: string | null;
  tower: string | null;
  bhk: string | null;
  registrationDate: string | null;
  rawDate: string | null;
  price: number | null;
  effectiveArea: number | null;
  pricePerSqFt: number | null;
  areaBasis: string | null;
  eventType: string | null;
  saleType: string | null;
  qaNotes: string | null;
  sourceFile: string | null;
  sourceUrl: string | null;
  qaStatus: TransactionImportRowStatus;
  qaReasons: string[];
};

export type PreparedTransactionImport = {
  rows: PreparedTransactionImportRow[];
  readyCount: number;
  reviewCount: number;
  rejectedCount: number;
};

const LOCATION_MAP: Record<string, string> = {
  bellandur: 'Bellandur',
  haralur: 'Haralur',
  'haralur road': 'Haralur',
  marathahalli: 'Marathahalli',
  kaikondrahalli: 'Sarjapur Road',
  chikkakannalli: 'Sarjapur Road',
  'sarjapur road': 'Sarjapur Road',
  sarjapur: 'Sarjapur Road',
};

function cleanText(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  return text ? text : null;
}

function cleanNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[₹,\s]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function excelSerialToIso(value: number) {
  if (!Number.isFinite(value) || value < 2) return null;
  const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
  const iso = formatDate(date);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function cleanDate(value: unknown) {
  if (typeof value === 'number') return excelSerialToIso(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDate(value);
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || candidate === '1 Jan 0001') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    const parsed = new Date(`${candidate}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : candidate;
  }
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return null;
  const iso = formatDate(parsed);
  return iso.startsWith('0001-') ? null : iso;
}

function sameText(value: string | null, expected: string) {
  return value?.trim().toLowerCase() === expected.toLowerCase();
}

function pick(row: WorkbookTransactionRow, field: string) {
  return row[field];
}

export function normaliseLaunchLocation(value: unknown) {
  const sourceLocation = cleanText(value);
  if (!sourceLocation) return null;
  return LOCATION_MAP[sourceLocation.toLowerCase()] ?? null;
}

export function prepareTransactionImport(
  sourceRows: WorkbookTransactionRow[],
): PreparedTransactionImport {
  const seenRecordIds = new Set<string>();
  const seenUrls = new Set<string>();

  const rows = sourceRows.map((source, index) => {
    const sourceRecordId = cleanText(pick(source, 'Record ID')) ?? '';
    const sourceLocation = cleanText(pick(source, 'Location'));
    const sourceUrl = cleanText(pick(source, 'Zapkey URL'));
    const propertyType = cleanText(pick(source, 'Property Type'));
    const eventType = cleanText(pick(source, 'Event Type'));
    const qaReasons: string[] = [];

    if (!sourceRecordId) qaReasons.push('Missing record ID');
    if (sourceRecordId && seenRecordIds.has(sourceRecordId)) {
      qaReasons.push('Duplicate record ID in this upload');
    }
    if (sourceRecordId) seenRecordIds.add(sourceRecordId);

    if (!sourceUrl) qaReasons.push('Missing source URL');
    if (sourceUrl && seenUrls.has(sourceUrl)) {
      qaReasons.push('Duplicate source URL in this upload');
    }
    if (sourceUrl) seenUrls.add(sourceUrl);

    const location = normaliseLaunchLocation(sourceLocation);
    if (!location) qaReasons.push('Outside the current launch areas');
    if (!sameText(propertyType, 'Apartment')) {
      qaReasons.push('Not an apartment record');
    }
    if (!sameText(eventType, 'Sale')) {
      qaReasons.push('Not a sale transaction');
    }

    const registrationDate = cleanDate(pick(source, 'Registration Date'));
    const rawDate = cleanText(pick(source, 'Raw Registration Date')) ?? registrationDate;
    const society = cleanText(pick(source, 'Society'));
    const sourceFile = cleanText(pick(source, 'Source File'));
    const bhk = cleanText(pick(source, 'BHK'));
    const price = cleanNumber(pick(source, 'Price / Amount (INR)'));
    const effectiveArea = cleanNumber(pick(source, 'Effective Area for PPSF'));
    const pricePerSqFt = cleanNumber(
      pick(source, 'Effective Price/sq ft (INR)'),
    );

    if (!registrationDate) qaReasons.push('Missing or invalid registration date');
    if (!society) qaReasons.push('Missing society');
    if (!sourceFile) qaReasons.push('Missing source file');
    if (!bhk) qaReasons.push('Missing BHK');
    if (!price || price <= 0) qaReasons.push('Missing or invalid price');
    if (!effectiveArea || effectiveArea <= 0) {
      qaReasons.push('Missing or invalid effective area');
    }
    if (!pricePerSqFt || pricePerSqFt <= 0) {
      qaReasons.push('Missing or invalid price per sq ft');
    }

    const rejected = qaReasons.some((reason) =>
      [
        'Missing record ID',
        'Duplicate record ID in this upload',
        'Missing source URL',
        'Duplicate source URL in this upload',
        'Outside the current launch areas',
        'Not an apartment record',
        'Not a sale transaction',
      ].includes(reason),
    );
    const qaStatus: TransactionImportRowStatus = rejected
      ? 'rejected'
      : qaReasons.length
        ? 'needs_review'
        : 'ready';

    return {
      ordinal: index + 1,
      sourceRecordId,
      location,
      sourceLocation,
      society,
      propertyType,
      unitNumber: cleanText(pick(source, 'Unit No.')),
      floor: cleanText(pick(source, 'Floor')),
      tower: cleanText(pick(source, 'Block')),
      bhk,
      registrationDate,
      rawDate,
      price,
      effectiveArea,
      pricePerSqFt,
      areaBasis: cleanText(pick(source, 'PPSF Area Basis')),
      eventType,
      saleType: cleanText(pick(source, 'Sale Type')),
      qaNotes: cleanText(pick(source, 'QA Notes')),
      sourceFile,
      sourceUrl,
      qaStatus,
      qaReasons,
    };
  });

  return {
    rows,
    readyCount: rows.filter((row) => row.qaStatus === 'ready').length,
    reviewCount: rows.filter((row) => row.qaStatus === 'needs_review').length,
    rejectedCount: rows.filter((row) => row.qaStatus === 'rejected').length,
  };
}
