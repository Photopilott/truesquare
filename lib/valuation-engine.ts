import type { OwnerPriceAggregate } from '@/lib/owner-aggregates';

export type TransactionRecord = {
  id: string;
  location: string;
  society: string;
  tower: string | null;
  bhk: string | null;
  registrationDate: string | null;
  rawDate: string;
  price: number | null;
  effectiveArea: number | null;
  pricePerSqFt: number | null;
  areaBasis: string | null;
  saleType: string | null;
  qaNotes: string | null;
  sourceFile: string;
  sourceUrl: string;
};

export type ComparableTier =
  | 'exact-society-bhk'
  | 'same-society-any-bhk'
  | 'same-market-bhk'
  | 'insufficient';

export type ComparableMatch = {
  tier: ComparableTier;
  label: string;
  records: TransactionRecord[];
};

export type ValuationResult = {
  estimate: number | null;
  low: number | null;
  high: number | null;
  confidence: 'Insufficient evidence' | 'Low' | 'Medium' | 'High';
  comparables: TransactionRecord[];
  acquisitionCost: number;
  absoluteAppreciation: number | null;
  annualizedReturn: number | null;
  returnAfterCosts: number | null;
  loanInterest: number;
  matchTier: ComparableTier;
  matchLabel: string;
  ownerAggregate: OwnerPriceAggregate | null;
  snapshotId?: string;
  snapshotCreatedAt?: string;
};

export type ValuationInput = {
  society: string;
  location: string;
  bhk: string;
  areaSqFt: number;
  purchaseDate: string;
  purchasePrice: number;
  stampDuty: number;
  registrationCost: number;
  interiors: number;
  brokerage: number;
  loanAmount: number | null;
  loanTenureYears: number | null;
  loanRate: number | null;
};

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function confidenceForCount(
  count: number,
): ValuationResult['confidence'] {
  if (count === 0) return 'Insufficient evidence';
  if (count <= 2) return 'Low';
  if (count <= 4) return 'Medium';
  return 'High';
}

export function totalLoanInterest(
  principal: number,
  years: number,
  annualRate: number,
) {
  if (!principal || !years || !annualRate) return 0;
  const months = years * 12;
  const rate = annualRate / 1200;
  const emi =
    (principal * rate * Math.pow(1 + rate, months)) /
    (Math.pow(1 + rate, months) - 1);
  return Math.max(0, emi * months - principal);
}

function isValidEvidence(record: TransactionRecord) {
  return Boolean(
    record.registrationDate &&
      record.price &&
      record.effectiveArea &&
      record.effectiveArea > 0 &&
      record.pricePerSqFt &&
      record.pricePerSqFt > 0,
  );
}

export function findComparableMatch(
  records: TransactionRecord[],
  target: { society: string; bhk: string; location: string },
): ComparableMatch {
  const eligible = records.filter(isValidEvidence);
  const tiers: Array<
    Omit<ComparableMatch, 'records'> & {
      matches: (record: TransactionRecord) => boolean;
    }
  > = [
    {
      tier: 'exact-society-bhk',
      label: 'Exact society + BHK',
      matches: (record) =>
        record.society === target.society && record.bhk === target.bhk,
    },
    {
      tier: 'same-society-any-bhk',
      label: 'Same society · any BHK',
      matches: (record) => record.society === target.society,
    },
    {
      tier: 'same-market-bhk',
      label: 'Same micro-market + BHK',
      matches: (record) =>
        record.location === target.location && record.bhk === target.bhk,
    },
  ];

  for (const tier of tiers) {
    const matches = eligible.filter(tier.matches);
    if (matches.length)
      return { tier: tier.tier, label: tier.label, records: matches };
  }

  return {
    tier: 'insufficient',
    label: 'No evidence in any matching tier',
    records: [],
  };
}

export function calculateValuation(
  input: ValuationInput,
  records: TransactionRecord[],
  ownerAggregates: OwnerPriceAggregate[],
): ValuationResult {
  const comparableMatch = findComparableMatch(records, input);
  const comparables = comparableMatch.records;
  const impliedValues = comparables.map(
    (record) => (record.pricePerSqFt ?? 0) * input.areaSqFt,
  );
  const estimate = median(impliedValues);
  const loanInterest = totalLoanInterest(
    input.loanAmount ?? 0,
    input.loanTenureYears ?? 0,
    input.loanRate ?? 0,
  );
  const acquisitionCost =
    input.purchasePrice +
    input.stampDuty +
    input.registrationCost +
    input.interiors +
    input.brokerage +
    loanInterest;
  let low: number | null = null;
  let high: number | null = null;
  if (impliedValues.length === 1 && estimate) {
    low = estimate * 0.85;
    high = estimate * 1.15;
  }
  if (impliedValues.length > 1) {
    low = Math.min(...impliedValues);
    high = Math.max(...impliedValues);
  }
  const purchaseDate = new Date(input.purchaseDate);
  const yearsOwned = Math.max(
    (Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    0.01,
  );
  const annualizedReturn =
    estimate && acquisitionCost > 0
      ? Math.pow(estimate / acquisitionCost, 1 / yearsOwned) - 1
      : null;

  return {
    estimate,
    low,
    high,
    confidence: confidenceForCount(comparables.length),
    comparables,
    acquisitionCost,
    absoluteAppreciation: estimate ? estimate - input.purchasePrice : null,
    returnAfterCosts: estimate ? estimate - acquisitionCost : null,
    annualizedReturn,
    loanInterest,
    matchTier: comparableMatch.tier,
    matchLabel: comparableMatch.label,
    ownerAggregate:
      ownerAggregates.find(
        (aggregate) =>
          aggregate.society === input.society && aggregate.bhk === input.bhk,
      ) ?? null,
  };
}
