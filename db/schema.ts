import { sql } from 'drizzle-orm';
import {
  boolean,
  bigint,
  check,
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

export const consentContext = pgEnum('consent_context', [
  'owner',
  'buyer',
  'subscription',
]);

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

export const societyPriceSubscriptionStatus = pgEnum(
  'society_price_subscription_status',
  ['active', 'unsubscribed'],
);

export const societyPriceSubscriptions = pgTable(
  'society_price_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    societySlug: text('society_slug').notNull(),
    societyName: text('society_name').notNull(),
    status: societyPriceSubscriptionStatus('status')
      .default('active')
      .notNull(),
    sourceScreen: text('source_screen').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('society_price_subscriptions_user_society_unique').on(
      table.userId,
      table.societySlug,
    ),
    index('society_price_subscriptions_society_status_idx').on(
      table.societySlug,
      table.status,
    ),
  ],
);

export const contributionStatus = pgEnum('contribution_status', [
  'pending',
  'approved',
  'rejected',
]);

export const flatValueSourceType = pgEnum('flat_value_source_type', [
  'registered_transaction',
  'owner_input',
]);

export const bangaloreFlatInventory = pgTable(
  'bangalore_flat_inventory',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    nameKey: text('name_key').notNull(),
    area: text('area').notNull(),
    areaKey: text('area_key').notNull(),
    builder: text('builder').notNull(),
    sourceUrl: text('source_url'),
    sourceFile: text('source_file').notNull(),
    active: boolean('active').default(true).notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('bangalore_flat_inventory_name_area_unique').on(
      table.nameKey,
      table.areaKey,
    ),
    index('bangalore_flat_inventory_active_area_idx').on(
      table.active,
      table.area,
      table.name,
    ),
  ],
);

export const developerInterestAudience = pgEnum('developer_interest_audience', [
  'buyer',
  'owner',
]);

export const developerInterestStatus = pgEnum('developer_interest_status', [
  'pending',
  'reviewed',
  'archived',
]);

export const developerInterestSubmissions = pgTable(
  'developer_interest_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    audience: developerInterestAudience('audience').notNull(),
    developer: text('developer').notNull(),
    project: text('project'),
    buyingStage: text('buying_stage'),
    relationship: text('relationship'),
    experience: text('experience'),
    email: text('email').notNull(),
    emailOptIn: boolean('email_opt_in').default(true).notNull(),
    consentVersion: text('consent_version').notNull(),
    status: developerInterestStatus('status').default('pending').notNull(),
    requestFingerprint: text('request_fingerprint').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    reviewNotes: text('review_notes'),
  },
  (table) => [
    index('developer_interest_developer_status_idx').on(
      table.developer,
      table.status,
      table.createdAt,
    ),
    index('developer_interest_email_created_idx').on(
      table.email,
      table.createdAt,
    ),
    index('developer_interest_fingerprint_created_idx').on(
      table.requestFingerprint,
      table.createdAt,
    ),
  ],
);

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
    flatInventoryId: text('flat_inventory_id').references(
      () => bangaloreFlatInventory.id,
      { onDelete: 'restrict' },
    ),
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
    index('owner_properties_flat_inventory_idx').on(table.flatInventoryId),
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
    flatInventoryId: text('flat_inventory_id').references(
      () => bangaloreFlatInventory.id,
      { onDelete: 'restrict' },
    ),
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
    index('registered_transactions_flat_inventory_idx').on(
      table.flatInventoryId,
    ),
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

export const ownerInputTransactions = pgTable(
  'owner_input_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contributionId: uuid('contribution_id')
      .notNull()
      .references(() => purchaseContributions.id, { onDelete: 'cascade' }),
    flatInventoryId: text('flat_inventory_id').references(
      () => bangaloreFlatInventory.id,
      { onDelete: 'restrict' },
    ),
    purchasePrice: bigint('purchase_price', { mode: 'number' }).notNull(),
    effectiveArea: numeric('effective_area', {
      precision: 12,
      scale: 2,
    }).notNull(),
    pricePerSqFt: numeric('price_per_sq_ft', {
      precision: 12,
      scale: 2,
    }).notNull(),
    bhk: text('bhk').notNull(),
    purchaseDate: date('purchase_date').notNull(),
    status: contributionStatus('status').default('pending').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    reviewNotes: text('review_notes'),
    society: text('society').notNull(),
    location: text('location').notNull(),
  },
  (table) => [
    uniqueIndex('owner_input_transactions_contribution_unique').on(
      table.contributionId,
    ),
    index('owner_input_transactions_flat_status_idx').on(
      table.flatInventoryId,
      table.status,
    ),
  ],
);

export const finalFlatValues = pgTable(
  'final_flat_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    flatInventoryId: text('flat_inventory_id').references(
      () => bangaloreFlatInventory.id,
      { onDelete: 'restrict' },
    ),
    sourceType: flatValueSourceType('source_type').notNull(),
    registeredTransactionId: text('registered_transaction_id').references(
      () => registeredTransactions.id,
      { onDelete: 'restrict' },
    ),
    ownerInputTransactionId: uuid('owner_input_transaction_id').references(
      () => ownerInputTransactions.id,
      { onDelete: 'restrict' },
    ),
    price: bigint('price', { mode: 'number' }).notNull(),
    effectiveArea: numeric('effective_area', { precision: 12, scale: 2 }),
    pricePerSqFt: numeric('price_per_sq_ft', { precision: 12, scale: 2 }),
    bhk: text('bhk'),
    valueDate: date('value_date'),
    society: text('society').notNull(),
    location: text('location').notNull(),
    sourceUrl: text('source_url'),
    approvedBy: text('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('final_flat_values_registered_transaction_unique').on(
      table.registeredTransactionId,
    ),
    uniqueIndex('final_flat_values_owner_input_unique').on(
      table.ownerInputTransactionId,
    ),
    index('final_flat_values_flat_source_date_idx').on(
      table.flatInventoryId,
      table.sourceType,
      table.valueDate,
    ),
    check(
      'final_flat_values_source_reference_check',
      sql`(
        (${table.sourceType} = 'registered_transaction'
          AND ${table.registeredTransactionId} IS NOT NULL
          AND ${table.ownerInputTransactionId} IS NULL)
        OR
        (${table.sourceType} = 'owner_input'
          AND ${table.registeredTransactionId} IS NULL
          AND ${table.ownerInputTransactionId} IS NOT NULL
          AND ${table.approvedAt} IS NOT NULL)
      )`,
    ),
  ],
);

export const bugReports = pgTable(
  'bug_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => appUsers.id, {
      onDelete: 'set null',
    }),
    reporterEmail: text('reporter_email'),
    pagePath: text('page_path').notNull(),
    message: text('message').notNull(),
    status: text('status').default('open').notNull(),
    requestFingerprint: text('request_fingerprint'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: text('resolved_by'),
  },
  (table) => [
    index('bug_reports_status_created_idx').on(table.status, table.createdAt),
  ],
);

export const atlasProjects = pgTable(
  'atlas_projects',
  {
    id: integer('id').primaryKey(),
    registration: text('registration').notNull(),
    name: text('name').notNull(),
    builder: text('builder').notNull(),
    namedDeveloper: text('named_developer').notNull(),
    status: text('status').notNull(),
    taluk: text('taluk').notNull(),
    address: text('address'),
    latitude: numeric('latitude', { precision: 12, scale: 8 }),
    longitude: numeric('longitude', { precision: 12, scale: 8 }),
    market: text('market').notNull(),
    marketConfidence: numeric('market_confidence', {
      precision: 6,
      scale: 4,
    }).notNull(),
    targetDate: date('target_date'),
    actualCompletionDate: date('actual_completion_date'),
    startDate: date('start_date'),
    description: text('description'),
    delivery: text('delivery').notNull(),
    deliveryVarianceDays: integer('delivery_variance_days'),
    units: integer('units'),
    complaints: integer('complaints'),
    landSqm: numeric('land_sqm', { precision: 18, scale: 2 }),
    landAcres: numeric('land_acres', {
      precision: 18,
      scale: 4,
    }).generatedAlwaysAs(sql`round("land_sqm" / 4046.8564224, 4)`),
    coveredSqm: numeric('covered_sqm', { precision: 18, scale: 2 }),
    openSqm: numeric('open_sqm', { precision: 18, scale: 2 }),
    towers: integer('towers'),
    floors: integer('floors'),
    builtUpSqm: numeric('built_up_sqm', { precision: 18, scale: 2 }),
    constructionProgress: text('construction_progress'),
    planningAuthority: text('planning_authority'),
    enrichmentSourceUrl: text('enrichment_source_url'),
    enrichmentMatchMethod: text('enrichment_match_method'),
    enrichmentResearchStatus: text('enrichment_research_status'),
    airportKm: numeric('airport_km', { precision: 10, scale: 2 }),
    nearbyCount: integer('nearby_count'),
    nearbyNames: jsonb('nearby_names').$type<string[]>().notNull(),
    builderProjects: integer('builder_projects').notNull(),
    builderOnTimeRate: numeric('builder_on_time_rate', {
      precision: 7,
      scale: 2,
    }),
    builderComplaints: integer('builder_complaints'),
    schools: integer('schools'),
    hospitals: integer('hospitals'),
    malls: integer('malls'),
    metro: text('metro'),
    metroKm: numeric('metro_km', { precision: 10, scale: 2 }),
    inventory: jsonb('inventory')
      .$type<
        Array<{
          type: string;
          count: number;
          min_carpet_sqm: number | null;
          max_carpet_sqm: number | null;
        }>
      >()
      .notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('atlas_projects_registration_unique').on(table.registration),
    index('atlas_projects_builder_idx').on(table.builder),
    index('atlas_projects_named_developer_idx').on(table.namedDeveloper),
    index('atlas_projects_market_idx').on(table.market),
    index('atlas_projects_status_idx').on(table.status),
    index('atlas_projects_authority_idx').on(table.planningAuthority),
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

export const societySubscriptionDeliveries = pgTable(
  'society_subscription_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => societyPriceSubscriptions.id, { onDelete: 'cascade' }),
    recipientEmail: text('recipient_email').notNull(),
    societySlug: text('society_slug').notNull(),
    societyName: text('society_name').notNull(),
    eventType: text('event_type').notNull(),
    eventKey: text('event_key').notNull(),
    status: notificationDeliveryStatus('status').default('pending').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('society_subscription_deliveries_event_unique').on(
      table.subscriptionId,
      table.eventKey,
    ),
    index('society_subscription_deliveries_status_created_idx').on(
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
