import {
  boolean,
  bigint,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userAuthProvider = pgEnum('user_auth_provider', [
  'google',
  'email_otp',
]);

export const consentContext = pgEnum('consent_context', ['owner', 'buyer']);

export const appUsers = pgTable(
  'app_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', {
      withTimezone: true,
    }).notNull(),
    googleSubject: text('google_subject'),
    displayName: text('display_name'),
    pictureUrl: text('picture_url'),
    lastAuthProvider: userAuthProvider('last_auth_provider').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('app_users_email_unique').on(table.email),
    uniqueIndex('app_users_google_subject_unique').on(table.googleSubject),
  ],
);

export const userOtpChallenges = pgTable(
  'user_otp_challenges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attemptsRemaining: integer('attempts_remaining').default(5).notNull(),
    requestFingerprint: text('request_fingerprint').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    index('user_otp_email_requested_idx').on(table.email, table.requestedAt),
    index('user_otp_fingerprint_requested_idx').on(
      table.requestFingerprint,
      table.requestedAt,
    ),
  ],
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    authProvider: userAuthProvider('auth_provider').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('user_sessions_token_unique').on(table.tokenHash),
    index('user_sessions_user_expires_idx').on(table.userId, table.expiresAt),
  ],
);

export const userConsents = pgTable(
  'user_consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    context: consentContext('context').notNull(),
    covenantVersion: text('covenant_version').notNull(),
    accepted: boolean('accepted').default(true).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    requestFingerprint: text('request_fingerprint').notNull(),
  },
  (table) => [
    uniqueIndex('user_consents_user_context_version_unique').on(
      table.userId,
      table.context,
      table.covenantVersion,
    ),
  ],
);

export const contributionStatus = pgEnum('contribution_status', [
  'pending',
  'approved',
  'rejected',
]);

export const contributors = pgTable(
  'contributors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => appUsers.id, {
      onDelete: 'set null',
    }),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
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
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('owner_properties_contributor_idx').on(table.contributorId),
    index('owner_properties_society_bhk_idx').on(table.society, table.bhk),
  ],
);

export const shareRecords = pgTable(
  'share_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    createdByUserId: uuid('created_by_user_id').references(() => appUsers.id, {
      onDelete: 'set null',
    }),
    contentType: text('content_type').notNull(),
    contentId: text('content_id').notNull(),
    sourceScreen: text('source_screen').notNull(),
    messageVariant: text('message_variant').notNull(),
    requestFingerprint: text('request_fingerprint'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('share_records_content_idx').on(
      table.contentType,
      table.contentId,
      table.createdAt,
    ),
    index('share_records_user_created_idx').on(
      table.createdByUserId,
      table.createdAt,
    ),
  ],
);

export const purchaseContributions = pgTable(
  'purchase_contributions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id').notNull(),
    referralShareId: uuid('referral_share_id').references(
      () => shareRecords.id,
      { onDelete: 'set null' },
    ),
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
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    reviewNotes: text('review_notes'),
    requestFingerprint: text('request_fingerprint'),
  },
  (table) => [
    uniqueIndex('purchase_contributions_request_unique').on(table.requestId),
    index('purchase_contributions_status_idx').on(
      table.status,
      table.submittedAt,
    ),
    index('purchase_contributions_referral_idx').on(table.referralShareId),
  ],
);

export const productEvents = pgTable(
  'product_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    shareId: uuid('share_id').references(() => shareRecords.id, {
      onDelete: 'set null',
    }),
    eventName: text('event_name').notNull(),
    contentType: text('content_type').notNull(),
    contentId: text('content_id').notNull(),
    sourceScreen: text('source_screen').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    requestFingerprint: text('request_fingerprint'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('product_events_name_created_idx').on(
      table.eventName,
      table.createdAt,
    ),
    index('product_events_share_created_idx').on(
      table.shareId,
      table.createdAt,
    ),
  ],
);

export const ownerPriceAggregates = pgTable(
  'owner_price_aggregates',
  {
    society: text('society').notNull(),
    location: text('location').notNull(),
    bhk: text('bhk').notNull(),
    approvedCount: integer('approved_count').notNull(),
    minPricePerSqFt: numeric('min_price_per_sq_ft', {
      precision: 12,
      scale: 2,
    }).notNull(),
    medianPricePerSqFt: numeric('median_price_per_sq_ft', {
      precision: 12,
      scale: 2,
    }).notNull(),
    maxPricePerSqFt: numeric('max_price_per_sq_ft', {
      precision: 12,
      scale: 2,
    }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
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
    importedAt: timestamp('imported_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('registered_transactions_society_bhk_idx').on(
      table.society,
      table.bhk,
    ),
    index('registered_transactions_location_bhk_idx').on(
      table.location,
      table.bhk,
    ),
  ],
);

export const transactionImportBatchStatus = pgEnum(
  'transaction_import_batch_status',
  ['staged', 'applied'],
);

export const transactionImportRowStatus = pgEnum(
  'transaction_import_row_status',
  ['ready', 'needs_review', 'rejected'],
);

export const registeredTransactionImports = pgTable(
  'registered_transaction_imports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceFileName: text('source_file_name').notNull(),
    sourceChecksum: text('source_checksum').notNull(),
    uploadedBy: text('uploaded_by').notNull(),
    submittedRows: integer('submitted_rows').notNull(),
    readyRows: integer('ready_rows').notNull(),
    reviewRows: integer('review_rows').notNull(),
    rejectedRows: integer('rejected_rows').notNull(),
    status: transactionImportBatchStatus('status').default('staged').notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    appliedBy: text('applied_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('registered_transaction_imports_checksum_unique').on(
      table.sourceChecksum,
    ),
    index('registered_transaction_imports_created_idx').on(table.createdAt),
  ],
);

export const registeredTransactionImportRows = pgTable(
  'registered_transaction_import_rows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    importId: uuid('import_id')
      .notNull()
      .references(() => registeredTransactionImports.id, {
        onDelete: 'cascade',
      }),
    ordinal: integer('ordinal').notNull(),
    sourceRecordId: text('source_record_id'),
    location: text('location'),
    sourceLocation: text('source_location'),
    society: text('society'),
    propertyType: text('property_type'),
    unitNumber: text('unit_number'),
    floor: text('floor'),
    tower: text('tower'),
    bhk: text('bhk'),
    registrationDate: date('registration_date'),
    rawDate: text('raw_date'),
    price: bigint('price', { mode: 'number' }),
    effectiveArea: numeric('effective_area', { precision: 12, scale: 2 }),
    pricePerSqFt: numeric('price_per_sq_ft', { precision: 12, scale: 2 }),
    areaBasis: text('area_basis'),
    eventType: text('event_type'),
    saleType: text('sale_type'),
    qaNotes: text('qa_notes'),
    sourceFile: text('source_file'),
    sourceUrl: text('source_url'),
    qaStatus: transactionImportRowStatus('qa_status').notNull(),
    qaReasons: jsonb('qa_reasons').$type<string[]>().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('registered_transaction_import_rows_ordinal_unique').on(
      table.importId,
      table.ordinal,
    ),
    index('registered_transaction_import_rows_status_idx').on(
      table.importId,
      table.qaStatus,
    ),
    index('registered_transaction_import_rows_source_idx').on(
      table.sourceRecordId,
    ),
  ],
);

export const valuationSnapshots = pgTable(
  'valuation_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contributionId: uuid('contribution_id')
      .notNull()
      .references(() => purchaseContributions.id, { onDelete: 'cascade' }),
    algorithmVersion: text('algorithm_version').notNull(),
    matchTier: text('match_tier').notNull(),
    matchLabel: text('match_label').notNull(),
    confidence: text('confidence').notNull(),
    supportingTransactionIds: jsonb('supporting_transaction_ids')
      .$type<string[]>()
      .notNull(),
    supportingTransactionCount: integer(
      'supporting_transaction_count',
    ).notNull(),
    estimate: bigint('estimate', { mode: 'number' }),
    low: bigint('low', { mode: 'number' }),
    high: bigint('high', { mode: 'number' }),
    acquisitionCost: bigint('acquisition_cost', { mode: 'number' }).notNull(),
    absoluteAppreciation: bigint('absolute_appreciation', { mode: 'number' }),
    returnAfterCosts: bigint('return_after_costs', { mode: 'number' }),
    annualizedReturn: numeric('annualized_return', {
      precision: 18,
      scale: 12,
    }),
    loanInterest: bigint('loan_interest', { mode: 'number' }).notNull(),
    ownerEvidenceCount: integer('owner_evidence_count').notNull(),
    ownerEvidenceMinPricePerSqFt: numeric(
      'owner_evidence_min_price_per_sq_ft',
      {
        precision: 12,
        scale: 2,
      },
    ),
    ownerEvidenceMedianPricePerSqFt: numeric(
      'owner_evidence_median_price_per_sq_ft',
      { precision: 12, scale: 2 },
    ),
    ownerEvidenceMaxPricePerSqFt: numeric(
      'owner_evidence_max_price_per_sq_ft',
      {
        precision: 12,
        scale: 2,
      },
    ),
    inputSnapshot: jsonb('input_snapshot')
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('valuation_snapshots_contribution_unique').on(
      table.contributionId,
    ),
    index('valuation_snapshots_created_idx').on(table.createdAt),
  ],
);

export const notificationDeliveryStatus = pgEnum(
  'notification_delivery_status',
  ['pending', 'sent', 'failed'],
);

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contributionId: uuid('contribution_id')
      .notNull()
      .references(() => purchaseContributions.id, { onDelete: 'cascade' }),
    recipientEmail: text('recipient_email').notNull(),
    eventType: text('event_type').notNull(),
    status: notificationDeliveryStatus('status').default('pending').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('notification_deliveries_contribution_unique').on(
      table.contributionId,
    ),
    index('notification_deliveries_status_created_idx').on(
      table.status,
      table.createdAt,
    ),
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
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
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
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('admin_sessions_token_unique').on(table.tokenHash),
    index('admin_sessions_email_expires_idx').on(table.email, table.expiresAt),
  ],
);
