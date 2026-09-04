CREATE SCHEMA IF NOT EXISTS "admin_reporting";
--> statement-breakpoint
REVOKE ALL ON SCHEMA "admin_reporting" FROM PUBLIC;
--> statement-breakpoint
CREATE OR REPLACE VIEW "admin_reporting"."lead_activity" AS
SELECT
  LOWER(BTRIM(users.email)) AS email,
  'verified_signup'::text AS event_type,
  'authentication'::text AS section,
  users.created_at AS occurred_at,
  JSONB_BUILD_OBJECT(
    'auth_provider', users.last_auth_provider::text,
    'email_verified_at', users.email_verified_at
  ) AS details
FROM app_users users

UNION ALL

SELECT
  LOWER(BTRIM(users.email)) AS email,
  'latest_login'::text AS event_type,
  'authentication'::text AS section,
  users.last_login_at AS occurred_at,
  JSONB_BUILD_OBJECT('auth_provider', users.last_auth_provider::text) AS details
FROM app_users users

UNION ALL

SELECT
  LOWER(BTRIM(interests.email)) AS email,
  'developer_report_requested'::text AS event_type,
  'developer_ratings'::text AS section,
  interests.created_at AS occurred_at,
  JSONB_BUILD_OBJECT(
    'audience', interests.audience::text,
    'developer', interests.developer,
    'project', interests.project,
    'buying_stage', interests.buying_stage,
    'relationship', interests.relationship,
    'status', interests.status::text,
    'email_opt_in', interests.email_opt_in
  ) AS details
FROM developer_interest_submissions interests

UNION ALL

SELECT
  LOWER(BTRIM(contributors.email)) AS email,
  'owner_data_submitted'::text AS event_type,
  'owner'::text AS section,
  contributions.submitted_at AS occurred_at,
  JSONB_BUILD_OBJECT(
    'society', properties.society,
    'location', properties.location,
    'bhk', properties.bhk,
    'status', contributions.status::text
  ) AS details
FROM purchase_contributions contributions
JOIN owner_properties properties ON properties.id = contributions.property_id
JOIN contributors ON contributors.id = properties.contributor_id

UNION ALL

SELECT
  LOWER(BTRIM(users.email)) AS email,
  'price_update_subscription'::text AS event_type,
  subscriptions.source_screen AS section,
  subscriptions.created_at AS occurred_at,
  JSONB_BUILD_OBJECT(
    'society', subscriptions.society_name,
    'status', subscriptions.status::text
  ) AS details
FROM society_price_subscriptions subscriptions
JOIN app_users users ON users.id = subscriptions.user_id

UNION ALL

SELECT
  LOWER(BTRIM(users.email)) AS email,
  'consent_accepted'::text AS event_type,
  consents.context::text AS section,
  consents.accepted_at AS occurred_at,
  JSONB_BUILD_OBJECT(
    'context', consents.context::text,
    'accepted', consents.accepted,
    'covenant_version', consents.covenant_version
  ) AS details
FROM user_consents consents
JOIN app_users users ON users.id = consents.user_id
WHERE consents.accepted = TRUE

UNION ALL

SELECT
  LOWER(BTRIM(users.email)) AS email,
  'content_shared'::text AS event_type,
  shares.source_screen AS section,
  shares.created_at AS occurred_at,
  JSONB_BUILD_OBJECT(
    'content_type', shares.content_type,
    'message_variant', shares.message_variant
  ) AS details
FROM share_records shares
JOIN app_users users ON users.id = shares.created_by_user_id;
--> statement-breakpoint
CREATE OR REPLACE VIEW "admin_reporting"."lead_summary" AS
WITH activity AS (
  SELECT * FROM admin_reporting.lead_activity
), totals AS (
  SELECT
    email,
    MIN(occurred_at) AS first_seen_at,
    MAX(occurred_at) AS latest_activity_at,
    (ARRAY_AGG(event_type ORDER BY occurred_at DESC, event_type))[1] AS latest_signal,
    (ARRAY_AGG(section ORDER BY occurred_at DESC, event_type))[1] AS latest_section,
    ARRAY_AGG(DISTINCT section ORDER BY section) AS sections,
    BOOL_OR(event_type = 'verified_signup') AS verified_user,
    COUNT(*) FILTER (WHERE event_type = 'owner_data_submitted')::integer AS owner_submissions,
    COUNT(*) FILTER (WHERE event_type = 'developer_report_requested')::integer AS developer_requests,
    COUNT(*) FILTER (
      WHERE event_type = 'price_update_subscription'
        AND details ->> 'status' = 'active'
    )::integer AS active_subscriptions,
    COUNT(*) FILTER (WHERE event_type = 'content_shared')::integer AS content_shares,
    BOOL_OR(
      event_type = 'developer_report_requested'
      AND COALESCE((details ->> 'email_opt_in')::boolean, FALSE)
    ) OR BOOL_OR(
      event_type = 'price_update_subscription'
      AND details ->> 'status' = 'active'
    ) AS contactable
  FROM activity
  GROUP BY email
)
SELECT
  totals.email,
  CASE
    WHEN totals.owner_submissions > 0 THEN 'owner_contributor'
    WHEN totals.developer_requests > 0 THEN 'developer_report_lead'
    WHEN totals.active_subscriptions > 0 THEN 'price_update_subscriber'
    WHEN totals.verified_user THEN 'verified_signup'
    ELSE 'email_lead'
  END AS lead_stage,
  totals.first_seen_at,
  totals.latest_activity_at,
  totals.latest_signal,
  totals.latest_section,
  totals.sections,
  totals.verified_user,
  users.last_auth_provider::text AS auth_provider,
  users.created_at AS signed_up_at,
  users.last_login_at,
  totals.owner_submissions,
  totals.developer_requests,
  totals.active_subscriptions,
  totals.content_shares,
  totals.contactable
FROM totals
LEFT JOIN app_users users ON LOWER(BTRIM(users.email)) = totals.email;
--> statement-breakpoint
REVOKE ALL ON "admin_reporting"."lead_activity" FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON "admin_reporting"."lead_summary" FROM PUBLIC;
