export const DEVELOPER_INTEREST_CONSENT_VERSION = '2026-09-03';

export const BUYING_STAGES = [
  'Just researching',
  'Comparing a shortlist',
  'Planning a site visit',
  'Close to booking',
] as const;

export const OWNER_RELATIONSHIPS = [
  'Current owner',
  'Past owner',
  'Buyer—purchase completed',
  'Buyer—purchase cancelled',
] as const;

export type DeveloperInterestInput = {
  audience: 'buyer' | 'owner';
  developer: string;
  project: string | null;
  buyingStage: (typeof BUYING_STAGES)[number] | null;
  relationship: (typeof OWNER_RELATIONSHIPS)[number] | null;
  experience: string | null;
  email: string;
  emailOptIn: true;
};

type ParseResult =
  | { ok: true; data: DeveloperInterestInput }
  | { ok: false; error: string };

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanLongText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\r\n/g, '\n').slice(0, maxLength);
}

export function parseDeveloperInterest(value: unknown): ParseResult {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'Invalid request body.' };
  }

  const body = value as Record<string, unknown>;
  const audience = body.audience;
  if (audience !== 'buyer' && audience !== 'owner') {
    return { ok: false, error: 'Choose whether you are buying or own a flat.' };
  }

  const developer = cleanText(body.developer, 120);
  if (developer.length < 2) {
    return { ok: false, error: 'Enter the developer name.' };
  }

  const project = cleanText(body.project, 160) || null;
  if (audience === 'owner' && !project) {
    return { ok: false, error: 'Enter your project or society.' };
  }

  const email = cleanText(body.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  if (body.emailOptIn !== true) {
    return {
      ok: false,
      error: 'Confirm that FlatData may email you about this report.',
    };
  }

  const buyingStage = cleanText(body.buyingStage, 80);
  if (
    audience === 'buyer' &&
    !BUYING_STAGES.includes(buyingStage as (typeof BUYING_STAGES)[number])
  ) {
    return { ok: false, error: 'Choose your buying stage.' };
  }

  const relationship = cleanText(body.relationship, 80);
  if (
    audience === 'owner' &&
    !OWNER_RELATIONSHIPS.includes(
      relationship as (typeof OWNER_RELATIONSHIPS)[number],
    )
  ) {
    return { ok: false, error: 'Choose your relationship to the property.' };
  }

  return {
    ok: true,
    data: {
      audience,
      developer,
      project,
      buyingStage:
        audience === 'buyer'
          ? (buyingStage as (typeof BUYING_STAGES)[number])
          : null,
      relationship:
        audience === 'owner'
          ? (relationship as (typeof OWNER_RELATIONSHIPS)[number])
          : null,
      experience:
        audience === 'owner'
          ? cleanLongText(body.experience, 2000) || null
          : null,
      email,
      emailOptIn: true,
    },
  };
}
