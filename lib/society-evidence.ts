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
  confidence: ValuationResult['confidence'];
  bhks: string[];
  latestEvidenceDate: string | null;
  publicOwnerContributionCount: number;
  publicOwnerAggregateCount: number;
};

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
  const societyOwnerAggregates = ownerAggregates.filter(
    (aggregate) => aggregate.society === society.name,
  );
  const bhks = [
    ...new Set(
      registeredRecords
        .map((record) => record.bhk)
        .filter((bhk): bhk is string => Boolean(bhk)),
    ),
  ].sort((a, b) => Number(a) - Number(b));
  const evidenceDates = registeredRecords
    .map((record) => record.registrationDate)
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => b.localeCompare(a));

  return {
    society,
    registeredRecords,
    registeredMedianPrice: median(
      registeredRecords
        .map((record) => record.price)
        .filter((price): price is number => price != null),
    ),
    registeredMedianPricePerSqFt: median(
      registeredRecords
        .map((record) => record.pricePerSqFt)
        .filter((price): price is number => price != null),
    ),
    registeredCount: registeredRecords.length,
    confidence: confidenceForCount(registeredRecords.length),
    bhks,
    latestEvidenceDate: evidenceDates[0] ?? null,
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
  const benchmark = evidence.registeredMedianPrice
    ? `${compactInr(evidence.registeredMedianPrice)} (${wholeInr(evidence.registeredMedianPricePerSqFt)}/sq ft)`
    : 'still being built';
  return `I checked ${evidence.society.name} on FlatData. The registered society benchmark is ${benchmark}, based on ${evidence.registeredCount} supporting ${evidence.registeredCount === 1 ? 'sale' : 'sales'}. Confidence: ${evidence.confidence}. This shares only the public society benchmark—my flat price is not disclosed.`;
}
