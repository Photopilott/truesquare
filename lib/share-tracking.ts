export const SHARE_SOURCE_SCREENS = [
  'society_page',
  'buyer_detail',
  'owner_result',
  'atlas_project',
] as const;

export const PRODUCT_EVENT_NAMES = [
  'share_prompt_viewed',
  'share_preview_opened',
  'whatsapp_share_started',
  'share_link_copied',
  'shared_link_opened',
  'referred_owner_started',
  'referred_valuation_completed',
] as const;

export type ShareSourceScreen = (typeof SHARE_SOURCE_SCREENS)[number];
export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isShareSourceScreen(
  value: unknown,
): value is ShareSourceScreen {
  return (
    typeof value === 'string' &&
    SHARE_SOURCE_SCREENS.includes(value as ShareSourceScreen)
  );
}

export function isProductEventName(value: unknown): value is ProductEventName {
  return (
    typeof value === 'string' &&
    PRODUCT_EVENT_NAMES.includes(value as ProductEventName)
  );
}

export function safeEventMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        ([key, item]) =>
          ['entry', 'variant'].includes(key) &&
          typeof item === 'string' &&
          item.length <= 80,
      )
      .slice(0, 4),
  );
}
