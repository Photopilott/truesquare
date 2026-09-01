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
};

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
  const registeredRecords = records.filter(
    (record) =>
      record.society === society.name && isEligibleRegisteredRecord(record),
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
    (aggregate) => aggregate.society === society.name,
  );
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
    registeredMedianPrice: median(
      oneYearRegisteredRecords
        .map((record) => record.price)
        .filter((price): price is number => price != null),
    ),
    registeredMedianPricePerSqFt: median(
      oneYearRegisteredRecords
        .map((record) => record.pricePerSqFt)
        .filter((price): price is number => price != null),
    ),
    registeredCount: oneYearRegisteredRecords.length,
    evidenceWindowStart,
    evidenceWindowEnd,
    latestRegisteredPrice: latestRegisteredRecord?.price ?? null,
    latestRegisteredPricePerSqFt: latestRegisteredRecord?.pricePerSqFt ?? null,
    confidence: confidenceForCount(oneYearRegisteredRecords.length),
    bhks,
    latestEvidenceDate: evidenceWindowEnd,
    publicOwnerContributionCount: societyOwnerAggregates.reduce(
      (total, aggregate) => total + aggregate.approvedCount,
      0,
    ),
    publicOwnerAggregateCount: societyOwnerAggregates.length,
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
  const benchmarkPricePerSqFt =
    evidence.latestRegisteredPricePerSqFt ??
    evidence.society.medianPricePerSqFt;
  return `Found a site that shows what your flat is worth today and how much it's gone up since you bought it. Uses actual registration data, not broker listings.\n${evidence.society.name} is at ${wholeInr(benchmarkPricePerSqFt)}/sq ft right now.`;
}

export function societyWhatsAppText(
  evidence: PublicSocietyEvidence,
  url: string,
) {
  return `${societyShareMessage(evidence)}\n${url}`;
}
