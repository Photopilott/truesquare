import type { SocietySummary } from './society-evidence.ts';

export type BuyerEvidenceSource =
  | 'none'
  | 'registered_transaction'
  | 'owner_input'
  | 'combined';

export type BuyerEvidenceSummary = {
  bhk: string | null;
  isAllBhks: boolean;
  registeredCount: number;
  approvedOwnerCount: number;
  publicOwnerCount: number;
  registeredMedianPrice: number | null;
  registeredMedianPricePerSqFt: number | null;
  ownerMedianPrice: number | null;
  ownerMinPrice: number | null;
  ownerMaxPrice: number | null;
  ownerMedianPricePerSqFt: number | null;
  ownerMinPricePerSqFt: number | null;
  ownerMaxPricePerSqFt: number | null;
  latestRegisteredDate: string | null;
  latestOwnerDate: string | null;
  evidenceSource: BuyerEvidenceSource;
};

export type BuyerSocietySummary = SocietySummary & {
  flatInventoryId?: string | null;
  builder?: string | null;
  catalogueSource?: 'inventory' | 'final_value';
  hasPermanentPage?: boolean;
  buyerEvidence?: BuyerEvidenceSummary[];
};

export type BuyerSocietyEvidenceRow = {
  catalogue_id: string;
  flat_inventory_id: string | null;
  society: string;
  location: string;
  builder: string | null;
  catalogue_source: 'inventory' | 'final_value';
  bhk: string | null;
  is_all_bhks: boolean;
  registered_count: number | string;
  approved_owner_count: number | string;
  public_owner_count: number | string;
  registered_median_price: number | string | null;
  registered_median_price_per_sq_ft: number | string | null;
  owner_median_price: number | string | null;
  owner_min_price: number | string | null;
  owner_max_price: number | string | null;
  owner_median_price_per_sq_ft: number | string | null;
  owner_min_price_per_sq_ft: number | string | null;
  owner_max_price_per_sq_ft: number | string | null;
  latest_registered_date: string | Date | null;
  latest_owner_date: string | Date | null;
  evidence_source: BuyerEvidenceSource;
};

function numberOrNull(value: number | string | null) {
  return value == null ? null : Number(value);
}

function dateOrNull(value: string | Date | null) {
  if (value == null) return null;
  return new Date(value).toISOString().slice(0, 10);
}

export function societyNameKey(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/apartments?$/, '');
}

function identityKey(name: string, location: string) {
  return `${societyNameKey(name)}|${location.trim().toLowerCase()}`;
}

function slugPart(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function evidenceFromRow(row: BuyerSocietyEvidenceRow): BuyerEvidenceSummary {
  return {
    bhk: row.bhk,
    isAllBhks: Boolean(row.is_all_bhks),
    registeredCount: Number(row.registered_count),
    approvedOwnerCount: Number(row.approved_owner_count),
    publicOwnerCount: Number(row.public_owner_count),
    registeredMedianPrice: numberOrNull(row.registered_median_price),
    registeredMedianPricePerSqFt: numberOrNull(
      row.registered_median_price_per_sq_ft,
    ),
    ownerMedianPrice: numberOrNull(row.owner_median_price),
    ownerMinPrice: numberOrNull(row.owner_min_price),
    ownerMaxPrice: numberOrNull(row.owner_max_price),
    ownerMedianPricePerSqFt: numberOrNull(row.owner_median_price_per_sq_ft),
    ownerMinPricePerSqFt: numberOrNull(row.owner_min_price_per_sq_ft),
    ownerMaxPricePerSqFt: numberOrNull(row.owner_max_price_per_sq_ft),
    latestRegisteredDate: dateOrNull(row.latest_registered_date),
    latestOwnerDate: dateOrNull(row.latest_owner_date),
    evidenceSource: row.evidence_source,
  };
}

function latestDate(values: Array<string | null>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null
  );
}

function firstNumber(values: Array<number | null>) {
  return values.find((value): value is number => value != null) ?? null;
}

function minNumber(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => value != null);
  return numbers.length ? Math.min(...numbers) : null;
}

function maxNumber(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => value != null);
  return numbers.length ? Math.max(...numbers) : null;
}

function mergeEvidenceRows(
  rows: BuyerSocietyEvidenceRow[],
): BuyerEvidenceSummary[] {
  const grouped = new Map<string, BuyerEvidenceSummary[]>();
  for (const row of rows) {
    const evidence = evidenceFromRow(row);
    const key = evidence.isAllBhks ? 'all' : `bhk:${evidence.bhk ?? ''}`;
    const group = grouped.get(key) ?? [];
    group.push(evidence);
    grouped.set(key, group);
  }

  return [...grouped.values()].map((group) => {
    const registeredCount = group.reduce(
      (total, row) => total + row.registeredCount,
      0,
    );
    const approvedOwnerCount = group.reduce(
      (total, row) => total + row.approvedOwnerCount,
      0,
    );
    const publicOwnerCount = group.reduce(
      (total, row) => total + row.publicOwnerCount,
      0,
    );

    return {
      bhk: group[0].bhk,
      isAllBhks: group[0].isAllBhks,
      registeredCount,
      approvedOwnerCount,
      publicOwnerCount,
      registeredMedianPrice: firstNumber(
        group.map((row) => row.registeredMedianPrice),
      ),
      registeredMedianPricePerSqFt: firstNumber(
        group.map((row) => row.registeredMedianPricePerSqFt),
      ),
      ownerMedianPrice: firstNumber(group.map((row) => row.ownerMedianPrice)),
      ownerMinPrice: minNumber(group.map((row) => row.ownerMinPrice)),
      ownerMaxPrice: maxNumber(group.map((row) => row.ownerMaxPrice)),
      ownerMedianPricePerSqFt: firstNumber(
        group.map((row) => row.ownerMedianPricePerSqFt),
      ),
      ownerMinPricePerSqFt: minNumber(
        group.map((row) => row.ownerMinPricePerSqFt),
      ),
      ownerMaxPricePerSqFt: maxNumber(
        group.map((row) => row.ownerMaxPricePerSqFt),
      ),
      latestRegisteredDate: latestDate(
        group.map((row) => row.latestRegisteredDate),
      ),
      latestOwnerDate: latestDate(group.map((row) => row.latestOwnerDate)),
      evidenceSource:
        registeredCount > 0 && publicOwnerCount > 0
          ? 'combined'
          : registeredCount > 0
            ? 'registered_transaction'
            : publicOwnerCount > 0
              ? 'owner_input'
              : 'none',
    };
  });
}

export function buyerEvidenceFor(society: BuyerSocietySummary, bhk: string) {
  const rows = society.buyerEvidence ?? [];
  return (
    rows.find((row) =>
      bhk === 'All' ? row.isAllBhks : !row.isAllBhks && row.bhk === bhk,
    ) ?? null
  );
}

export function buyerEvidenceDisplay(evidence: BuyerEvidenceSummary | null) {
  const registeredCount = evidence?.registeredCount ?? 0;
  const approvedOwnerCount = evidence?.approvedOwnerCount ?? 0;
  const publicOwnerCount = evidence?.publicOwnerCount ?? 0;
  const publicCount = registeredCount + publicOwnerCount;
  const medianPrice =
    evidence?.registeredMedianPrice ?? evidence?.ownerMedianPrice ?? null;
  const medianPricePerSqFt =
    evidence?.registeredMedianPricePerSqFt ??
    evidence?.ownerMedianPricePerSqFt ??
    null;
  const latestDate =
    [evidence?.latestRegisteredDate, evidence?.latestOwnerDate]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  let label = 'No verified price evidence';
  if (evidence?.evidenceSource === 'combined') {
    label = 'Registered + approved owner evidence';
  } else if (evidence?.evidenceSource === 'registered_transaction') {
    label = 'Registered transaction evidence';
  } else if (evidence?.evidenceSource === 'owner_input') {
    label = 'Admin-approved owner evidence';
  } else if (approvedOwnerCount > 0) {
    label = 'Approved owner evidence';
  }

  return {
    registeredCount,
    approvedOwnerCount,
    publicOwnerCount,
    publicCount,
    medianPrice,
    medianPricePerSqFt,
    latestDate,
    label,
  };
}

export function buildBuyerSocietyCatalogue(
  rows: BuyerSocietyEvidenceRow[],
  permanentSocieties: SocietySummary[],
): BuyerSocietySummary[] {
  const permanentByIdentity = new Map(
    permanentSocieties.map((society) => [
      identityKey(society.name, society.location),
      society,
    ]),
  );
  const permanentByName = new Map<string, SocietySummary>();
  const duplicatePermanentNames = new Set<string>();
  for (const society of permanentSocieties) {
    const key = societyNameKey(society.name);
    if (permanentByName.has(key)) duplicatePermanentNames.add(key);
    else permanentByName.set(key, society);
  }
  for (const key of duplicatePermanentNames) permanentByName.delete(key);

  const inventoryIdsByName = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.flat_inventory_id) continue;
    const key = societyNameKey(row.society);
    const ids = inventoryIdsByName.get(key) ?? new Set<string>();
    ids.add(row.flat_inventory_id);
    inventoryIdsByName.set(key, ids);
  }
  const canonicalInventoryByName = new Map<string, string>();
  for (const [key, ids] of inventoryIdsByName) {
    if (ids.size === 1) canonicalInventoryByName.set(key, [...ids][0]);
  }

  const grouped = new Map<string, BuyerSocietyEvidenceRow[]>();
  for (const row of rows) {
    const canonicalInventoryId = canonicalInventoryByName.get(
      societyNameKey(row.society),
    );
    const catalogueKey = canonicalInventoryId
      ? `inventory:${canonicalInventoryId}`
      : row.catalogue_id;
    const group = grouped.get(catalogueKey) ?? [];
    group.push(row);
    grouped.set(catalogueKey, group);
  }

  return [...grouped.values()]
    .map((group) => {
      const first =
        group.find((row) => row.flat_inventory_id != null) ?? group[0];
      const permanent =
        permanentByIdentity.get(identityKey(first.society, first.location)) ??
        permanentByName.get(societyNameKey(first.society));
      const evidence = mergeEvidenceRows(group);
      const overall = evidence.find((row) => row.isAllBhks) ?? null;
      const publicBhks = evidence
        .filter((row) => !row.isAllBhks && row.bhk)
        .map((row) => row.bhk as string)
        .sort((a, b) => Number(a) - Number(b));
      const display = buyerEvidenceDisplay(overall);
      const fallbackSlug = `${slugPart(first.society)}-${slugPart(
        first.location,
      )}`;

      return {
        slug: permanent?.slug ?? fallbackSlug,
        name: first.society,
        location: first.location,
        bhks: publicBhks.length ? publicBhks : (permanent?.bhks ?? []),
        towers: permanent?.towers ?? [],
        transactionCount: overall?.registeredCount ?? 0,
        medianPrice: display.medianPrice,
        medianPricePerSqFt: display.medianPricePerSqFt,
        latestTransactionDate: display.latestDate,
        flatInventoryId: first.flat_inventory_id,
        builder: first.builder,
        catalogueSource: first.catalogue_source,
        hasPermanentPage: true,
        buyerEvidence: evidence,
      } satisfies BuyerSocietySummary;
    })
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.location.localeCompare(b.location),
    );
}
