'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  ReactElement,
  SyntheticEvent,
  useEffect,
  useId,
  useState,
} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileSearch,
  Home,
  Info,
  LockKeyhole,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type SocietySummary = {
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

type TransactionRecord = {
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

type OwnerForm = {
  society: string;
  tower: string;
  floor: string;
  bhk: string;
  area: string;
  areaType: 'superBuiltUp' | 'carpet';
  carParks: string;
  purchaseDate: string;
  purchasePrice: string;
  stampDuty: string;
  registrationCost: string;
  interiors: string;
  facing: string;
  brokerage: string;
  loanAmount: string;
  loanTenure: string;
  loanRate: string;
};

type ValuationResult = {
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
};

type ComparableTier =
  | 'exact-society-bhk'
  | 'same-society-any-bhk'
  | 'same-market-bhk'
  | 'insufficient';

type ComparableMatch = {
  tier: ComparableTier;
  label: string;
  records: TransactionRecord[];
};

type BuyerEvidence = ComparableMatch & {
  bhkBreakdown: string;
};

const EMPTY_FORM: OwnerForm = {
  society: '',
  tower: '',
  floor: '',
  bhk: '',
  area: '',
  areaType: 'superBuiltUp',
  carParks: '1',
  purchaseDate: '',
  purchasePrice: '',
  stampDuty: '',
  registrationCost: '',
  interiors: '',
  facing: '',
  brokerage: '',
  loanAmount: '',
  loanTenure: '',
  loanRate: '',
};

const LOCATIONS = ['Sarjapur Road', 'Bellandur', 'Marathahalli', 'Haralur'];

function parseIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date;
}

function parseIndianCurrency(raw: string) {
  const value = raw
    .toLowerCase()
    .replace(/[₹,\s]/g, '')
    .trim();
  if (!value) return 0;
  const match = value.match(
    /^([0-9]*\.?[0-9]+)(crore|cr|lakh|lac|lakhs|lacs|k|thousand)?$/,
  );
  if (!match) return Number.NaN;
  const base = Number(match[1]);
  const unit = match[2];
  if (unit === 'crore' || unit === 'cr') return base * 10_000_000;
  if (unit === 'lakh' || unit === 'lac' || unit === 'lakhs' || unit === 'lacs')
    return base * 100_000;
  if (unit === 'k' || unit === 'thousand') return base * 1_000;
  return base;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatInr(value: number | null, compact = false) {
  if (value == null || Number.isNaN(value)) return '—';
  if (compact) {
    if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
    if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRoundedInr(value: number) {
  const step = 500_000;
  return formatInr(Math.round(value / step) * step, true);
}

function formatRoundedInrRange(low: number, high: number) {
  return `roughly ${formatRoundedInr(low)}–${formatRoundedInr(high)}`;
}

function formatRoundedPercentRange(low: number, high: number) {
  const roundedLow = Math.floor((Math.min(low, high) * 100) / 5) * 5;
  const roundedHigh = Math.ceil((Math.max(low, high) * 100) / 5) * 5;
  return `roughly ${roundedLow}–${roundedHigh}% over the period`;
}

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function confidenceForCount(count: number): ValuationResult['confidence'] {
  if (count === 0) return 'Insufficient evidence';
  if (count <= 2) return 'Low';
  if (count <= 4) return 'Medium';
  return 'High';
}

function totalLoanInterest(
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

function fieldError(errors: Record<string, string>, name: string) {
  return errors[name] ? (
    <p role="alert" className="mt-1 text-xs text-destructive">
      {errors[name]}
    </p>
  ) : null;
}

function FormField({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const childArray = Children.toArray(children);
  const controlIndex = childArray.findIndex((child) => isValidElement(child));
  let controlId = generatedId;

  if (controlIndex >= 0) {
    const control = childArray[controlIndex] as ReactElement<{ id?: string }>;
    controlId = control.props.id ?? generatedId;
    childArray[controlIndex] = cloneElement(control, { id: controlId });
  }

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label htmlFor={controlId}>{label}</Label>
        {optional && (
          <span className="text-[11px] text-muted-foreground">Optional</span>
        )}
      </div>
      {childArray}
    </div>
  );
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

function findComparableMatch(
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

function BrandMark() {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-[11px] bg-foreground"
      aria-hidden="true"
    >
      <span className="size-3 rounded-full bg-background" />
    </span>
  );
}

export function AppHeader({ active }: { active: 'owner' | 'buyer' | 'explore' }) {
  return (
    <>
      <header className="sticky top-3 z-40 px-4">
        <div className="ts-shell flex min-h-[74px] items-center justify-between gap-6 rounded-[14px] border border-foreground/10 bg-card/95 px-4 shadow-[0_10px_26px_rgba(38,29,18,.10)] backdrop-blur-xl sm:px-6">
          <Link
            className="flex items-center gap-3"
            href="/"
            aria-label="TrueSquare home"
          >
            <BrandMark />
            <span className="font-heading text-[31px] font-medium leading-none tracking-[-0.03em]">
              TrueSquare
            </span>
          </Link>
          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Product navigation"
          >
            <Link
              href="/owner"
              className={`rounded-[8px] px-4 py-2.5 text-[13px] font-medium ${active === 'owner' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            >
              For owners
            </Link>
            <Link
              href="/buyer"
              className={`rounded-[8px] px-4 py-2.5 text-[13px] font-medium ${active === 'buyer' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            >
              For buyers
            </Link>
            <Link
              href="/explore"
              className={`rounded-[8px] px-4 py-2.5 text-[13px] font-medium ${active === 'explore' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            >
              Explore
            </Link>
            <Link
              href="/developer-ratings.html"
              className="rounded-[8px] px-4 py-2.5 text-[13px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Developer ratings
            </Link>
          </nav>
          <div className="hidden items-center gap-2 text-[11px] text-muted-foreground xl:flex">
            <ShieldCheck className="size-4 text-[#126D38]" />
            Evidence-first
          </div>
        </div>
      </header>
      <nav
        className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center justify-around rounded-[14px] border border-border bg-card/95 p-1.5 shadow-[0_16px_50px_rgba(34,27,19,.16)] backdrop-blur-xl lg:hidden"
        aria-label="Mobile product navigation"
      >
        <Link
          href="/"
          className="grid min-h-11 min-w-14 place-items-center rounded-[8px] font-mono text-[8px] text-muted-foreground"
        >
          HOME
        </Link>
        <Link
          href="/owner"
          className={`grid min-h-11 min-w-14 place-items-center rounded-[8px] font-mono text-[8px] ${active === 'owner' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
        >
          OWNER
        </Link>
        <Link
          href="/buyer"
          className={`grid min-h-11 min-w-14 place-items-center rounded-[8px] font-mono text-[8px] ${active === 'buyer' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
        >
          BUYER
        </Link>
        <Link
          href="/explore"
          className={`grid min-h-11 min-w-14 place-items-center rounded-[8px] font-mono text-[8px] ${active === 'explore' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
        >
          EXPLORE
        </Link>
        <Link
          href="/developer-ratings.html"
          className="grid min-h-11 min-w-14 place-items-center rounded-[8px] font-mono text-[8px] text-muted-foreground"
        >
          RATINGS
        </Link>
      </nav>
    </>
  );
}

export function PropertyIntelligenceApp({
  societies,
  records,
  initialView,
}: {
  societies: SocietySummary[];
  records: TransactionRecord[];
  initialView: 'owner' | 'buyer';
}) {
  const [view, setView] = useState<'home' | 'owner' | 'buyer'>(initialView);
  const [ownerForm, setOwnerForm] = useState<OwnerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [gateContext, setGateContext] = useState<'owner' | 'buyer'>('owner');
  const [covenantAccepted, setCovenantAccepted] = useState(false);
  const [plausibilityReviewed, setPlausibilityReviewed] = useState(false);
  const [plausibilityMessage, setPlausibilityMessage] = useState('');
  const [buyerUnlocked, setBuyerUnlocked] = useState(false);
  const [selectedSociety, setSelectedSociety] = useState<SocietySummary | null>(
    null,
  );
  const [locationFilter, setLocationFilter] = useState('All');
  const [bhkFilter, setBhkFilter] = useState('All');
  const [budgetFilter, setBudgetFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [unknownOpen, setUnknownOpen] = useState(false);
  const [unknownSent, setUnknownSent] = useState(false);
  const [unknownName, setUnknownName] = useState('');
  const [unknownLocation, setUnknownLocation] = useState(LOCATIONS[0]);
  const [unknownDetails, setUnknownDetails] = useState('');
  const [unknownError, setUnknownError] = useState('');
  const [visibleSocieties, setVisibleSocieties] = useState(18);

  useEffect(() => {
    const stored = window.localStorage.getItem('truesquare-owner-draft');
    if (stored) {
      try {
        const savedDraft = { ...EMPTY_FORM, ...JSON.parse(stored) };
        const frame = window.requestAnimationFrame(() =>
          setOwnerForm(savedDraft),
        );
        return () => window.cancelAnimationFrame(frame);
      } catch {
        /* ignore corrupt local draft */
      }
    }
  }, []);

  useEffect(() => {
    if (view === 'owner' && !valuation)
      window.localStorage.setItem(
        'truesquare-owner-draft',
        JSON.stringify(ownerForm),
      );
  }, [ownerForm, valuation, view]);

  function getBuyerEvidence(
    society: SocietySummary,
    selectedBhk: string,
  ): BuyerEvidence {
    if (selectedBhk !== 'All') {
      const match = findComparableMatch(records, {
        society: society.name,
        bhk: selectedBhk,
        location: society.location,
      });
      return {
        ...match,
        bhkBreakdown: `${selectedBhk} BHK (${match.records.length})`,
      };
    }

    const matches = society.bhks.map((bhk) => ({
      bhk,
      match: findComparableMatch(records, {
        society: society.name,
        bhk,
        location: society.location,
      }),
    }));
    const uniqueRecords = [
      ...new Map(
        matches
          .flatMap(({ match }) => match.records)
          .map((record) => [record.id, record]),
      ).values(),
    ];
    return {
      tier: uniqueRecords.length ? 'same-society-any-bhk' : 'insufficient',
      label: uniqueRecords.length
        ? 'Tiered evidence across available BHKs'
        : 'No evidence in any matching tier',
      records: uniqueRecords,
      bhkBreakdown:
        matches
          .filter(({ match }) => match.records.length)
          .map(({ bhk, match }) => `${bhk} BHK (${match.records.length})`)
          .join(', ') || 'Sparse',
    };
  }

  const selectedSocietySummary = societies.find(
    (society) => society.name === ownerForm.society,
  );
  const buyerSocietyEvidence = selectedSociety
    ? getBuyerEvidence(selectedSociety, bhkFilter)
    : null;
  const buyerSocietyRecords = buyerSocietyEvidence?.records ?? [];

  const filteredSocieties = (() => {
    const budget = budgetFilter === 'All' ? Infinity : Number(budgetFilter);
    return societies.filter((society) => {
      const matchesLocation =
        locationFilter === 'All' || society.location === locationFilter;
      const matchingRecords = getBuyerEvidence(society, bhkFilter).records;
      const matchesBhk = bhkFilter === 'All' || matchingRecords.length > 0;
      const matchingMedian = median(
        matchingRecords
          .map((record) => record.price)
          .filter((price): price is number => Boolean(price)),
      );
      const matchesBudget =
        budgetFilter === 'All' ||
        Boolean(matchingMedian && matchingMedian <= budget);
      const matchesSearch = society.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesLocation && matchesBhk && matchesBudget && matchesSearch;
    });
  })();

  function updateOwner<K extends keyof OwnerForm>(key: K, value: OwnerForm[K]) {
    setOwnerForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    if (key === 'society')
      setOwnerForm((current) => ({
        ...current,
        society: value as string,
        tower: '',
      }));
  }

  function eligibleComparables(form: OwnerForm) {
    const society = societies.find((item) => item.name === form.society);
    return findComparableMatch(records, {
      society: form.society,
      bhk: form.bhk,
      location: society?.location ?? '',
    });
  }

  function buildValuation(form: OwnerForm): ValuationResult {
    const comparableMatch = eligibleComparables(form);
    const comparables = comparableMatch.records;
    const area = Number(form.area);
    const impliedValues = comparables.map(
      (record) => (record.pricePerSqFt ?? 0) * area,
    );
    const estimate = median(impliedValues);
    const loanInterest = totalLoanInterest(
      parseIndianCurrency(form.loanAmount),
      Number(form.loanTenure),
      Number(form.loanRate),
    );
    const acquisitionCost =
      [
        'purchasePrice',
        'stampDuty',
        'registrationCost',
        'interiors',
        'brokerage',
      ].reduce(
        (sum, key) =>
          sum +
          (parseIndianCurrency(form[key as keyof OwnerForm] as string) || 0),
        0,
      ) + loanInterest;
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
    const purchaseDate = new Date(form.purchaseDate);
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
      absoluteAppreciation: estimate
        ? estimate - parseIndianCurrency(form.purchasePrice)
        : null,
      returnAfterCosts: estimate ? estimate - acquisitionCost : null,
      annualizedReturn,
      loanInterest,
      matchTier: comparableMatch.tier,
      matchLabel: comparableMatch.label,
    };
  }

  function validateOwner() {
    const next: Record<string, string> = {};
    const requiredMessages: Partial<Record<keyof OwnerForm, string>> = {
      society: 'Select a society.',
      tower: 'Select a tower or block.',
      floor: 'Enter the floor number.',
      bhk: 'Select the apartment configuration.',
      area: 'Enter the area in square feet.',
      purchaseDate: 'Enter the purchase date in YYYY-MM-DD format.',
      purchasePrice: 'Enter the purchase price.',
      stampDuty: 'Enter the stamp duty paid (use 0 if none).',
      registrationCost: 'Enter the registration cost paid (use 0 if none).',
      interiors: 'Enter the interior cost paid (use 0 if none).',
    };
    Object.entries(requiredMessages).forEach(([key, message]) => {
      if (!ownerForm[key as keyof OwnerForm]) next[key] = message;
    });
    if (ownerForm.area && Number(ownerForm.area) <= 0)
      next.area = 'Area must be greater than zero.';
    const purchaseDate = ownerForm.purchaseDate
      ? parseIsoDate(ownerForm.purchaseDate)
      : null;
    if (ownerForm.purchaseDate && !purchaseDate)
      next.purchaseDate = 'Use a valid date in YYYY-MM-DD format.';
    if (purchaseDate && purchaseDate > new Date())
      next.purchaseDate = 'Purchase date cannot be in the future.';
    [
      'purchasePrice',
      'stampDuty',
      'registrationCost',
      'interiors',
      'brokerage',
      'loanAmount',
    ].forEach((key) => {
      const value = ownerForm[key as keyof OwnerForm] as string;
      if (value && Number.isNaN(parseIndianCurrency(value)))
        next[key] = 'Use a value such as 1.25 crore, 85 lakh, or 12500000.';
    });
    if (
      (ownerForm.loanAmount || ownerForm.loanTenure || ownerForm.loanRate) &&
      !(ownerForm.loanAmount && ownerForm.loanTenure && ownerForm.loanRate)
    ) {
      next.loanAmount =
        'Enter loan amount, tenure, and interest rate together—or leave all three blank.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function beginOwnerReveal(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateOwner()) return;
    const comps = eligibleComparables(ownerForm).records;
    const compMedian = median(comps.map((record) => record.pricePerSqFt ?? 0));
    const submittedPpsf =
      parseIndianCurrency(ownerForm.purchasePrice) / Number(ownerForm.area);
    if (
      !plausibilityReviewed &&
      compMedian &&
      (submittedPpsf < compMedian * 0.5 || submittedPpsf > compMedian * 2)
    ) {
      setPlausibilityMessage(
        `Your submitted price works out to ${formatInr(submittedPpsf)} per sq ft, while the like-for-like registered median is ${formatInr(compMedian)}. Both figures are estimates—please review before continuing.`,
      );
      return;
    }
    setGateContext('owner');
    setShowGate(true);
  }

  function completeAccessGate() {
    if (!covenantAccepted) return;
    setShowGate(false);
    if (gateContext === 'owner') {
      setValuation(buildValuation(ownerForm));
      window.localStorage.removeItem('truesquare-owner-draft');
    } else setBuyerUnlocked(true);
  }

  function resetHome() {
    window.location.assign('/');
  }

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground lg:pb-0">
      <AppHeader active={view === 'buyer' ? 'buyer' : 'owner'} />
      {view === 'home' && (
        <HomeView
          societies={societies.slice(0, 4)}
          onOwner={() => setView('owner')}
          onBuyer={() => setView('buyer')}
        />
      )}
      {view === 'buyer' && (
        <div id="buyer-catalogue" className="ts-shell scroll-mt-24 py-12 sm:py-20">
          <Button variant="ghost" className="mb-5 -ml-3" onClick={resetHome}>
            <ArrowLeft /> Home
          </Button>
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
            <section>
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                BUYER CATALOGUE
              </p>
              <h1 className="mt-4 text-balance font-heading text-[50px] font-normal leading-[.96] tracking-[-0.03em] sm:text-[68px]">
                Your first home shouldn&apos;t require this much price guessing.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
                Browse the catalog freely. Sign in with Google only when you
                want to open a society&apos;s full evidence. Email is all the
                production gate will ask for.
              </p>
              <div className="mt-8 grid gap-4 rounded-[15px] bg-foreground p-5 text-background shadow-[0_18px_50px_rgba(34,27,19,.10)] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <FormField label="Search society">
                  <Input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setVisibleSocieties(18);
                    }}
                    placeholder="e.g. Sobha, Purva…"
                  />
                </FormField>
                <FormField label="Location">
                  <NativeSelect
                    className="w-full"
                    value={locationFilter}
                    onChange={(event) => {
                      setLocationFilter(event.target.value);
                      setVisibleSocieties(18);
                    }}
                  >
                    <NativeSelectOption value="All">
                      All four markets
                    </NativeSelectOption>
                    {LOCATIONS.map((location) => (
                      <NativeSelectOption key={location} value={location}>
                        {location}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField label="BHK">
                  <NativeSelect
                    className="w-full"
                    value={bhkFilter}
                    onChange={(event) => {
                      setBhkFilter(event.target.value);
                      setVisibleSocieties(18);
                    }}
                  >
                    <NativeSelectOption value="All">
                      All BHKs
                    </NativeSelectOption>
                    {['1', '2', '2.5', '3', '3.5', '4', '4.5'].map((bhk) => (
                      <NativeSelectOption key={bhk} value={bhk}>
                        {bhk} BHK
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField label="Maximum budget">
                  <NativeSelect
                    className="w-full"
                    value={budgetFilter}
                    onChange={(event) => {
                      setBudgetFilter(event.target.value);
                      setVisibleSocieties(18);
                    }}
                  >
                    <NativeSelectOption value="All">
                      Any budget
                    </NativeSelectOption>
                    <NativeSelectOption value="10000000">
                      Up to ₹1 Cr
                    </NativeSelectOption>
                    <NativeSelectOption value="20000000">
                      Up to ₹2 Cr
                    </NativeSelectOption>
                    <NativeSelectOption value="30000000">
                      Up to ₹3 Cr
                    </NativeSelectOption>
                    <NativeSelectOption value="50000000">
                      Up to ₹5 Cr
                    </NativeSelectOption>
                  </NativeSelect>
                </FormField>
              </div>
              <Alert className="mt-4 rounded-[12px] border-[#A9DCB8] bg-accent">
                <Info />
                <AlertTitle>Workbook data boundary</AlertTitle>
                <AlertDescription>
                  {records.length} scoped sale records from the supplied
                  workbook. Mortgages, villas, plots, unsupported locations, and
                  invalid evidence are excluded.
                </AlertDescription>
              </Alert>
              <div className="mt-5 rounded-[12px] border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
                <p>Listing portals show what sellers hope for.</p>
                <p>Brokers show what closes the deal in front of them.</p>
                <p>Developers show what they&apos;ve priced this quarter.</p>
                <p className="mt-3 font-medium text-foreground">Nobody publishes what apartments in these societies have actually sold for. So we did.</p>
              </div>
            </section>
            <section>
              <div className="mb-5 flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
                  {filteredSocieties.length} SOCIETIES FOUND
                </p>
                <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
                  NO PAID RANKING
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredSocieties.slice(0, visibleSocieties).map((society) => {
                  const buyerEvidence = getBuyerEvidence(society, bhkFilter);
                  const matchingRecords = buyerEvidence.records;
                  const displayPrice = median(
                    matchingRecords
                      .map((record) => record.price)
                      .filter((price): price is number => Boolean(price)),
                  );
                  const displayPpsf = median(
                    matchingRecords
                      .map((record) => record.pricePerSqFt)
                      .filter((price): price is number => Boolean(price)),
                  );
                  const evidenceCount = matchingRecords.length;
                  const latestDate =
                    [...matchingRecords].sort((a, b) =>
                      (b.registrationDate ?? '').localeCompare(
                        a.registrationDate ?? '',
                      ),
                    )[0]?.registrationDate ?? null;
                  return (
                    <button
                      key={society.slug}
                      type="button"
                      className="block w-full text-left"
                      aria-label={`View ${society.name} details`}
                      onClick={() => {
                        setSelectedSociety(society);
                        setBuyerUnlocked(false);
                      }}
                    >
                      <Card className="cursor-pointer transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(34,27,19,.10)]">
                        <CardHeader>
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant="secondary" className="rounded-[2px]">
                              {society.location}
                            </Badge>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {evidenceCount} SUPPORTING
                            </span>
                          </div>
                          <CardTitle className="mt-3 text-[23px]">
                            {society.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          <Metric
                            label={
                              bhkFilter === 'All'
                                ? 'Median price'
                                : `${bhkFilter} BHK median`
                            }
                            value={formatInr(displayPrice, true)}
                          />
                          <Metric
                            label="Median / sq ft"
                            value={
                              displayPpsf ? `${formatInr(displayPpsf)}` : '—'
                            }
                          />
                          <Metric
                            label="BHK evidence"
                            value={buyerEvidence.bhkBreakdown}
                          />
                          <Metric
                            label="Confidence"
                            value={confidenceForCount(evidenceCount)}
                          />
                        </CardContent>
                        <CardFooter className="justify-between text-xs text-muted-foreground">
                          <span>{buyerEvidence.label} · Latest: {formatDate(latestDate)}</span>
                          <span className="flex shrink-0 items-center gap-1 font-medium text-foreground">
                            View evidence <ChevronRight className="size-4" />
                          </span>
                        </CardFooter>
                      </Card>
                    </button>
                  );
                })}
              </div>
              {visibleSocieties < filteredSocieties.length && (
                <Button
                  variant="outline"
                  className="mt-5 w-full"
                  onClick={() => setVisibleSocieties((count) => count + 18)}
                >
                  Show more societies
                </Button>
              )}
              {!filteredSocieties.length && (
                <div className="rounded-[12px] border border-dashed border-border bg-card p-10 text-center">
                  <FileSearch className="mx-auto size-8 text-muted-foreground" />
                  <h2 className="mt-4 font-heading text-3xl font-normal">
                    No supported society matches
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create an on-screen request record. Email fulfilment is
                    planned for V2 and is not promised within 48 hours in V1.
                  </p>
                  <Button
                    className="mt-5"
                    variant="outline"
                    onClick={() => {
                      setUnknownOpen(true);
                      setUnknownSent(false);
                      setUnknownName(searchQuery.trim());
                      setUnknownLocation(LOCATIONS[0]);
                      setUnknownDetails('');
                      setUnknownError('');
                    }}
                  >
                    Submit missing society
                  </Button>
                </div>
              )}
            </section>
          </div>
          <BuyerEditorialSections />
        </div>
      )}

      {view === 'owner' && !valuation && (
        <div className="ts-shell py-12 sm:py-20">
          <Button variant="ghost" className="mb-5 -ml-3" onClick={resetHome}>
            <ArrowLeft /> Home
          </Button>
          <div className="grid min-w-0 gap-12 lg:grid-cols-[.76fr_1.24fr] lg:gap-16">
            <aside className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                OWNER VALUATION
              </p>
              <h1 className="mt-4 text-balance font-heading text-[52px] font-normal leading-[.96] tracking-[-0.03em] sm:text-[70px]">
                Your flat is an asset. Track it like one.
              </h1>
              <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
                Track your apartment&apos;s value and returns the way you track
                everything else you own. Currently live for gated societies in
                Sarjapur Road, Bellandur, Marathahalli, and Haralur.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <a href="#property-form" className="flex min-h-12 items-center justify-center rounded-[9px] border border-foreground bg-foreground px-5 text-sm font-semibold text-background">Track my property</a>
                <Link href="/buyer" className="flex min-h-12 items-center justify-center rounded-[9px] border border-foreground px-5 text-sm font-semibold">Research a society</Link>
              </div>
              <div className="mt-7 space-y-3">
                {[
                  'Evidence-based',
                  'Anonymous',
                  'Never sold to brokers or developers',
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-sm">
                    <CheckCircle2 className="size-5 shrink-0 text-accent-foreground" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Alert className="mt-7 rounded-[12px] border-[#A9DCB8] bg-accent">
                <LockKeyhole />
                <AlertTitle>How it works</AlertTitle>
                <AlertDescription>
                  Add what you paid → unlock your valuation and returns → see
                  registered trades in your society. Trade notifications are
                  planned for a later release and are not active in V1.
                </AlertDescription>
              </Alert>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">Priced from registered transactions, with pooled owner contributions planned once secure production storage is connected — and a confidence level on every estimate.</p>
              <p className="mt-6 font-heading text-2xl leading-snug">You&apos;d never hold a mutual fund without a NAV. Why hold ₹1.5 crore without one?</p>
            </aside>

            <form
              id="property-form"
              onSubmit={beginOwnerReveal}
              className="min-w-0 rounded-[14px] border border-border bg-card p-5 shadow-[0_18px_50px_rgba(34,27,19,.10)] sm:p-8"
            >
              <div className="mb-7">
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                  PROPERTY MATCH
                </p>
                <h2 className="mt-2 font-heading text-3xl font-normal">
                  Tell us about your apartment
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  An unfinished form is saved only in this browser.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Society">
                  <NativeSelect
                    className="w-full"
                    value={ownerForm.society}
                    onChange={(event) =>
                      updateOwner('society', event.target.value)
                    }
                  >
                    <NativeSelectOption value="">
                      Select society
                    </NativeSelectOption>
                    {societies.map((society) => (
                      <NativeSelectOption
                        key={society.slug}
                        value={society.name}
                      >
                        {society.name} — {society.location}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {fieldError(errors, 'society')}
                </FormField>
                <FormField label="Tower / block">
                  <NativeSelect
                    className="w-full"
                    value={ownerForm.tower}
                    onChange={(event) =>
                      updateOwner('tower', event.target.value)
                    }
                    disabled={!ownerForm.society}
                  >
                    <NativeSelectOption value="">
                      Select tower
                    </NativeSelectOption>
                    {selectedSocietySummary?.towers.map((tower) => (
                      <NativeSelectOption key={tower} value={tower}>
                        {tower}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {fieldError(errors, 'tower')}
                </FormField>
                <FormField label="Floor">
                  <Input
                    value={ownerForm.floor}
                    onChange={(event) =>
                      updateOwner('floor', event.target.value)
                    }
                    placeholder="e.g. 8"
                  />
                  {fieldError(errors, 'floor')}
                </FormField>
                <FormField label="BHK">
                  <NativeSelect
                    className="w-full"
                    value={ownerForm.bhk}
                    onChange={(event) => updateOwner('bhk', event.target.value)}
                  >
                    <NativeSelectOption value="">Select BHK</NativeSelectOption>
                    {['1', '2', '2.5', '3', '3.5', '4', '4.5'].map((bhk) => (
                      <NativeSelectOption key={bhk} value={bhk}>
                        {bhk} BHK
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {fieldError(errors, 'bhk')}
                </FormField>
                <FormField label="Area">
                  <Input
                    type="number"
                    min="1"
                    value={ownerForm.area}
                    onChange={(event) =>
                      updateOwner('area', event.target.value)
                    }
                    placeholder="e.g. 1450"
                  />
                  {fieldError(errors, 'area')}
                </FormField>
                <FormField label="Area type">
                  <NativeSelect
                    className="w-full"
                    value={ownerForm.areaType}
                    onChange={(event) =>
                      updateOwner(
                        'areaType',
                        event.target.value as OwnerForm['areaType'],
                      )
                    }
                  >
                    <NativeSelectOption value="superBuiltUp">
                      Super built-up
                    </NativeSelectOption>
                    <NativeSelectOption value="carpet">
                      Carpet
                    </NativeSelectOption>
                  </NativeSelect>
                </FormField>
                <FormField label="Car parks">
                  <NativeSelect
                    className="w-full"
                    value={ownerForm.carParks}
                    onChange={(event) =>
                      updateOwner('carParks', event.target.value)
                    }
                  >
                    <NativeSelectOption value="1">
                      1 car park
                    </NativeSelectOption>
                    <NativeSelectOption value="2">
                      2 car parks
                    </NativeSelectOption>
                  </NativeSelect>
                </FormField>
                <FormField label="Purchase date">
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="YYYY-MM-DD"
                    value={ownerForm.purchaseDate}
                    onChange={(event) =>
                      updateOwner('purchaseDate', event.target.value)
                    }
                  />
                  {fieldError(errors, 'purchaseDate')}
                </FormField>
              </div>
              <Separator className="my-7" />
              <div className="mb-5">
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                  ACQUISITION COSTS
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Indian formats such as “1.25 crore” and “85 lakh” are
                  accepted.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <CurrencyField
                  label="Purchase price"
                  name="purchasePrice"
                  value={ownerForm.purchasePrice}
                  onChange={(value) => updateOwner('purchasePrice', value)}
                  errors={errors}
                />
                <CurrencyField
                  label="Stamp duty"
                  name="stampDuty"
                  value={ownerForm.stampDuty}
                  onChange={(value) => updateOwner('stampDuty', value)}
                  errors={errors}
                />
                <CurrencyField
                  label="Registration cost"
                  name="registrationCost"
                  value={ownerForm.registrationCost}
                  onChange={(value) => updateOwner('registrationCost', value)}
                  errors={errors}
                />
                <CurrencyField
                  label="Interior cost"
                  name="interiors"
                  value={ownerForm.interiors}
                  onChange={(value) => updateOwner('interiors', value)}
                  errors={errors}
                />
                <FormField label="Facing / view" optional>
                  <Input
                    value={ownerForm.facing}
                    onChange={(event) =>
                      updateOwner('facing', event.target.value)
                    }
                    placeholder="e.g. East, lake view"
                  />
                </FormField>
                <CurrencyField
                  label="Brokerage"
                  name="brokerage"
                  value={ownerForm.brokerage}
                  onChange={(value) => updateOwner('brokerage', value)}
                  errors={errors}
                  optional
                />
              </div>
              <details className="mt-7 rounded-[10px] border border-border bg-secondary p-5">
                <summary className="cursor-pointer font-medium">
                  Add optional loan interest
                </summary>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  The calculation adds total scheduled interest over the full
                  tenure as a cost of ownership. It does not model equity
                  return.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <CurrencyField
                    label="Original loan"
                    name="loanAmount"
                    value={ownerForm.loanAmount}
                    onChange={(value) => updateOwner('loanAmount', value)}
                    errors={errors}
                    optional
                  />
                  <FormField label="Tenure (years)" optional>
                    <Input
                      type="number"
                      min="1"
                      value={ownerForm.loanTenure}
                      onChange={(event) =>
                        updateOwner('loanTenure', event.target.value)
                      }
                    />
                  </FormField>
                  <FormField label="Interest rate %" optional>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ownerForm.loanRate}
                      onChange={(event) =>
                        updateOwner('loanRate', event.target.value)
                      }
                    />
                  </FormField>
                </div>
              </details>
              {plausibilityMessage && (
                <Alert variant="destructive" className="mt-6">
                  <CircleAlert />
                  <AlertTitle>
                    Please review this estimate comparison
                  </AlertTitle>
                  <AlertDescription>{plausibilityMessage}</AlertDescription>
                  <div className="col-start-2 mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPlausibilityReviewed(true);
                        setPlausibilityMessage('');
                        setGateContext('owner');
                        setShowGate(true);
                      }}
                    >
                      I reviewed it, continue
                    </Button>
                  </div>
                </Alert>
              )}
              <Button
                type="submit"
                size="lg"
                className="mt-7 h-[58px] w-full font-mono text-[11px] tracking-[0.12em]"
              >
                TRACK MY PROPERTY <ArrowRight />
              </Button>
            </form>
          </div>
        </div>
      )}

      {view === 'owner' && valuation && (
        <OwnerResult
          form={ownerForm}
          result={valuation}
          onBack={() => setValuation(null)}
        />
      )}

      <Dialog open={showGate} onOpenChange={setShowGate}>
        <DialogContent className="sm:max-w-md sm:p-7">
          <DialogHeader>
            <div className="mb-2 grid size-12 place-items-center rounded-[17px] bg-primary text-primary-foreground">
              <LockKeyhole className="size-5" />
            </div>
            <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
              DATA COVENANT
            </p>
            <DialogTitle>Sign in only when you unlock intelligence</DialogTitle>
            <DialogDescription>
              Accept the data covenant to reveal the requested evidence. Google
              sign-in will request only your email when account access is
              connected.
            </DialogDescription>
          </DialogHeader>
          <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-secondary p-4 text-sm leading-relaxed">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-primary"
              checked={covenantAccepted}
              onChange={(event) => setCovenantAccepted(event.target.checked)}
            />
            <span>
              I accept the data covenant. My exact purchase price will not be
              shown publicly or used for advertising, targeting, broker access,
              or developer access.
            </span>
          </label>
          <DialogFooter className="sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0">
            <Button
              className="h-13 w-full font-mono text-[11px] tracking-[0.1em]"
              disabled={!covenantAccepted}
              onClick={completeAccessGate}
            >
              <span className="grid size-5 place-items-center rounded-full bg-white text-xs font-bold text-primary">
                G
              </span>{' '}
              {gateContext === 'owner'
                ? 'SEE MY VALUATION'
                : 'SEE SUPPORTING TRANSACTIONS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedSociety)}
        onOpenChange={(open) => !open && setSelectedSociety(null)}
      >
        <DialogContent className="sm:max-h-[88vh] sm:max-w-2xl sm:p-7">
          {selectedSociety && (
            <SocietyDetail
              society={selectedSociety}
              records={buyerSocietyRecords}
              bhkFilter={bhkFilter}
              matchLabel={buyerSocietyEvidence?.label ?? 'No evidence'}
              unlocked={buyerUnlocked}
              onUnlock={() => {
                setGateContext('buyer');
                setCovenantAccepted(false);
                setShowGate(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={unknownOpen} onOpenChange={setUnknownOpen}>
        <DialogContent className="sm:max-w-md sm:p-7">
          <DialogHeader>
            <DialogTitle>
              {unknownSent
                ? 'Request receipt created'
                : 'Submit a missing society'}
            </DialogTitle>
            <DialogDescription>
              {unknownSent
                ? 'This V1 confirmation is on-screen only. No request was sent or permanently stored.'
                : 'This demonstrates a future data-review request, not a formal appraisal. V1 does not send or store it yet.'}
            </DialogDescription>
          </DialogHeader>
          {unknownSent ? (
            <div className="rounded-xl bg-accent/35 p-5 text-center">
              <CheckCircle2 className="mx-auto size-8 text-accent-foreground" />
              <p className="mt-3 font-medium">
                {unknownName} · {unknownLocation}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                On-screen confirmation only
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              <FormField label="Society name">
                <Input
                  value={unknownName}
                  onChange={(event) => {
                    setUnknownName(event.target.value);
                    setUnknownError('');
                  }}
                  placeholder="Enter society name"
                />
                {unknownError && (
                  <p role="alert" className="mt-1 text-xs text-destructive">
                    {unknownError}
                  </p>
                )}
              </FormField>
              <FormField label="Location">
                <NativeSelect
                  className="w-full"
                  value={unknownLocation}
                  onChange={(event) => setUnknownLocation(event.target.value)}
                >
                  {LOCATIONS.map((location) => (
                    <NativeSelectOption key={location} value={location}>
                      {location}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Available details" optional>
                <Textarea
                  value={unknownDetails}
                  onChange={(event) => setUnknownDetails(event.target.value)}
                  placeholder="Tower, BHK, area, or anything else you know"
                />
              </FormField>
            </div>
          )}
          <DialogFooter>
            {unknownSent ? (
              <Button onClick={() => setUnknownOpen(false)}>Done</Button>
            ) : (
              <Button
                onClick={() => {
                  if (!unknownName.trim()) {
                    setUnknownError('Enter a society name.');
                    return;
                  }
                  setUnknownSent(true);
                }}
              >
                Show request confirmation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function BuyerEditorialSections() {
  const liveNow = [
    'Registered median price and price per square foot',
    'A confidence level based on supporting transaction count',
    'Recent registered transactions with dates, configurations, and hidden unit numbers',
  ];
  const pendingSources = [
    'Price movement and historical appreciation',
    'Anonymous ranges of what owners paid',
    'Rental yield and a five-year scenario range',
    'Amenities and nearby schools',
    'Comparisons with nearby supported societies',
    'Sourced developments in the micro-market',
  ];

  return (
    <div className="mt-16 space-y-8 border-t border-border pt-12 sm:mt-24 sm:pt-16">
      <section className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
        <div>
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">PER SOCIETY</p>
          <h2 className="mt-3 font-heading text-4xl font-normal">What you can see</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Filter by where, how much, and BHK. That is the complete V1 filter set.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><Badge className="w-fit rounded-[2px]">Live in V1</Badge><CardTitle className="mt-3">Available now</CardTitle></CardHeader>
            <CardContent className="space-y-3">{liveNow.map((item) => <p key={item} className="flex gap-3 text-sm leading-6"><CheckCircle2 className="mt-1 size-4 shrink-0 text-accent-foreground" /><span>{item}</span></p>)}</CardContent>
          </Card>
          <Card className="bg-secondary">
            <CardHeader><Badge variant="outline" className="w-fit rounded-[2px]">Source pending</Badge><CardTitle className="mt-3">Not published yet</CardTitle></CardHeader>
            <CardContent className="space-y-3">{pendingSources.map((item) => <p key={item} className="text-sm leading-6 text-muted-foreground">{item}</p>)}</CardContent>
          </Card>
        </div>
      </section>

      <section className="rounded-[15px] bg-foreground p-6 text-background sm:p-10">
        <h2 className="font-heading text-4xl font-normal">How to read our numbers</h2>
        <div className="mt-7 grid gap-5 text-sm leading-7 text-background/72 md:grid-cols-2">
          <p>Every estimate carries a confidence level. High means several recent comparable transactions. Low means evidence is thin, so we show that clearly and avoid false precision.</p>
          <p>Five-year scenarios are not live in V1. When added, they will be ranges built from a society&apos;s own history—not predictions.</p>
          <p>Development signals require a source and publication date. If we cannot source something, we do not publish it.</p>
          <p>We never label a society a buy, steal, deal, or investment. No society can pay to appear, rank higher, or be recommended.</p>
        </div>
      </section>

      <section className="grid gap-6 rounded-[14px] border border-border bg-card p-6 sm:p-10 lg:grid-cols-[.65fr_1.35fr]">
        <h2 className="font-heading text-4xl font-normal">What this is not</h2>
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>Not a listing marketplace—we describe societies, not individual units for sale.</p>
          <p>Not a lead-generation product. Your details are never passed to a broker, developer, or agent.</p>
          <p>Not a formal valuation, legal check, negotiation service, or financial recommendation.</p>
          <p className="pt-2 font-medium text-foreground">We do one thing: show the evidence behind what apartments have actually sold for here.</p>
        </div>
      </section>

      <section className="py-6 text-center sm:py-10">
        <h2 className="text-balance font-heading text-4xl font-normal sm:text-5xl">Look at the evidence before you look at the flat.</h2>
        <a href="#buyer-catalogue" className="mx-auto mt-6 flex min-h-14 w-full max-w-xl items-center justify-center rounded-[9px] bg-foreground px-6 text-center text-sm font-semibold text-background">Browse societies in Sarjapur Road, Bellandur, Marathahalli, and Haralur</a>
        <p className="mt-4 text-xs text-muted-foreground">Can&apos;t find one? Create an on-screen request record. Email delivery is planned for V2.</p>
      </section>
    </div>
  );
}

function HomeView({
  societies,
  onOwner,
  onBuyer,
}: {
  societies: SocietySummary[];
  onOwner: () => void;
  onBuyer: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
      <section className="grid items-start gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
        <div className="pt-4">
          <Badge
            variant="outline"
            className="mb-5 border-primary/20 bg-primary/5 text-primary"
          >
            Built for owners and first-time buyers
          </Badge>
          <h1 className="max-w-3xl font-heading text-4xl font-semibold leading-[1.03] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Know what a Bengaluru apartment is really worth.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Private purchase data in. Registered transaction evidence, returns,
            and a clear confidence level out—without brokers, ads, paid
            rankings, or public unit prices.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {LOCATIONS.map((location) => (
              <span
                key={location}
                className="rounded-[2px] border border-border bg-card px-3 py-1.5 font-mono text-[8px]"
              >
                {location}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <Card className="border-0 bg-primary text-primary-foreground ring-0 shadow-[0_24px_70px_-30px_rgba(34,27,19,.75)]">
            <CardHeader>
              <div className="mb-5 grid size-11 place-items-center rounded-2xl bg-white/12">
                <Home className="size-5" />
              </div>
              <CardTitle className="text-2xl">I own a property</CardTitle>
              <p className="max-w-md text-sm leading-6 text-primary-foreground/72">
                Privately contribute what you paid to unlock an evidence-based
                estimate and acquisition return.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="h-11 w-full bg-white text-primary hover:bg-white/90"
                onClick={onOwner}
              >
                Track my apartment <ArrowRight />
              </Button>
            </CardContent>
          </Card>
          <Card className="border-0 bg-card ring-1 ring-border shadow-[0_18px_60px_-36px_rgba(34,27,19,.45)]">
            <CardHeader>
              <div className="mb-5 grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <Search className="size-5" />
              </div>
              <CardTitle className="text-2xl">I’m buying a property</CardTitle>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Browse society-level prices and supporting transactions before
                speaking to a broker.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full"
                onClick={onBuyer}
              >
                Explore societies <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="mt-16 border-t border-border pt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-foreground">
              Live workbook sample
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
              Real registered evidence, not listing prices
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Unit numbers are never shown.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {societies.map((society) => (
            <Card key={society.slug} size="sm" className="bg-card/80">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary">{society.location}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {society.transactionCount} txn
                    {society.transactionCount === 1 ? '' : 's'}
                  </span>
                </div>
                <CardTitle className="mt-2 min-h-10">{society.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Median registered price
                  </p>
                  <p className="mt-1 font-heading text-lg font-semibold">
                    {formatInr(society.medianPrice, true)}
                  </p>
                </div>
                <CheckCircle2 className="size-5 text-accent-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="mt-10 rounded-2xl border border-accent/40 bg-accent/35 p-5">
        <div className="flex gap-3">
          <LockKeyhole className="mt-0.5 size-5 shrink-0 text-accent-foreground" />
          <div>
            <p className="font-medium">
              Your exact purchase price stays private.
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              It is stored separately from identity and can appear to others
              only inside a sufficiently large anonymized cohort.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CurrencyField({
  label,
  name,
  value,
  onChange,
  errors,
  optional,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  errors: Record<string, string>;
  optional?: boolean;
}) {
  const parsed = parseIndianCurrency(value);
  return (
    <FormField label={label} optional={optional}>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. 1.25 crore"
      />
      {value && !Number.isNaN(parsed) && (
        <p className="mt-1 text-xs text-muted-foreground">
          Interpreted as {formatInr(parsed)}
        </p>
      )}
      {fieldError(errors, name)}
    </FormField>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function OwnerResult({
  form,
  result,
  onBack,
}: {
  form: OwnerForm;
  result: ValuationResult;
  onBack: () => void;
}) {
  const thinEvidence = result.comparables.length > 0 && result.comparables.length < 3;
  const purchasePrice = parseIndianCurrency(form.purchasePrice);
  const lowValue = result.low ?? result.estimate;
  const highValue = result.high ?? result.estimate;
  const thinValueRange =
    lowValue != null && highValue != null
      ? formatRoundedInrRange(lowValue, highValue)
      : '—';
  const thinReturnRange =
    lowValue != null && highValue != null && result.acquisitionCost > 0
      ? formatRoundedPercentRange(
          (lowValue - result.acquisitionCost) / result.acquisitionCost,
          (highValue - result.acquisitionCost) / result.acquisitionCost,
        )
      : '—';
  const thinReturnAfterCosts =
    lowValue != null && highValue != null
      ? formatRoundedInrRange(
          lowValue - result.acquisitionCost,
          highValue - result.acquisitionCost,
        )
      : '—';
  const thinAppreciation =
    lowValue != null && highValue != null
      ? formatRoundedInrRange(
          lowValue - purchasePrice,
          highValue - purchasePrice,
        )
      : '—';
  return (
    <div className="ts-shell py-12 sm:py-20">
      <Button variant="ghost" className="mb-5 -ml-3" onClick={onBack}>
        <ArrowLeft /> Review inputs
      </Button>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
            ESTIMATE · NOT A FORMAL APPRAISAL
          </p>
          <h1 className="mt-3 font-heading text-[42px] font-normal leading-none tracking-[-0.025em] sm:text-6xl">
            {form.society}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {form.bhk} BHK · {Number(form.area).toLocaleString('en-IN')} sq ft ·{' '}
            {form.areaType === 'carpet' ? 'Carpet' : 'Super built-up'} area
          </p>
          <p className="mt-2 text-xs font-medium text-accent-foreground">
            Evidence tier: {result.matchLabel}
          </p>
        </div>
        <Badge
          className="h-8 rounded-[2px] px-4"
          variant={
            result.confidence === 'Insufficient evidence'
              ? 'destructive'
              : 'secondary'
          }
        >
          {result.confidence} confidence
        </Badge>
      </div>
      {result.estimate ? (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="border-0 bg-primary py-6 text-primary-foreground ring-0">
            <CardHeader>
              <p className="font-mono text-[10px] tracking-[0.12em] text-primary-foreground/60">
                ESTIMATED CURRENT VALUE
              </p>
              <CardTitle className="mt-2 font-heading text-[48px] tracking-[-0.035em] sm:text-6xl">
                {thinEvidence ? thinValueRange : formatInr(result.estimate, true)}
              </CardTitle>
              <p className="text-sm text-primary-foreground/65">
                {thinEvidence
                  ? 'Rounded range because fewer than 3 transactions support this result.'
                  : `Estimated range ${formatInr(result.low, true)}–${formatInr(result.high, true)}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-5 border-t border-white/12 pt-5 sm:grid-cols-4">
                <Metric
                  label="Supporting transactions"
                  value={String(result.comparables.length)}
                />
                <Metric
                  label="Acquisition cost"
                  value={formatInr(result.acquisitionCost, true)}
                />
                <Metric
                  label={thinEvidence ? 'Return range' : 'Annualized return'}
                  value={
                    thinEvidence
                      ? thinReturnRange
                      : result.annualizedReturn == null
                      ? '—'
                      : `${(result.annualizedReturn * 100).toFixed(1)}%`
                  }
                />
                <Metric
                  label="Return after costs"
                  value={
                    thinEvidence
                      ? thinReturnAfterCosts
                      : formatInr(result.returnAfterCosts, true)
                  }
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
                RETURN VIEW
              </p>
              <CardTitle className="mt-2">Cost and appreciation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ResultRow
                label="Purchase price"
                value={formatInr(parseIndianCurrency(form.purchasePrice))}
              />
              <ResultRow
                label="Included acquisition costs"
                value={formatInr(
                  result.acquisitionCost -
                    parseIndianCurrency(form.purchasePrice),
                )}
              />
              <ResultRow
                label="Full-tenure loan interest"
                value={
                  result.loanInterest
                    ? formatInr(result.loanInterest)
                    : 'Not included'
                }
              />
              <Separator />
              <ResultRow
                label="Absolute appreciation"
                value={
                  thinEvidence
                    ? thinAppreciation
                    : formatInr(result.absoluteAppreciation)
                }
                strong
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Alert variant="destructive" className="rounded-[12px]">
          <CircleAlert />
          <AlertTitle>Insufficient evidence</AlertTitle>
          <AlertDescription>
            No valid registered transaction was found for the exact society and
            BHK, the same society at another BHK, or the same micro-market and
            BHK.
          </AlertDescription>
        </Alert>
      )}
      <section className="mt-10">
        <div className="mb-5">
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
            EVIDENCE USED
          </p>
          <h2 className="mt-2 font-heading text-3xl font-normal">
            Registered transactions · {result.matchLabel}
          </h2>
        </div>
        {result.comparables.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {result.comparables.map((record) => (
              <Card key={record.id} size="sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="rounded-[2px]">
                      {record.bhk} BHK
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatDate(record.registrationDate)}
                    </span>
                  </div>
                  <CardTitle className="mt-3 text-3xl">
                    {formatInr(record.price, true)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Metric
                    label="Area"
                    value={`${record.effectiveArea?.toLocaleString('en-IN')} sq ft`}
                  />
                  <Metric
                    label="Registered / sq ft"
                    value={formatInr(record.pricePerSqFt)}
                  />
                  <Metric label="Area basis" value={record.areaBasis ?? '—'} />
                  <Metric label="Sale type" value={record.saleType ?? 'Sale'} />
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  Source preserved · Unit number hidden
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : null}
      </section>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Development signals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              No signal is shown because a source and publication date have not
              yet been selected. We do not invent or display
              unsourced rumours.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estimate looks wrong?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Inspect the supporting transactions above. A production review
              request would let the administrator evaluate alternative
              comparables without changing registered evidence.
            </p>
            <Button className="mt-4" variant="outline" disabled>
              Review workflow pending
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          strong ? 'font-heading text-lg font-semibold' : 'font-medium'
        }
      >
        {value}
      </span>
    </div>
  );
}

function SocietyDetail({
  society,
  records,
  bhkFilter,
  matchLabel,
  unlocked,
  onUnlock,
}: {
  society: SocietySummary;
  records: TransactionRecord[];
  bhkFilter: string;
  matchLabel: string;
  unlocked: boolean;
  onUnlock: () => void;
}) {
  const detailMedianPrice = median(
    records
      .map((record) => record.price)
      .filter((price): price is number => Boolean(price)),
  );
  const detailMedianPpsf = median(
    records
      .map((record) => record.pricePerSqFt)
      .filter((price): price is number => Boolean(price)),
  );
  const detailBhks = [
    ...new Set(
      records
        .map((record) => record.bhk)
        .filter((bhk): bhk is string => Boolean(bhk)),
    ),
  ];
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{society.location}</Badge>
          <Badge variant="outline">
            {confidenceForCount(records.length)} confidence
          </Badge>
        </div>
        <DialogTitle className="mt-2 font-heading text-2xl">
          {society.name}
        </DialogTitle>
        <DialogDescription>
          {bhkFilter === 'All'
            ? 'Society evidence assembled by BHK.'
            : `Filtered to ${bhkFilter} BHK evidence.`}{' '}
          Evidence tier: {matchLabel}.{' '}
          This is not a live listing, ranking, or recommendation.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/45 p-4 sm:grid-cols-4">
        <Metric
          label={
            bhkFilter === 'All' ? 'Median price' : `${bhkFilter} BHK median`
          }
          value={formatInr(detailMedianPrice, true)}
        />
        <Metric label="Median / sq ft" value={formatInr(detailMedianPpsf)} />
        <Metric label="Registered sales" value={String(records.length)} />
        <Metric
          label="BHK evidence"
          value={detailBhks.join(', ') || 'Sparse'}
        />
      </div>
      {unlocked ? (
        <div>
          <h3 className="mb-3 font-medium">Registered transactions</h3>
          <div className="space-y-2">
            {[...records]
              .sort((a, b) =>
                (b.registrationDate ?? '').localeCompare(
                  a.registrationDate ?? '',
                ),
              )
              .slice(0, 6)
              .map((record) => (
                <div
                  key={record.id}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {record.bhk ?? 'BHK unavailable'} BHK ·{' '}
                      {record.effectiveArea?.toLocaleString('en-IN') ??
                        'Area unavailable'}{' '}
                      sq ft
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(record.registrationDate)} · Unit number hidden
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatInr(record.price, true)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatInr(record.pricePerSqFt)} / sq ft
                    </p>
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <EmptyEvidence
              title="Rental yield"
              text="Rent source not selected yet."
            />
            <EmptyEvidence
              title="Five-year scenario"
              text="Scenario assumptions not selected yet."
            />
            <EmptyEvidence
              title="Amenities & schools"
              text="External data provider pending."
            />
            <EmptyEvidence
              title="Nearby comparison"
              text="Will use only comparable supported societies."
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-primary p-5 text-primary-foreground">
          <LockKeyhole className="size-5" />
          <h3 className="mt-3 font-heading text-xl font-semibold">
            Detailed evidence is sign-in gated
          </h3>
          <p className="mt-2 text-sm leading-6 text-primary-foreground/70">
            Explore freely, then sign in only when revealing transaction-level
            intelligence. Production will use Google and request email only.
          </p>
          <Button
            className="mt-4 bg-white text-primary hover:bg-white/90"
            onClick={onUnlock}
          >
            Unlock detailed evidence
          </Button>
        </div>
      )}
    </>
  );
}

function EmptyEvidence({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
