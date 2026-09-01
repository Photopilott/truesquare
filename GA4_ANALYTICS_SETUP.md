# FlatData GA4 setup and exact funnels

## What the site sends

The site sends page paths, safe campaign tags, public society/project slugs, and interaction labels. It does not send email addresses, typed search text, owner form values, purchase prices, loan details, floor/tower details, authentication errors, referral IDs, or private valuations.

GA4 is disabled on `/admin`. Google Signals, advertising personalisation, and ads data collection are disabled in the site configuration.

Set the public environment variable below to activate analytics:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Event contract

| Event                          | Meaning                                          | Useful properties                                 |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------- |
| `page_view`                    | A safe public page was viewed                    | `page_path`, `module`                             |
| `button_click`                 | Any link or button was clicked                   | `page_path`, `module`, `button_id`, `destination` |
| `primary_cta_click`            | A main route-choice button was clicked           | `button_id`, `destination`                        |
| `owner_form_start`             | The owner changed the first field                | `is_referral`                                     |
| `owner_form_submit`            | A valid owner form was submitted                 | `society_slug`, `is_referral`                     |
| `form_validation_error`        | Owner submission was blocked by validation       | `validation_group`, `error_count`                 |
| `auth_gate_view`               | A sign-in gate opened                            | `context`                                         |
| `auth_method_selected`         | Google or email OTP was selected                 | `method`, `context`                               |
| `sign_up`                      | A new account was verified                       | `method`, `context`                               |
| `login`                        | A returning account was verified                 | `method`, `context`                               |
| `access_verified`              | A signed-in user continued through a gate        | `context`                                         |
| `consent_complete`             | The user continued with new or existing consent  | `context`, `consent_state`                        |
| `valuation_complete`           | The private owner result was produced            | `society_slug`, `is_referral`                     |
| `buyer_filter_use`             | A buyer used search, location, BHK, or budget    | `filter_type`                                     |
| `society_detail_view`          | A buyer opened a society card                    | `society_slug`, `source_screen`                   |
| `evidence_unlock_click`        | A buyer asked to unlock transaction evidence     | `society_slug`                                    |
| `evidence_unlock`              | Transaction evidence was shown                   | `society_slug`                                    |
| `share_preview_opened`         | The safe society share preview was opened        | `society_slug`, `source_screen`                   |
| `share`                        | WhatsApp sharing or copy-link completed          | `method`, `society_slug`, `source_screen`         |
| `shared_link_opened`           | A tracked society share link was opened          | `society_slug`                                    |
| `referred_owner_started`       | A referred visitor chose the owner journey       | `society_slug`                                    |
| `referred_valuation_completed` | A referred visitor completed a valuation         | `society_slug`                                    |
| `subscription_start`           | Price-update subscription was requested          | `society_slug`, `source_screen`                   |
| `subscription_complete`        | Price-update subscription was saved              | `society_slug`, `source_screen`                   |
| `subscription_cancelled`       | Price updates were stopped                       | `society_slug`, `source_screen`                   |
| `atlas_filter_use`             | An Atlas area, asset class, or page was selected | `filter_type`                                     |
| `atlas_project_open`           | An Atlas project record loaded                   | `item_id`                                         |
| `atlas_deep_read`              | The reader reached the Authority chapter         | `item_id`, `chapter`                              |
| `atlas_secondary_action`       | Watch, compare, share, or report was clicked     | `item_id`, `action`                               |

## Create these GA4 custom dimensions

In GA4, open **Admin → Data display → Custom definitions → Create custom dimension**. Use Event scope for each definition. GA4 already has a built-in Page path dimension, so do not duplicate it.

Create: `module`, `button_id`, `destination`, `context`, `method`, `society_slug`, `source_screen`, `filter_type`, `validation_group`, `is_referral`, `consent_state`, `chapter`, and `action`.

Do not create dimensions for email, form fields, prices, loans, tower/floor, auth errors, or referral IDs.

## Mark these as key events

In **Admin → Data display → Events**, mark these as key events:

- `sign_up`
- `valuation_complete`
- `evidence_unlock`
- `referred_valuation_completed`
- `subscription_complete`

## Build these exact Funnel explorations

Use **Explore → Funnel exploration**. Make each funnel an open funnel so a user can enter at a later step. Use indirect steps unless a direct step is called out.

### 1. Owner valuation

1. `page_view` where the built-in `Page path and screen class` exactly matches `/owner`
2. `owner_form_start`
3. `owner_form_submit`
4. `auth_gate_view` where `context` is `owner`
5. `access_verified` where `context` is `owner`
6. `consent_complete` where `context` is `owner`
7. `valuation_complete`

Break down by `Session source / medium`, `Device category`, and `is_referral`.

### 2. Buyer evidence unlock

1. `page_view` where the built-in `Page path and screen class` exactly matches `/buyer`
2. `society_detail_view`
3. `evidence_unlock_click`
4. `auth_gate_view` where `context` is `buyer`
5. `access_verified` where `context` is `buyer`
6. `consent_complete` where `context` is `buyer`
7. `evidence_unlock`

Break down by `Session source / medium`, `Device category`, and `society_slug`.

### 3. Shared-link referral loop

1. `share`
2. `shared_link_opened`
3. `referred_owner_started`
4. `owner_form_submit` where `is_referral` is true
5. `access_verified` where `context` is `owner`
6. `referred_valuation_completed`

The first step belongs to the sender and the later steps belong to the recipient, so use this as a volume funnel, not a same-user conversion rate. The site database retains the share-level relationship; GA4 intentionally does not receive the referral ID.

### 4. Society price-update subscription

1. `subscription_start`
2. `auth_gate_view` where `context` is `subscription`
3. `access_verified` where `context` is `subscription`
4. `consent_complete` where `context` is `subscription`
5. `subscription_complete`

Break down by `source_screen` and `society_slug`.

### 5. Atlas research depth

1. `page_view` where the built-in `Page path and screen class` exactly matches `/atlas`
2. `atlas_project_open`
3. `atlas_deep_read`
4. `atlas_secondary_action`

Break down by `action`, `Device category`, and `Session source / medium`.

### 6. Home routing

1. `page_view` where the built-in `Page path and screen class` exactly matches `/`
2. `primary_cta_click`
3. `page_view` where the built-in `Page path and screen class` matches `/owner`, `/buyer`, or `/explore`

Break down by `button_id` to see which promise routes the most visitors.

## Traffic-source rules

Google organic and direct visits are classified by GA4 automatically. Every controlled external link should use campaign tags:

```text
WhatsApp: ?utm_source=whatsapp&utm_medium=messaging&utm_campaign=<campaign>
Instagram: ?utm_source=instagram&utm_medium=social&utm_campaign=<campaign>
Email:     ?utm_source=newsletter&utm_medium=email&utm_campaign=<campaign>
Partner:   ?utm_source=<partner>&utm_medium=referral&utm_campaign=<campaign>
```

Society links created by the site already use `whatsapp / messaging / society_benchmark` for WhatsApp and `flatdata_share / referral / society_benchmark` for copied links. An untagged link can appear as Direct, so do not publish untagged links in channels you control.

## Reports to use weekly

- **Reports → Acquisition → Traffic acquisition:** sessions and key events by Session source / medium.
- **Reports → Engagement → Pages and screens:** traffic and engagement by page path.
- **Explore → Free form:** rows `Page path and screen class` then `button_id`; filter event name to `button_click`; values Event count and Total users.
- The six funnels above: compare each step with the previous week and investigate the largest percentage drop.

Allow 24–48 hours before judging standard GA4 reports or newly registered custom dimensions. Use Realtime and DebugView for implementation checks.
