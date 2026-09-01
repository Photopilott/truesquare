export type InventoryRow = {
  type: string;
  count: number;
  min_carpet_sqm: number | null;
  max_carpet_sqm: number | null;
};

export type AtlasMarket = {
  name: string;
  center_lat: number | null;
  center_lon: number | null;
  project_count: number;
  inventory_units: number;
};

export type RawProject = {
  id: number;
  registration: string | null;
  name: string;
  builder: string;
  named_developer: string;
  status: string | null;
  taluk: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  market: string;
  market_confidence: number;
  target: string | null;
  actual_completion: string | null;
  start: string | null;
  description: string | null;
  delivery: string;
  delivery_variance_days: number | null;
  units: number | null;
  complaints: number | null;
  land_sqm: number | null;
  covered_sqm: number | null;
  open_sqm: number | null;
  towers: number | null;
  floors: number | null;
  built_up_sqm: number | null;
  construction_progress: string | null;
  planning_authority: string | null;
  enrichment_source_url: string | null;
  enrichment_research_status: string | null;
  airport_km: number | null;
  nearby_count: number | null;
  nearby_names: string[];
  builder_projects: number;
  builder_on_time_rate: number | null;
  builder_complaints: number | null;
  schools: number | null;
  hospitals: number | null;
  malls: number | null;
  metro: string | null;
  metro_km: number | null;
  inventory: InventoryRow[];
};

export type Filing = RawProject & {
  slug: string;
  assetClass: 'Residential/Group Housing';
  subArea: string;
  startedAt: string | null;
  targetAt: string | null;
  registeredAt: string | null;
  declaredDurationMonths: number | null;
  declaredCostCr: number | null;
  escrowDeclared: boolean | null;
  openComplaints: number | null;
  occupancyCertificateOnRecord: boolean;
  reraNumber: string;
  authority: string | null;
  pincode: string | null;
};

export type NearbyFiling = {
  filing: Filing;
  distance: number;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

function month(value: string | null) {
  return value ? value.slice(0, 7) : null;
}

function registrationDate(registration: string | null) {
  const compact = registration?.match(/\/PR\/(\d{6})\//)?.[1];
  if (!compact) return null;
  const year = Number(compact.slice(0, 2));
  const monthValue = Number(compact.slice(2, 4));
  if (monthValue < 1 || monthValue > 12) return null;
  return `${year >= 10 ? 2000 + year : 2010 + year}-${String(monthValue).padStart(2, '0')}`;
}

function monthsBetween(start: string | null, target: string | null) {
  if (!start || !target) return null;
  const a = new Date(start);
  const b = new Date(target);
  if (Number.isNaN(a.valueOf()) || Number.isNaN(b.valueOf())) return null;
  return Math.max(0, Math.round((b.valueOf() - a.valueOf()) / 2_629_746_000));
}

function pincode(address: string | null) {
  return address?.match(/\b[1-9][0-9]{5}\b/)?.[0] ?? null;
}

export function toFiling(project: RawProject): Filing {
  return {
    ...project,
    slug: `${project.id}-${slugify(project.name)}`,
    assetClass: 'Residential/Group Housing',
    subArea:
      project.market === 'Needs review'
        ? project.taluk || 'Bengaluru Urban'
        : project.market,
    startedAt: month(project.start),
    targetAt: month(project.target),
    registeredAt: registrationDate(project.registration),
    declaredDurationMonths: monthsBetween(project.start, project.target),
    declaredCostCr: null,
    escrowDeclared: null,
    openComplaints: project.complaints,
    occupancyCertificateOnRecord: false,
    reraNumber: project.registration || 'not filed',
    authority: project.planning_authority,
    pincode: pincode(project.address),
  };
}

export function builderPortfolio(filings: Filing[], namedDeveloper: string) {
  return filings
    .filter((item) => item.named_developer === namedDeveloper)
    .sort((a, b) =>
      (a.startedAt || '9999').localeCompare(b.startedAt || '9999'),
    );
}

function radians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(a: Filing, b: Filing) {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null)
    return null;
  const radius = 6371;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const c =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

export function nearbyFilings(filings: Filing[], project: Filing) {
  return filings
    .filter((item) => item.id !== project.id)
    .map((item) => ({ filing: item, distance: distanceKm(project, item) }))
    .filter((item): item is NearbyFiling => item.distance != null)
    .sort((a, b) => a.distance - b.distance);
}

export function indian(value: number | null) {
  if (value == null) return 'not filed';
  const [whole, decimal] = String(value).split('.');
  const lastThree = whole.slice(-3);
  const lead = whole.slice(0, -3);
  const grouped = lead
    ? `${lead.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`
    : lastThree;
  return decimal ? `${grouped}.${decimal}` : grouped;
}

export function monthYear(value: string | null) {
  if (!value) return 'not filed';
  const [year, monthValue] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, monthValue - 1, 1)));
}

export function yearFraction(value: string | null) {
  if (!value) return null;
  const [year, monthValue = 1] = value.split('-').map(Number);
  return year + (monthValue - 1) / 12;
}

export function positionOnAxis(value: string | null, domain: [number, number]) {
  const year = yearFraction(value);
  if (year == null) return null;
  return Math.max(
    0,
    Math.min(100, ((year - domain[0]) / (domain[1] - domain[0])) * 100),
  );
}
