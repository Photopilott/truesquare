export const ANALYTICS_EVENTS = [
  'page_view',
  'button_click',
  'primary_cta_click',
  'owner_form_start',
  'owner_form_submit',
  'form_validation_error',
  'auth_gate_view',
  'auth_method_selected',
  'sign_up',
  'login',
  'access_verified',
  'consent_complete',
  'valuation_complete',
  'buyer_filter_use',
  'society_detail_view',
  'evidence_unlock_click',
  'evidence_unlock',
  'share',
  'share_preview_opened',
  'shared_link_opened',
  'referred_owner_started',
  'referred_valuation_completed',
  'subscription_start',
  'subscription_complete',
  'subscription_cancelled',
  'atlas_filter_use',
  'atlas_project_open',
  'atlas_deep_read',
  'atlas_secondary_action',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsValue | null | undefined>;

const ALLOWED_PARAMETER_NAMES = new Set([
  'page_title',
  'page_location',
  'page_path',
  'module',
  'button_id',
  'destination',
  'context',
  'method',
  'society_slug',
  'source_screen',
  'filter_type',
  'validation_group',
  'error_count',
  'is_referral',
  'consent_state',
  'chapter',
  'action',
  'content_type',
  'content_id',
  'item_id',
]);

const CAMPAIGN_PARAMETERS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __flatdataGaConfigured?: string;
  }
}

export function analyticsModule(pathname: string) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/owner')) return 'owner';
  if (pathname.startsWith('/buyer')) return 'buyer';
  if (pathname.startsWith('/explore')) return 'explorer';
  if (pathname.startsWith('/societies/')) return 'society';
  if (pathname.startsWith('/atlas/projects/')) return 'atlas_project';
  if (pathname.startsWith('/atlas')) return 'atlas_market';
  if (pathname.startsWith('/developer-ratings')) return 'developer_ratings';
  if (pathname.startsWith('/privacy')) return 'privacy';
  return 'other';
}

export function safeAnalyticsPageLocation(href: string) {
  const current = new URL(href);
  const safe = new URL(current.pathname, current.origin);
  for (const name of CAMPAIGN_PARAMETERS) {
    const value = current.searchParams.get(name);
    if (!value || /@|\b\d{8,}\b/.test(value)) continue;
    const safeValue = value
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 100);
    if (safeValue) safe.searchParams.set(name, safeValue);
  }
  return safe.toString();
}

export function sanitizeAnalyticsParams(params: AnalyticsParams) {
  const sanitized: Record<string, AnalyticsValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_PARAMETER_NAMES.has(key) || value == null) continue;
    if (typeof value === 'string') sanitized[key] = value.slice(0, 100);
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
    }
    if (typeof value === 'boolean') sanitized[key] = value;
  }
  return sanitized;
}

function ensureGtag() {
  if (typeof window === 'undefined') return null;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  return window.gtag;
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsParams = {},
) {
  const gtag = ensureGtag();
  if (!gtag || window.location.pathname.startsWith('/admin')) return false;

  const pagePath = window.location.pathname;
  gtag('event', eventName, {
    ...sanitizeAnalyticsParams({
      page_path: pagePath,
      module: analyticsModule(pagePath),
      ...params,
    }),
    transport_type: 'beacon',
  });
  return true;
}
