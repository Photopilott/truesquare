import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const contributionStatus = pgEnum('contribution_status', [
  'pending',
  'approved',
  'rejected',
]);

export const contributors = pgTable(
  'contributors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('contributors_email_unique').on(table.email)],
);

export const ownerProperties = pgTable(
  'owner_properties',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contributorId: uuid('contributor_id')
      .notNull()
      .references(() => contributors.id, { onDelete: 'cascade' }),
    society: text('society').notNull(),
    location: text('location').notNull(),
    tower: text('tower').notNull(),
    floor: text('floor').notNull(),
    bhk: text('bhk').notNull(),
    areaSqFt: numeric('area_sq_ft', { precision: 12, scale: 2 }).notNull(),
    areaType: text('area_type').notNull(),
    carParks: integer('car_parks').notNull(),
    purchaseDate: date('purchase_date').notNull(),
    facing: text('facing'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('owner_properties_contributor_idx').on(table.contributorId),
    index('owner_properties_society_bhk_idx').on(table.society, table.bhk),
  ],
);

export const purchaseContributions = pgTable(
  'purchase_contributions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id').notNull(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => ownerProperties.id, { onDelete: 'cascade' }),
    purchasePrice: bigint('purchase_price', { mode: 'number' }).notNull(),
    stampDuty: bigint('stamp_duty', { mode: 'number' }).notNull(),
    registrationCost: bigint('registration_cost', { mode: 'number' }).notNull(),
    interiors: bigint('interiors', { mode: 'number' }).notNull(),
    brokerage: bigint('brokerage', { mode: 'number' }).notNull(),
    loanAmount: bigint('loan_amount', { mode: 'number' }),
    loanTenureYears: integer('loan_tenure_years'),
    loanRate: numeric('loan_rate', { precision: 6, scale: 3 }),
    status: contributionStatus('status').default('pending').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    reviewNotes: text('review_notes'),
  },
  (table) => [
    uniqueIndex('purchase_contributions_request_unique').on(table.requestId),
    index('purchase_contributions_status_idx').on(table.status, table.submittedAt),
  ],
);

export const ownerPriceAggregates = pgTable(
  'owner_price_aggregates',
  {
    society: text('society').notNull(),
    location: text('location').notNull(),
    bhk: text('bhk').notNull(),
    approvedCount: integer('approved_count').notNull(),
    minPricePerSqFt: numeric('min_price_per_sq_ft', { precision: 12, scale: 2 }).notNull(),
    medianPricePerSqFt: numeric('median_price_per_sq_ft', { precision: 12, scale: 2 }).notNull(),
    maxPricePerSqFt: numeric('max_price_per_sq_ft', { precision: 12, scale: 2 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.society, table.bhk] })],
);

export const registeredTransactions = pgTable(
  'registered_transactions',
  {
    id: text('id').primaryKey(),
    location: text('location').notNull(),
    society: text('society').notNull(),
    tower: text('tower'),
    bhk: text('bhk'),
    registrationDate: date('registration_date'),
    rawDate: text('raw_date').notNull(),
    price: bigint('price', { mode: 'number' }),
    effectiveArea: numeric('effective_area', { precision: 12, scale: 2 }),
    pricePerSqFt: numeric('price_per_sq_ft', { precision: 12, scale: 2 }),
    areaBasis: text('area_basis'),
    saleType: text('sale_type'),
    qaNotes: text('qa_notes'),
    sourceFile: text('source_file').notNull(),
    sourceUrl: text('source_url').notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('registered_transactions_society_bhk_idx').on(table.society, table.bhk),
    index('registered_transactions_location_bhk_idx').on(table.location, table.bhk),
  ],
);

export const adminOtpChallenges = pgTable(
  'admin_otp_challenges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attemptsRemaining: integer('attempts_remaining').default(5).notNull(),
    requestFingerprint: text('request_fingerprint').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    index('admin_otp_email_requested_idx').on(table.email, table.requestedAt),
    index('admin_otp_fingerprint_requested_idx').on(
      table.requestFingerprint,
      table.requestedAt,
    ),
  ],
);

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('admin_sessions_token_unique').on(table.tokenHash),
    index('admin_sessions_email_expires_idx').on(table.email, table.expiresAt),
  ],
);
