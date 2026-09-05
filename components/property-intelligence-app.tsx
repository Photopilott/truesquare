'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  ReactElement,
  SyntheticEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
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
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AccessGate } from '@/components/access-gate';
import { BugReport } from '@/components/bug-report';
import { SiteHeader } from '@/components/site-header';
import { SocietyShare } from '@/components/society-share';
import { SocietySubscribe } from '@/components/society-subscribe';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  buyerEvidenceDisplay,
  buyerEvidenceFor,
  evidenceBackedBuyerSocieties,
  type BuyerSocietySummary,
} from '@/lib/buyer-catalogue-model';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import type { OwnerPriceAggregate } from '@/lib/owner-aggregates';
import type { OwnerSocietyOption } from '@/lib/owner-society-search';
import {
  buildPublicSocietyEvidence,
  type PublicSocietyEvidence,
} from '@/lib/society-evidence';
import { UUID_PATTERN } from '@/lib/share-tracking';
import {
  calculateValuation,
  confidenceForCount,
  findComparableMatch,
  median,
  type TransactionRecord,
  type ValuationResult,
} from '@/lib/valuation-engine';

type SocietySummary = BuyerSocietySummary;

type OwnerForm = {
  societyOptionId: string;
  society: string;
  tower: string;
  floor: string;
  bhk: string;
  area: string;
  areaType: 'superBuiltUp' | 'carpet';
  purchaseDate: string;
  purchasePrice: string;
  loanAmount: string;
  loanTenure: string;
  loanRate: string;
};

const EMPTY_FORM: OwnerForm = {
  societyOptionId: '',
  society: '',
  tower: '',
  floor: '',
  bhk: '',
  area: '',
  areaType: 'superBuiltUp',
  purchaseDate: '',
  purchasePrice: '',
  loanAmount: '',
  loanTenure: '',
  loanRate: '',
};

const LOCATIONS = ['Sarjapur Road', 'Bellandur', 'Marathahalli', 'Haralur'];

function parsePurchaseMonth(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Date.UTC(year, month - 1, 1));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1)
    return null;
  return date;
}

function formatPurchaseMonth(value: string, previousValue: string) {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  if (digits.length < 4) return digits;
  if (digits.length === 4) {
    return value.length < previousValue.length ? digits : `${digits}-`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
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

export function AppHeader() {
  return <SiteHeader />;
}

export function PropertyIntelligenceApp({
  societies,
  ownerSocieties,
  records,
  ownerAggregates,
  initialView,
}: {
  societies: SocietySummary[];
  ownerSocieties?: OwnerSocietyOption[];
  records: TransactionRecord[];
  ownerAggregates: OwnerPriceAggregate[];
  initialView: 'owner' | 'buyer';
}) {
  const [view, setView] = useState<'home' | 'owner' | 'buyer'>(initialView);
  const [ownerForm, setOwnerForm] = useState<OwnerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [unvaluedSubmission, setUnvaluedSubmission] =
    useState<OwnerSocietyOption | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [gateContext, setGateContext] = useState<'owner' | 'buyer'>('owner');
  const [gateError, setGateError] = useState('');
  const [isSubmittingContribution, setIsSubmittingContribution] =
    useState(false);
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
  const [buyerSearchSociety, setBuyerSearchSociety] =
    useState<SocietySummary | null>(null);
  const [visibleSocieties, setVisibleSocieties] = useState(18);
  const [referralShareId, setReferralShareId] = useState<string | null>(null);
  const [isWhatsAppReferral, setIsWhatsAppReferral] = useState(false);
  const ownerFormStarted = useRef(false);
  const ownerFormSubmitted = useRef(false);
  const searchableOwnerSocieties = useMemo<OwnerSocietyOption[]>(
    () =>
      ownerSocieties ??
      societies.map((society) => ({
        id: `fallback:${society.slug}`,
        flatInventoryId: null,
        name: society.name,
        location: society.location,
        builder: null,
        hasValuation: society.transactionCount > 0,
        source: 'final_value' as const,
      })),
    [ownerSocieties, societies],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referredSociety = societies.find(
      (society) => society.slug === params.get('society'),
    );
    const referredOwnerSociety = referredSociety
      ? searchableOwnerSocieties.find(
          (option) =>
            option.name === referredSociety.name &&
            option.location === referredSociety.location,
        )
      : null;
    const suppliedReferral = params.get('ref');
    const cameFromWhatsApp =
      params.get('source') === 'whatsapp' ||
      params.get('utm_source') === 'whatsapp';
    const stored = window.localStorage.getItem('truesquare-owner-draft');
    let savedDraft: OwnerForm | null = null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<OwnerForm>;
        savedDraft = {
          ...EMPTY_FORM,
          ...parsed,
          purchaseDate: parsed.purchaseDate?.slice(0, 7) ?? '',
        };
      } catch {
        /* ignore corrupt local draft */
      }
    }
    const frame = window.requestAnimationFrame(() => {
      if (savedDraft || referredSociety) {
        const draftForSociety =
          referredSociety && savedDraft?.society !== referredSociety.name
            ? EMPTY_FORM
            : (savedDraft ?? EMPTY_FORM);
        setOwnerForm({
          ...draftForSociety,
          societyOptionId:
            referredOwnerSociety?.id ??
            searchableOwnerSocieties.find(
              (option) => option.name === draftForSociety.society,
            )?.id ??
            '',
          ...(referredSociety
            ? {
                society: referredSociety.name,
                tower:
                  savedDraft?.society === referredSociety.name
                    ? savedDraft.tower
                    : '',
              }
            : {}),
        });
      }
      if (suppliedReferral && UUID_PATTERN.test(suppliedReferral)) {
        setReferralShareId(suppliedReferral);
      }
      setIsWhatsAppReferral(cameFromWhatsApp);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [societies, searchableOwnerSocieties]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeGate = params.get('resumeGate');
    if (resumeGate === 'subscription') {
      const subscriptionSociety = params.get('subscriptionSociety');
      const society = societies.find(
        (item) => item.slug === subscriptionSociety,
      );
      if (society) {
        const frame = window.requestAnimationFrame(() =>
          setSelectedSociety(society),
        );
        return () => window.cancelAnimationFrame(frame);
      }
      return;
    }
    if (resumeGate !== 'owner' && resumeGate !== 'buyer') return;
    const frame = window.requestAnimationFrame(() => {
      setGateContext(resumeGate);
      if (resumeGate === 'buyer') {
        const pendingSociety = window.localStorage.getItem(
          'truesquare-pending-society',
        );
        const society = societies.find((item) => item.name === pendingSociety);
        if (society) setSelectedSociety(society);
      }
      setShowGate(true);
      params.delete('resumeGate');
      params.delete('auth');
      params.delete('authError');
      params.delete('authMode');
      params.delete('authMethod');
      const query = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [societies]);

  useEffect(() => {
    if (view === 'owner' && !valuation)
      window.localStorage.setItem(
        'truesquare-owner-draft',
        JSON.stringify(ownerForm),
      );
  }, [ownerForm, valuation, view]);

  function exactBuyerRecords(society: SocietySummary, selectedBhk: string) {
    return records.filter(
      (record) =>
        record.society === society.name &&
        record.location === society.location &&
        (selectedBhk === 'All' || record.bhk === selectedBhk),
    );
  }

  function buyerDisplayFor(society: SocietySummary, selectedBhk: string) {
    const databaseEvidence = buyerEvidenceFor(society, selectedBhk);
    if (databaseEvidence) return buyerEvidenceDisplay(databaseEvidence);

    const matchingRecords = exactBuyerRecords(society, selectedBhk);
    const matchingOwnerAggregates = ownerAggregates.filter(
      (aggregate) =>
        aggregate.society === society.name &&
        (selectedBhk === 'All' || aggregate.bhk === selectedBhk),
    );
    const ownerCount = matchingOwnerAggregates.reduce(
      (sum, aggregate) => sum + aggregate.approvedCount,
      0,
    );
    const registeredCount = matchingRecords.length;
    const latestDate =
      [...matchingRecords]
        .map((record) => record.registrationDate)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;
    const evidenceSource =
      registeredCount && ownerCount
        ? 'combined'
        : registeredCount
          ? 'registered_transaction'
          : ownerCount
            ? 'owner_input'
            : 'none';

    return buyerEvidenceDisplay({
      bhk: selectedBhk === 'All' ? null : selectedBhk,
      isAllBhks: selectedBhk === 'All',
      registeredCount,
      approvedOwnerCount: ownerCount,
      publicOwnerCount: ownerCount,
      registeredMedianPrice: median(
        matchingRecords
          .map((record) => record.price)
          .filter((price): price is number => Boolean(price)),
      ),
      registeredMedianPricePerSqFt: median(
        matchingRecords
          .map((record) => record.pricePerSqFt)
          .filter((price): price is number => Boolean(price)),
      ),
      ownerMedianPrice: null,
      ownerMinPrice: null,
      ownerMaxPrice: null,
      ownerMedianPricePerSqFt:
        matchingOwnerAggregates.length === 1
          ? matchingOwnerAggregates[0].medianPricePerSqFt
          : median(
              matchingOwnerAggregates.map(
                (aggregate) => aggregate.medianPricePerSqFt,
              ),
            ),
      ownerMinPricePerSqFt:
        matchingOwnerAggregates.length > 0
          ? Math.min(
              ...matchingOwnerAggregates.map(
                (aggregate) => aggregate.minPricePerSqFt,
              ),
            )
          : null,
      ownerMaxPricePerSqFt:
        matchingOwnerAggregates.length > 0
          ? Math.max(
              ...matchingOwnerAggregates.map(
                (aggregate) => aggregate.maxPricePerSqFt,
              ),
            )
          : null,
      latestRegisteredDate: latestDate,
      latestOwnerDate:
        matchingOwnerAggregates
          .map((aggregate) => aggregate.updatedAt.slice(0, 10))
          .sort()
          .at(-1) ?? null,
      evidenceSource,
    });
  }

  const buyerSocietyRecords = selectedSociety
    ? exactBuyerRecords(selectedSociety, bhkFilter)
    : [];
  const selectedBuyerDisplay = selectedSociety
    ? buyerDisplayFor(selectedSociety, bhkFilter)
    : null;
  const selectedOwnerSociety = searchableOwnerSocieties.find(
    (society) => society.id === ownerForm.societyOptionId,
  );
  const ownerSociety = societies.find(
    (society) =>
      society.name === ownerForm.society &&
      society.location === selectedOwnerSociety?.location,
  );
  const ownerPublicEvidence = ownerSociety
    ? buildPublicSocietyEvidence(ownerSociety, records, ownerAggregates)
    : null;
  const buyerLocations = useMemo(
    () =>
      [...new Set(societies.map((society) => society.location))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [societies],
  );

  const filteredSocieties = (() => {
    const budget = budgetFilter === 'All' ? Infinity : Number(budgetFilter);
    const isDefaultCatalogue =
      !searchQuery.trim() &&
      locationFilter === 'All' &&
      bhkFilter === 'All' &&
      budgetFilter === 'All';
    const catalogue = isDefaultCatalogue
      ? evidenceBackedBuyerSocieties(societies, (society) =>
          buyerDisplayFor(society, bhkFilter),
        )
      : societies;

    return catalogue.filter((society) => {
      const matchesLocation =
        locationFilter === 'All' || society.location === locationFilter;
      const databaseEvidence = buyerEvidenceFor(society, bhkFilter);
      const matchingRecords = exactBuyerRecords(society, bhkFilter);
      const matchesBhk =
        bhkFilter === 'All' ||
        Boolean(databaseEvidence) ||
        matchingRecords.length > 0;
      const matchingMedian = buyerDisplayFor(society, bhkFilter).medianPrice;
      const matchesBudget =
        budgetFilter === 'All' ||
        Boolean(matchingMedian && matchingMedian <= budget);
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch = [society.name, society.location, society.builder]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesLocation && matchesBhk && matchesBudget && matchesSearch;
    });
  })();

  function updateOwner<K extends keyof OwnerForm>(key: K, value: OwnerForm[K]) {
    if (!ownerFormStarted.current) {
      trackAnalyticsEvent('owner_form_start', {
        is_referral: Boolean(referralShareId),
      });
      ownerFormStarted.current = true;
    }
    setOwnerForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function selectOwnerSociety(option: OwnerSocietyOption | null) {
    setOwnerForm((current) => ({
      ...current,
      societyOptionId: option?.id ?? '',
      society: option?.name ?? '',
      tower: current.society === option?.name ? current.tower : '',
    }));
    setErrors((current) => ({ ...current, society: '' }));
    setPlausibilityReviewed(false);
    setPlausibilityMessage('');
  }

  function eligibleComparables(form: OwnerForm) {
    return findComparableMatch(records, {
      society: form.society,
      bhk: form.bhk,
      location: selectedOwnerSociety?.location ?? '',
    });
  }

  function buildValuation(form: OwnerForm): ValuationResult {
    return calculateValuation(
      {
        society: form.society,
        location: selectedOwnerSociety?.location ?? '',
        bhk: form.bhk,
        areaSqFt: Number(form.area),
        purchaseDate: `${form.purchaseDate}-01`,
        purchasePrice: parseIndianCurrency(form.purchasePrice),
        stampDuty: 0,
        registrationCost: 0,
        interiors: 0,
        brokerage: 0,
        loanAmount: form.loanAmount
          ? parseIndianCurrency(form.loanAmount)
          : null,
        loanTenureYears: form.loanTenure ? Number(form.loanTenure) : null,
        loanRate: form.loanRate ? Number(form.loanRate) : null,
      },
      records,
      ownerAggregates,
    );
  }

  function validateOwner() {
    const next: Record<string, string> = {};
    const requiredMessages: Partial<Record<keyof OwnerForm, string>> = {
      society: 'Select a society.',
      tower: 'Select a tower or block.',
      floor: 'Enter the floor number.',
      bhk: 'Select the apartment configuration.',
      area: 'Enter the area in square feet.',
      purchaseDate: 'Enter the purchase month in YYYY-MM format.',
      purchasePrice: 'Enter the all-inclusive purchase price.',
    };
    Object.entries(requiredMessages).forEach(([key, message]) => {
      if (!ownerForm[key as keyof OwnerForm]) next[key] = message;
    });
    if (ownerForm.area && Number(ownerForm.area) <= 0)
      next.area = 'Area must be greater than zero.';
    const purchaseDate = ownerForm.purchaseDate
      ? parsePurchaseMonth(ownerForm.purchaseDate)
      : null;
    if (ownerForm.purchaseDate && !purchaseDate)
      next.purchaseDate = 'Use a valid month in YYYY-MM format.';
    if (purchaseDate && purchaseDate > new Date())
      next.purchaseDate = 'Purchase date cannot be in the future.';
    ['purchasePrice', 'loanAmount'].forEach((key) => {
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
    if (Object.keys(next).length) {
      trackAnalyticsEvent('form_validation_error', {
        context: 'owner_valuation',
        validation_group: 'field_validation',
        error_count: Object.keys(next).length,
      });
    }
    return Object.keys(next).length === 0;
  }

  function beginOwnerReveal(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateOwner()) return;
    if (!ownerFormSubmitted.current) {
      trackAnalyticsEvent('owner_form_submit', {
        society_slug:
          societies.find((society) => society.name === ownerForm.society)
            ?.slug ?? 'unknown',
        is_referral: Boolean(referralShareId),
      });
      ownerFormSubmitted.current = true;
    }
    const comps = selectedOwnerSociety?.hasValuation
      ? eligibleComparables(ownerForm).records
      : [];
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

  async function completeVerifiedAccess() {
    if (gateContext === 'buyer') {
      setShowGate(false);
      setBuyerUnlocked(true);
      trackAnalyticsEvent('evidence_unlock', {
        society_slug: selectedSociety?.slug ?? 'unknown',
      });
      window.localStorage.removeItem('truesquare-pending-society');
      return;
    }

    const selected = searchableOwnerSocieties.find(
      (society) => society.id === ownerForm.societyOptionId,
    );
    if (!selected) {
      setGateError(
        'Select a society from the search results before continuing.',
      );
      return;
    }

    setGateError('');
    setIsSubmittingContribution(true);
    let requestId = window.localStorage.getItem('truesquare-owner-request-id');
    if (!requestId) {
      requestId = window.crypto.randomUUID();
      window.localStorage.setItem('truesquare-owner-request-id', requestId);
    }

    try {
      const response = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          referralShareId,
          property: {
            flatInventoryId: selected.flatInventoryId,
            society: ownerForm.society,
            location: selected.location,
            tower: ownerForm.tower,
            floor: ownerForm.floor,
            bhk: ownerForm.bhk,
            areaSqFt: Number(ownerForm.area),
            areaType: ownerForm.areaType,
            carParks: 0,
            purchaseDate: ownerForm.purchaseDate,
          },
          costs: {
            purchasePrice: parseIndianCurrency(ownerForm.purchasePrice),
            stampDuty: 0,
            registrationCost: 0,
            interiors: 0,
            brokerage: 0,
            loanAmount: ownerForm.loanAmount
              ? parseIndianCurrency(ownerForm.loanAmount)
              : null,
            loanTenureYears: ownerForm.loanTenure
              ? Number(ownerForm.loanTenure)
              : null,
            loanRate: ownerForm.loanRate ? Number(ownerForm.loanRate) : null,
          },
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        hasValuation?: boolean;
        snapshot?: { id: string; createdAt: string } | null;
      };
      if (!response.ok) {
        throw new Error(result.error || 'We could not save your contribution.');
      }

      const referredPublicSociety = societies.find(
        (society) =>
          society.name === selected.name &&
          society.location === selected.location,
      );
      if (result.hasValuation === false) {
        setUnvaluedSubmission(selected);
      } else {
        const savedValuation = buildValuation(ownerForm);
        if (result.snapshot) {
          savedValuation.snapshotId = result.snapshot.id;
          savedValuation.snapshotCreatedAt = result.snapshot.createdAt;
        }
        setValuation(savedValuation);
        trackAnalyticsEvent('valuation_complete', {
          society_slug: referredPublicSociety?.slug ?? 'inventory-only',
          is_referral: Boolean(referralShareId),
        });
      }
      if (referralShareId && referredPublicSociety) {
        trackAnalyticsEvent('referred_valuation_completed', {
          society_slug: referredPublicSociety.slug,
          source_screen: 'owner_result',
        });
        void fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'referred_valuation_completed',
            shareId: referralShareId,
            contentType: 'society',
            contentId: referredPublicSociety.slug,
            sourceScreen: 'owner_result',
          }),
          keepalive: true,
        }).catch(() => undefined);
      }
      setShowGate(false);
      window.localStorage.removeItem('truesquare-owner-draft');
      window.localStorage.removeItem('truesquare-owner-request-id');
    } catch (error) {
      setGateError(
        error instanceof Error
          ? error.message
          : 'We could not save your contribution. Nothing was submitted.',
      );
    } finally {
      setIsSubmittingContribution(false);
    }
  }

  function resetHome() {
    window.location.assign('/');
  }

  return (
    <main className="ts-orb min-h-screen">
      <AppHeader />
      {view === 'home' && (
        <HomeView
          societies={societies.slice(0, 4)}
          onOwner={() => setView('owner')}
          onBuyer={() => setView('buyer')}
        />
      )}
      {view === 'buyer' && (
        <div
          id="buyer-catalogue"
          className="ts-orb-shell ts-orb-section scroll-mt-24"
        >
          <Button variant="ghost" className="mb-5 -ml-3" onClick={resetHome}>
            <ArrowLeft /> Home
          </Button>
          <div className="ts-orb-profile-layout">
            <section className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                BUYER CATALOGUE
              </p>
              <h1 className="ts-orb-page-title">
                Your first home shouldn&apos;t require this much price guessing.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
                Browse the catalog freely. Sign in with Google only when you
                want to open a society&apos;s full evidence. Email is all the
                production gate will ask for.
              </p>
              <div className="ts-orb-finder mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Label htmlFor="buyer-society-search">
                      Search society, area, or builder
                    </Label>
                  </div>
                  <Combobox
                    items={societies}
                    value={buyerSearchSociety}
                    inputValue={searchQuery}
                    onInputValueChange={(value) => {
                      setSearchQuery(value);
                      setBuyerSearchSociety((current) =>
                        current?.name === value ? current : null,
                      );
                      setVisibleSocieties(18);
                    }}
                    onValueChange={(society) => {
                      setBuyerSearchSociety(society);
                      setSearchQuery(society?.name ?? '');
                      setVisibleSocieties(18);
                      if (society) {
                        trackAnalyticsEvent('buyer_filter_use', {
                          filter_type: 'society_search_selection',
                          society_slug: society.slug,
                        });
                      }
                    }}
                    itemToStringLabel={(society: SocietySummary) =>
                      society.name
                    }
                    isItemEqualToValue={(
                      society: SocietySummary,
                      value: SocietySummary,
                    ) => society.slug === value.slug}
                    filter={(society: SocietySummary, query: string) =>
                      [society.name, society.location, society.builder]
                        .filter((value): value is string => Boolean(value))
                        .join(' ')
                        .toLowerCase()
                        .includes(query.trim().toLowerCase())
                    }
                    limit={8}
                    autoHighlight
                    openOnInputClick
                  >
                    <ComboboxInput
                      id="buyer-society-search"
                      className="h-12 w-full rounded-[8px] bg-card text-foreground"
                      placeholder="e.g. Trinity Acres, Sarjapur…"
                      showClear
                      onBlur={() => {
                        if (!searchQuery.trim()) return;
                        trackAnalyticsEvent('buyer_filter_use', {
                          filter_type: 'society_search',
                        });
                      }}
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>
                        No matching society found in the current catalogue.
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(society: SocietySummary) => (
                          <ComboboxItem
                            key={society.slug}
                            value={society}
                            className="items-start px-3 py-3"
                          >
                            <div className="min-w-0 pr-6">
                              <p className="truncate font-medium">
                                {society.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {society.location}
                                {society.builder ? ` · ${society.builder}` : ''}
                                {' · '}
                                {society.bhks.length
                                  ? society.bhks
                                      .map((bhk) => `${bhk} BHK`)
                                      .join(', ')
                                  : 'Configuration not filed'}
                              </p>
                              <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#FA3600] uppercase">
                                {
                                  buyerEvidenceDisplay(
                                    buyerEvidenceFor(society, 'All'),
                                  ).label
                                }
                              </p>
                            </div>
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
                <FormField label="Location">
                  <NativeSelect
                    className="w-full"
                    value={locationFilter}
                    onChange={(event) => {
                      setLocationFilter(event.target.value);
                      setVisibleSocieties(18);
                      trackAnalyticsEvent('buyer_filter_use', {
                        filter_type: 'location',
                      });
                    }}
                  >
                    <NativeSelectOption value="All">
                      All Bengaluru areas
                    </NativeSelectOption>
                    {buyerLocations.map((location) => (
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
                      trackAnalyticsEvent('buyer_filter_use', {
                        filter_type: 'bhk',
                      });
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
                      trackAnalyticsEvent('buyer_filter_use', {
                        filter_type: 'budget',
                      });
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
              <Alert className="mt-4 rounded-[12px] border-border bg-accent">
                <Info />
                <AlertTitle>Complete society catalogue</AlertTitle>
                <AlertDescription>
                  Search {societies.length} Bengaluru societies. Registered
                  transactions are shown separately from admin-approved owner
                  data. An approved owner price appears in the Buyer benchmark
                  immediately.
                </AlertDescription>
              </Alert>
              <div className="ts-orb-panel mt-5 p-5 text-sm leading-6 text-muted-foreground">
                <p>Listing portals show what sellers hope for.</p>
                <p>Brokers show what closes the deal in front of them.</p>
                <p>Developers show what they&apos;ve priced this quarter.</p>
                <p className="mt-3 font-medium text-foreground">
                  Nobody publishes what apartments in these societies have
                  actually sold for. So we did.
                </p>
              </div>
            </section>
            <section className="ts-orb-review-panel p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
                  {filteredSocieties.length} SOCIETIES FOUND
                </p>
                <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
                  NO PAID RANKING
                </span>
              </div>
              <div className="ts-orb-card-grid">
                {filteredSocieties.slice(0, visibleSocieties).map((society) => {
                  const evidence = buyerDisplayFor(society, bhkFilter);
                  const bhkBreakdown =
                    bhkFilter === 'All'
                      ? society.bhks.length
                        ? society.bhks.map((bhk) => `${bhk} BHK`).join(', ')
                        : 'Evidence building'
                      : `${bhkFilter} BHK (${evidence.publicCount})`;
                  const supportLabel = evidence.publicCount
                    ? `${evidence.publicCount} SUPPORTING`
                    : 'NO PRICE EVIDENCE';
                  return (
                    <button
                      key={society.slug}
                      type="button"
                      className="block w-full text-left"
                      aria-label={`View ${society.name} details`}
                      onClick={() => {
                        setSelectedSociety(society);
                        setBuyerUnlocked(false);
                        trackAnalyticsEvent('society_detail_view', {
                          society_slug: society.slug,
                          source_screen: 'buyer_catalogue',
                        });
                      }}
                    >
                      <Card className="cursor-pointer transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(40,40,40,.10)]">
                        <CardHeader>
                          <div className="flex items-center justify-between gap-3">
                            <Badge
                              variant="secondary"
                              className="rounded-[2px]"
                            >
                              {society.location}
                            </Badge>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {supportLabel}
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
                                ? 'Buyer benchmark'
                                : `${bhkFilter} BHK median`
                            }
                            value={formatInr(evidence.medianPrice, true)}
                          />
                          <Metric
                            label="Median / sq ft"
                            value={
                              evidence.medianPricePerSqFt
                                ? `${formatInr(evidence.medianPricePerSqFt)}`
                                : '—'
                            }
                          />
                          <Metric label="BHK evidence" value={bhkBreakdown} />
                          <Metric
                            label="Confidence"
                            value={
                              evidence.publicCount
                                ? confidenceForCount(evidence.publicCount)
                                : 'Building'
                            }
                          />
                          <Metric
                            label="Approved owner evidence"
                            value={
                              evidence.publicOwnerCount
                                ? `${evidence.publicOwnerCount} approved`
                                : evidence.approvedOwnerCount
                                  ? `${evidence.approvedOwnerCount} approved`
                                  : 'No approved input yet'
                            }
                          />
                        </CardContent>
                        <CardFooter className="justify-between text-xs text-muted-foreground">
                          <span>
                            {evidence.label}
                            {evidence.latestDate
                              ? ` · Latest: ${formatDate(evidence.latestDate)}`
                              : ''}
                          </span>
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
                    No society matches
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different society name, area, builder, BHK, or budget.
                  </p>
                </div>
              )}
            </section>
          </div>
          <BuyerEditorialSections />
        </div>
      )}

      {view === 'owner' && !valuation && !unvaluedSubmission && (
        <div className="ts-orb-shell ts-orb-section">
          <Button variant="ghost" className="mb-5 -ml-3" onClick={resetHome}>
            <ArrowLeft /> Home
          </Button>
          <div className="ts-orb-profile-layout">
            <aside className="ts-orb-profile-summary min-w-0">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                OWNER VALUATION
              </p>
              <h1 className="ts-orb-page-title">
                Your flat is an asset. Track it like one.
              </h1>
              <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
                Track your apartment&apos;s value and returns the way you track
                everything else you own. Search gated societies across our
                Bangalore flat inventory.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <a
                  href="#property-form"
                  className="flex min-h-12 items-center justify-center rounded-[9px] border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground"
                >
                  Track my property
                </a>
                <Link
                  href="/buyer"
                  className="flex min-h-12 items-center justify-center rounded-[9px] border border-foreground px-5 text-sm font-semibold"
                >
                  Research a society
                </Link>
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
              <Alert className="mt-7 rounded-[12px] border-border bg-accent">
                <LockKeyhole />
                <AlertTitle>How it works</AlertTitle>
                <AlertDescription>
                  Add what you paid → see a private valuation when reviewed
                  evidence exists → otherwise, your submission enters the
                  private admin review queue.
                </AlertDescription>
              </Alert>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Priced from registered transactions and admin-approved owner
                contributions — with a confidence level on every estimate.
              </p>
              <p className="mt-6 font-heading text-2xl leading-snug">
                You&apos;d never hold a mutual fund without a NAV. Why hold ₹1.5
                crore without one?
              </p>
            </aside>

            <form
              id="property-form"
              onSubmit={beginOwnerReveal}
              className="ts-orb-form-panel min-w-0"
            >
              {isWhatsAppReferral && ownerForm.society && (
                <Alert className="mb-6 rounded-[12px] border-border bg-accent">
                  <LockKeyhole />
                  <AlertTitle>
                    {ownerForm.society} is already selected
                  </AlertTitle>
                  <AlertDescription>
                    Add your details to see your private estimated value, gain
                    or loss, and returns. Nothing about your flat is posted back
                    to WhatsApp.
                  </AlertDescription>
                </Alert>
              )}
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
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Label htmlFor="owner-society-search">Society</Label>
                  </div>
                  <Combobox
                    items={searchableOwnerSocieties}
                    value={selectedOwnerSociety ?? null}
                    onValueChange={selectOwnerSociety}
                    itemToStringLabel={(option: OwnerSocietyOption) =>
                      option.name
                    }
                    isItemEqualToValue={(
                      option: OwnerSocietyOption,
                      value: OwnerSocietyOption,
                    ) => option.id === value.id}
                    filter={(option: OwnerSocietyOption, query: string) => {
                      const searchable = [
                        option.name,
                        option.location,
                        option.builder ?? '',
                      ]
                        .join(' ')
                        .toLowerCase();
                      return searchable.includes(query.trim().toLowerCase());
                    }}
                    limit={15}
                    autoHighlight
                  >
                    <ComboboxInput
                      id="owner-society-search"
                      className="w-full"
                      placeholder="Type a society, area, or builder"
                      showClear
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>
                        No matching Bangalore society found.
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(option: OwnerSocietyOption) => (
                          <ComboboxItem
                            key={option.id}
                            value={option}
                            className="items-start px-2 py-2.5"
                          >
                            <div className="min-w-0 pr-5">
                              <p className="truncate font-medium">
                                {option.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {option.location}
                                {option.builder ? ` · ${option.builder}` : ''}
                              </p>
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent-foreground">
                                {option.hasValuation
                                  ? 'Valuation available'
                                  : 'No valuation yet'}
                              </p>
                            </div>
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldError(errors, 'society')}
                </div>
                <FormField label="Tower / block">
                  <Input
                    value={ownerForm.tower}
                    onChange={(event) =>
                      updateOwner('tower', event.target.value)
                    }
                    placeholder="e.g. Tower 2 or Block B"
                  />
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
                <FormField label="Purchase Year & Month">
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={7}
                    placeholder="YYYY-MM"
                    value={ownerForm.purchaseDate}
                    onChange={(event) =>
                      updateOwner(
                        'purchaseDate',
                        formatPurchaseMonth(
                          event.target.value,
                          ownerForm.purchaseDate,
                        ),
                      )
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
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent-foreground">
                  <LockKeyhole className="size-3.5" /> Your identity and contact
                  details are never included in a shared link.
                </p>
              </div>
              <div>
                <CurrencyField
                  label="All-inclusive purchase price"
                  name="purchasePrice"
                  value={ownerForm.purchasePrice}
                  onChange={(value) => updateOwner('purchasePrice', value)}
                  errors={errors}
                />
                <Alert className="mt-3 rounded-[10px] border-[#A9DCB8] bg-accent">
                  <Info />
                  <AlertTitle>Enter one complete amount</AlertTitle>
                  <AlertDescription>
                    Include the flat price, stamp duty, and registration cost in
                    this single figure.
                  </AlertDescription>
                </Alert>
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
                className="mt-7 h-[58px] w-full font-mono text-[15px] tracking-[0.08em] sm:text-base"
              >
                {isWhatsAppReferral
                  ? 'SHOW MY PRIVATE VALUATION'
                  : 'TRACK MY PROPERTY'}{' '}
                <ArrowRight />
              </Button>
              <BugReport />
              <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
                Your personal result is visible only to you. If an admin
                approves your price, it joins the public society and BHK
                benchmark without your identity or contact details.
              </p>
            </form>
          </div>
        </div>
      )}

      {view === 'owner' && valuation && (
        <OwnerResult
          form={ownerForm}
          result={valuation}
          publicEvidence={ownerPublicEvidence}
          onBack={() => setValuation(null)}
        />
      )}

      {view === 'owner' && unvaluedSubmission && (
        <OwnerSubmissionReceived
          society={unvaluedSubmission}
          onBack={() => setUnvaluedSubmission(null)}
        />
      )}

      <AccessGate
        open={showGate}
        onOpenChange={setShowGate}
        context={gateContext}
        onAuthorized={completeVerifiedAccess}
        actionPending={isSubmittingContribution}
        actionError={gateError}
      />

      <Dialog
        open={Boolean(selectedSociety)}
        onOpenChange={(open) => !open && setSelectedSociety(null)}
      >
        <DialogContent className="sm:max-h-[88vh] sm:max-w-2xl sm:p-7">
          {selectedSociety && (
            <SocietyDetail
              society={selectedSociety}
              records={buyerSocietyRecords}
              publicEvidence={buildPublicSocietyEvidence(
                selectedSociety,
                records,
                ownerAggregates,
              )}
              catalogueEvidence={buyerDisplayFor(selectedSociety, bhkFilter)}
              bhkFilter={bhkFilter}
              matchLabel={
                selectedBuyerDisplay?.label ?? 'No verified price evidence'
              }
              unlocked={buyerUnlocked}
              onUnlock={() => {
                trackAnalyticsEvent('evidence_unlock_click', {
                  society_slug: selectedSociety.slug,
                  source_screen: 'buyer_detail',
                });
                setGateContext('buyer');
                setGateError('');
                window.localStorage.setItem(
                  'truesquare-pending-society',
                  selectedSociety.name,
                );
                setShowGate(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function BuyerEditorialSections() {
  const liveNow = [
    'All active societies from the Bengaluru inventory',
    'Registered prices kept separate from admin-approved owner benchmarks',
    'Owner prices published immediately after admin approval',
    'Recent registered transactions with dates, configurations, and hidden unit numbers',
  ];

  return (
    <div className="mt-16 space-y-8 border-t border-border pt-12 sm:mt-24 sm:pt-16">
      <section className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
        <div>
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
            PER SOCIETY
          </p>
          <h2 className="mt-3 font-heading text-4xl font-normal">
            What you can see
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Filter by where, how much, and BHK. That is the complete V1 filter
            set.
          </p>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Badge className="w-fit rounded-[2px]">Available now</Badge>
              <CardTitle className="mt-3">Transparent price evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveNow.map((item) => (
                <p key={item} className="flex gap-3 text-sm leading-6">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-accent-foreground" />
                  <span>{item}</span>
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="rounded-[15px] bg-foreground p-6 text-background sm:p-10">
        <h2 className="font-heading text-4xl font-normal">
          How to read our numbers
        </h2>
        <div className="mt-7 grid gap-5 text-sm leading-7 text-background/72 md:grid-cols-2">
          <p>
            Every estimate carries a confidence level. High means several recent
            comparable transactions. Low means evidence is thin, so we show that
            clearly and avoid false precision.
          </p>
          <p>
            We never label a society a buy, steal, deal, or investment. No
            society can pay to appear, rank higher, or be recommended.
          </p>
        </div>
      </section>

      <section className="grid gap-6 rounded-[14px] border border-border bg-card p-6 sm:p-10 lg:grid-cols-[.65fr_1.35fr]">
        <h2 className="font-heading text-4xl font-normal">What this is not</h2>
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Not a listing marketplace—we describe societies, not individual
            units for sale.
          </p>
          <p>
            Not a lead-generation product. Your details are never passed to a
            broker, developer, or agent.
          </p>
          <p>
            Not a formal valuation, legal check, negotiation service, or
            financial recommendation.
          </p>
          <p className="pt-2 font-medium text-foreground">
            We do one thing: show the evidence behind what apartments have
            actually sold for here.
          </p>
        </div>
      </section>

      <section className="py-6 text-center sm:py-10">
        <h2 className="text-balance font-heading text-4xl font-normal sm:text-5xl">
          Look at the evidence before you look at the flat.
        </h2>
        <a
          href="#buyer-catalogue"
          className="mx-auto mt-6 flex min-h-14 w-full max-w-xl items-center justify-center rounded-[9px] bg-primary px-6 text-center text-sm font-semibold text-primary-foreground"
        >
          Browse societies in Sarjapur Road, Bellandur, Marathahalli, and
          Haralur
        </a>
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
          <Card className="border-0 bg-foreground text-background ring-0 shadow-[0_24px_70px_-30px_rgba(40,40,40,.75)]">
            <CardHeader>
              <div className="mb-5 grid size-11 place-items-center rounded-2xl bg-white/12">
                <Home className="size-5" />
              </div>
              <CardTitle className="text-2xl">I own a property</CardTitle>
              <p className="max-w-md text-sm leading-6 text-background/72">
                Contribute what you paid for admin review and unlock an
                evidence-based estimate and acquisition return.
              </p>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="h-11 w-full" onClick={onOwner}>
                Track my apartment <ArrowRight />
              </Button>
            </CardContent>
          </Card>
          <Card className="border-0 bg-card ring-1 ring-border shadow-[0_18px_60px_-36px_rgba(40,40,40,.45)]">
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
            <p className="font-medium">Your identity stays private.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Your submitted price stays in admin review until it is approved.
              After approval, it is included immediately in the public society
              and BHK benchmark without your identity or contact details.
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

function OwnerSubmissionReceived({
  society,
  onBack,
}: {
  society: OwnerSocietyOption;
  onBack: () => void;
}) {
  return (
    <div className="ts-orb-shell ts-orb-section">
      <Button variant="ghost" className="mb-5 -ml-3" onClick={onBack}>
        <ArrowLeft /> Review inputs
      </Button>
      <Card className="mx-auto max-w-2xl overflow-hidden">
        <CardHeader className="border-b border-border bg-secondary p-7 sm:p-10">
          <div className="grid size-12 place-items-center rounded-[10px] border border-[#A9DCB8] bg-accent text-accent-foreground">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="mt-6 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
            SUBMISSION RECEIVED
          </p>
          <CardTitle className="mt-2 font-heading text-4xl font-normal sm:text-5xl">
            Your flat is now under consideration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-7 sm:p-10">
          <p className="text-base leading-7">
            We did not have a transaction value for {society.name},{' '}
            {society.location}. Your submission has now been added to our admin
            review queue.
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Thank you for contributing this data point. Your identity, contact
            details, floor, and loan details remain private. If the price is
            approved, it will be included immediately in the public society and
            BHK benchmark.
          </p>
          <Alert className="border-[#A9DCB8] bg-accent">
            <LockKeyhole />
            <AlertTitle>What happens next</AlertTitle>
            <AlertDescription>
              An admin will review the submission. Only an approved value can
              enter the master valuation table.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function OwnerResult({
  form,
  result,
  publicEvidence,
  onBack,
}: {
  form: OwnerForm;
  result: ValuationResult;
  publicEvidence: PublicSocietyEvidence | null;
  onBack: () => void;
}) {
  const thinEvidence =
    result.comparables.length > 0 && result.comparables.length < 3;
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
    <div className="ts-orb-shell ts-orb-section">
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
      {result.snapshotCreatedAt && (
        <Alert className="mb-6 border-border bg-accent">
          <CheckCircle2 />
          <AlertTitle>Valuation snapshot saved</AlertTitle>
          <AlertDescription>
            This result records the matching tier, supporting transaction IDs,
            and privacy-safe owner evidence used on{' '}
            {formatDate(result.snapshotCreatedAt)}.
          </AlertDescription>
        </Alert>
      )}
      {result.estimate ? (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="border-0 bg-primary py-6 text-primary-foreground ring-0">
            <CardHeader>
              <p className="font-mono text-[10px] tracking-[0.12em] text-primary-foreground/60">
                ESTIMATED CURRENT VALUE
              </p>
              <CardTitle className="mt-2 font-heading text-[48px] tracking-[-0.035em] sm:text-6xl">
                {thinEvidence
                  ? thinValueRange
                  : formatInr(result.estimate, true)}
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
      {result.ownerAggregate && (
        <Alert className="mt-6 rounded-[12px] border-border bg-accent">
          <CheckCircle2 />
          <AlertTitle>
            Admin-approved owner evidence ·{' '}
            {result.ownerAggregate.approvedCount} approved contributions
          </AlertTitle>
          <AlertDescription>
            Owners of {form.bhk} BHK homes in this society contributed an
            approved purchase-price range of{' '}
            {formatRoundedInrRange(
              result.ownerAggregate.minPricePerSqFt * Number(form.area),
              result.ownerAggregate.maxPricePerSqFt * Number(form.area),
            )}{' '}
            for an apartment of this size. Owner identities and contact details
            are never shown.
          </AlertDescription>
        </Alert>
      )}
      {publicEvidence && (
        <Card className="mt-7 border-border bg-accent">
          <CardHeader>
            <p className="font-mono text-[10px] tracking-[0.12em] text-accent-foreground">
              SHARE WITHOUT REVEALING YOUR RESULT
            </p>
            <CardTitle className="mt-2 text-3xl">
              Help neighbours check the {form.society} benchmark
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-sm leading-6 text-muted-foreground">
                Your valuation, returns, floor, identity, and contact details
                stay private. The share contains only the public society
                benchmark and never identifies your individual submission.
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-accent-foreground">
                <LockKeyhole className="size-4" /> Owner identities and contact
                details are never shown.
              </p>
            </div>
            <SocietyShare
              evidence={publicEvidence}
              sourceScreen="owner_result"
              buttonLabel="Share benchmark on WhatsApp"
            />
          </CardContent>
        </Card>
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
          <div className="ts-orb-card-grid">
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
      <div className="ts-orb-card-grid mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Development signals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              No signal is shown because a source and publication date have not
              yet been selected. We do not invent or display unsourced rumours.
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
  publicEvidence,
  catalogueEvidence,
  bhkFilter,
  matchLabel,
  unlocked,
  onUnlock,
}: {
  society: SocietySummary;
  records: TransactionRecord[];
  publicEvidence: PublicSocietyEvidence;
  catalogueEvidence: ReturnType<typeof buyerEvidenceDisplay>;
  bhkFilter: string;
  matchLabel: string;
  unlocked: boolean;
  onUnlock: () => void;
}) {
  const detailBhks = society.bhks;
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{society.location}</Badge>
          <Badge variant="outline">
            {catalogueEvidence.publicCount
              ? confidenceForCount(catalogueEvidence.publicCount)
              : 'Building'}{' '}
            confidence
          </Badge>
        </div>
        <DialogTitle className="mt-2 font-heading text-2xl">
          {society.name}
        </DialogTitle>
        <DialogDescription>
          {bhkFilter === 'All'
            ? 'Society evidence assembled by BHK.'
            : `Filtered to ${bhkFilter} BHK evidence.`}{' '}
          Evidence: {matchLabel}. This is not a live listing, ranking, or
          recommendation. Owner identities and contact details are never shown.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/45 p-4 sm:grid-cols-4">
        <Metric
          label="Buyer benchmark"
          value={formatInr(catalogueEvidence.medianPrice, true)}
        />
        <Metric
          label="Median / sq ft"
          value={formatInr(catalogueEvidence.medianPricePerSqFt)}
        />
        <Metric
          label="Latest evidence"
          value={formatDate(catalogueEvidence.latestDate)}
        />
        <Metric
          label="Public evidence"
          value={String(catalogueEvidence.publicCount)}
        />
        <Metric
          label="BHK evidence"
          value={detailBhks.join(', ') || 'Sparse'}
        />
        <Metric
          label="Approved owner evidence"
          value={
            catalogueEvidence.publicOwnerCount
              ? `${catalogueEvidence.publicOwnerCount} approved`
              : catalogueEvidence.approvedOwnerCount
                ? `${catalogueEvidence.approvedOwnerCount} approved`
                : 'No approved input yet'
          }
        />
      </div>
      <div className="rounded-xl border border-border bg-accent p-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Share the public {society.name} benchmark with your society group.
          Owner identities and contact details are never part of the link.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SocietyShare
            evidence={publicEvidence}
            sourceScreen="buyer_detail"
            buttonLabel="Share on WhatsApp"
          />
          <SocietySubscribe society={society} sourceScreen="buyer_detail" />
          <Link
            href={`/societies/${society.slug}`}
            className="text-sm font-semibold underline underline-offset-4"
          >
            Open permanent society page
          </Link>
        </div>
      </div>
      {unlocked && records.length > 0 ? (
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
        </div>
      ) : !unlocked ? (
        <div className="rounded-xl border border-border bg-foreground p-5 text-background">
          <LockKeyhole className="size-5" />
          <h3 className="mt-3 font-heading text-xl font-semibold">
            Detailed evidence is sign-in gated
          </h3>
          <p className="mt-2 text-sm leading-6 text-background/70">
            Explore freely, then sign in only when revealing transaction-level
            intelligence. Use Google or verify an email with a one-time code.
          </p>
          <Button className="mt-4" onClick={onUnlock}>
            Unlock detailed evidence
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border p-5">
          <h3 className="font-heading text-xl font-semibold">
            No registered transaction details yet
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The benchmark above includes all admin-approved owner evidence.
            Registered transaction details will appear here when available.
          </p>
        </div>
      )}
    </>
  );
}
