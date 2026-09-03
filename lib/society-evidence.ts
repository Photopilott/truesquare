import type { OwnerPriceAggregate } from './owner-aggregates.ts';
import {
  confidenceForCount,
  median,
  type TransactionRecord,
  type ValuationResult,
} from './valuation-engine.ts';

export type SocietySummary = {
  slug: string;
  name: string;
  location: string;
  bhks: string[];
  towers: string[];
  transactionCount: number;
  medianPrice: number | null;
  medianPricePerSqFt: number | null;
  latestTransactionDate: string | null;
};

export type PublicSocietyEvidence = {
  society: SocietySummary;
  registeredRecords: TransactionRecord[];
  registeredMedianPrice: number | null;
  registeredMedianPricePerSqFt: number | null;
  registeredCount: number;
  evidenceWindowStart: string | null;
  evidenceWindowEnd: string | null;
  latestRegisteredPrice: number | null;
  latestRegisteredPricePerSqFt: number | null;
  confidence: ValuationResult['confidence'];
  bhks: string[];
  latestEvidenceDate: string | null;
  publicOwnerContributionCount: number;
  publicOwnerAggregateCount: number;
  benchmarkMedianPrice: number | null;
  benchmarkMedianPricePerSqFt: number | null;
  benchmarkEvidenceCount: number;
  benchmarkSource: 'registered' | 'owner' | 'combined' | 'none';
};

function societyKey(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/apartments?$/, '');
}

function subtractOneYear(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

function isEligibleRegisteredRecord(record: TransactionRecord) {
  return Boolean(
    record.registrationDate &&
    record.price &&
    record.price > 0 &&
    record.effectiveArea &&
    record.effectiveArea > 0 &&
    record.pricePerSqFt &&
    record.pricePerSqFt > 0,
  );
}

export function buildPublicSocietyEvidence(
  society: SocietySummary,
  records: TransactionRecord[],
  ownerAggregates: OwnerPriceAggregate[],
): PublicSocietyEvidence {
  const societyNameKey = societyKey(society.name);
  const registeredRecords = records.filter(
    (record) =>
      societyKey(record.society) === societyNameKey &&
      isEligibleRegisteredRecord(record),
  );
  const recordsByNewest = [...registeredRecords].sort((a, b) => {
    const dateComparison = (b.registrationDate ?? '').localeCompare(
      a.registrationDate ?? '',
    );
    return dateComparison || b.id.localeCompare(a.id);
  });
  const latestRegisteredRecord = recordsByNewest[0] ?? null;
  const evidenceWindowEnd = latestRegisteredRecord?.registrationDate ?? null;
  const evidenceWindowStart = evidenceWindowEnd
    ? subtractOneYear(evidenceWindowEnd)
    : null;
  const oneYearRegisteredRecords = evidenceWindowStart
    ? registeredRecords.filter(
        (record) => (record.registrationDate ?? '') >= evidenceWindowStart,
      )
    : [];
  const societyOwnerAggregates = ownerAggregates.filter(
    (aggregate) => societyKey(aggregate.society) === societyNameKey,
  );
  const registeredMedianPrice = median(
    oneYearRegisteredRecords
      .map((record) => record.price)
      .filter((price): price is number => price != null),
  );
  const registeredMedianPricePerSqFt = median(
    oneYearRegisteredRecords
      .map((record) => record.pricePerSqFt)
      .filter((price): price is number => price != null),
  );
  const publicOwnerContributionCount = societyOwnerAggregates.reduce(
    (total, aggregate) => total + aggregate.approvedCount,
    0,
  );
  const benchmarkSource =
    oneYearRegisteredRecords.length > 0 && publicOwnerContributionCount > 0
      ? 'combined'
      : oneYearRegisteredRecords.length > 0
        ? 'registered'
        : publicOwnerContributionCount > 0
          ? 'owner'
          : 'none';
  const bhks = [
    ...new Set(
      oneYearRegisteredRecords
        .map((record) => record.bhk)
        .filter((bhk): bhk is string => Boolean(bhk)),
    ),
  ].sort((a, b) => Number(a) - Number(b));
  return {
    society,
    registeredRecords,
    registeredMedianPrice,
    registeredMedianPricePerSqFt,
    registeredCount: oneYearRegisteredRecords.length,
    evidenceWindowStart,
    evidenceWindowEnd,
    latestRegisteredPrice: latestRegisteredRecord?.price ?? null,
    latestRegisteredPricePerSqFt: latestRegisteredRecord?.pricePerSqFt ?? null,
    confidence: confidenceForCount(oneYearRegisteredRecords.length),
    bhks,
    latestEvidenceDate: evidenceWindowEnd,
    publicOwnerContributionCount,
    publicOwnerAggregateCount: societyOwnerAggregates.length,
    benchmarkMedianPrice: registeredMedianPrice ?? society.medianPrice,
    benchmarkMedianPricePerSqFt:
      registeredMedianPricePerSqFt ?? society.medianPricePerSqFt,
    benchmarkEvidenceCount:
      oneYearRegisteredRecords.length + publicOwnerContributionCount,
    benchmarkSource,
  };
}

export function compactInr(value: number | null) {
  if (value == null || Number.isNaN(value)) return 'Not enough evidence';
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function wholeInr(value: number | null) {
  if (value == null || Number.isNaN(value)) return 'Not enough evidence';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function evidenceDate(value: string | null) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function societyShareMessage(evidence: PublicSocietyEvidence) {
  if (evidence.registeredCount > 0) {
    const latestPricePerSqFt =
      evidence.latestRegisteredPricePerSqFt ??
      evidence.society.medianPricePerSqFt;
    return `Found a site that shows what your flat is worth today and how much it's gone up since you bought it. Uses actual registration data, not broker listings.\n${evidence.society.name} is at ${wholeInr(latestPricePerSqFt)}/sq ft right now.`;
  }
  const benchmarkPricePerSqFt = evidence.benchmarkMedianPricePerSqFt;
  return `Found a site that shows the verified price evidence for this society—not broker listings.\n${evidence.society.name} is at ${wholeInr(benchmarkPricePerSqFt)}/sq ft based on registered sales and anonymous, admin-approved owner evidence.`;
}

export function societyWhatsAppText(
  evidence: PublicSocietyEvidence,
  url: string,
) {
  return `${societyShareMessage(evidence)}\n${url}`;
}
