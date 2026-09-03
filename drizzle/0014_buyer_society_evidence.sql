CREATE OR REPLACE VIEW "public"."buyer_society_evidence" AS (
  WITH inventory_entities AS (
    SELECT
      'inventory:' || inventory.id AS catalogue_id,
      inventory.id AS flat_inventory_id,
      inventory.name AS society,
      inventory.area AS location,
      NULLIF(BTRIM(inventory.builder), '') AS builder,
      'inventory'::text AS catalogue_source
    FROM bangalore_flat_inventory inventory
    WHERE inventory.active = TRUE
  ), final_only_entities AS (
    SELECT DISTINCT ON (
      LOWER(BTRIM(final_values.society)),
      LOWER(BTRIM(final_values.location))
    )
      'final:' || MD5(
        LOWER(BTRIM(final_values.society)) || '|' ||
        LOWER(BTRIM(final_values.location))
      ) AS catalogue_id,
      NULL::text AS flat_inventory_id,
      BTRIM(final_values.society) AS society,
      BTRIM(final_values.location) AS location,
      NULL::text AS builder,
      'final_value'::text AS catalogue_source
    FROM final_flat_values final_values
    WHERE NOT EXISTS (
      SELECT 1
      FROM bangalore_flat_inventory inventory
      WHERE inventory.active = TRUE
        AND (
          final_values.flat_inventory_id = inventory.id
          OR (
            final_values.flat_inventory_id IS NULL
            AND LOWER(BTRIM(final_values.society)) = LOWER(BTRIM(inventory.name))
            AND LOWER(BTRIM(final_values.location)) = LOWER(BTRIM(inventory.area))
          )
        )
    )
    ORDER BY
      LOWER(BTRIM(final_values.society)),
      LOWER(BTRIM(final_values.location)),
      final_values.value_date DESC NULLS LAST,
      final_values.created_at DESC
  ), catalogue_entities AS (
    SELECT * FROM inventory_entities
    UNION ALL
    SELECT * FROM final_only_entities
  ), matched_values AS (
    SELECT
      entities.catalogue_id,
      entities.flat_inventory_id,
      entities.society,
      entities.location,
      entities.builder,
      entities.catalogue_source,
      final_values.id AS final_value_id,
      final_values.source_type,
      final_values.price,
      final_values.price_per_sq_ft,
      NULLIF(BTRIM(final_values.bhk), '') AS bhk,
      final_values.value_date,
      COUNT(*) FILTER (
        WHERE final_values.source_type = 'owner_input'
      ) OVER (
        PARTITION BY
          entities.catalogue_id,
          NULLIF(BTRIM(final_values.bhk), '')
      ) AS owner_bhk_count
    FROM catalogue_entities entities
    LEFT JOIN final_flat_values final_values
      ON (
        entities.flat_inventory_id IS NOT NULL
        AND final_values.flat_inventory_id = entities.flat_inventory_id
      ) OR (
        final_values.flat_inventory_id IS NULL
        AND LOWER(BTRIM(final_values.society)) = LOWER(BTRIM(entities.society))
        AND LOWER(BTRIM(final_values.location)) = LOWER(BTRIM(entities.location))
      )
  ), aggregated AS (
    SELECT
      catalogue_id,
      flat_inventory_id,
      society,
      location,
      builder,
      catalogue_source,
      CASE WHEN GROUPING(bhk) = 1 THEN NULL ELSE bhk END AS bhk,
      GROUPING(bhk) = 1 AS is_all_bhks,
      COUNT(final_value_id) FILTER (
        WHERE source_type = 'registered_transaction'
      ) AS registered_count,
      COUNT(final_value_id) FILTER (
        WHERE source_type = 'owner_input'
      ) AS approved_owner_count,
      COUNT(final_value_id) FILTER (
        WHERE source_type = 'owner_input' AND owner_bhk_count >= 3
      ) AS public_owner_count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) FILTER (
        WHERE source_type = 'registered_transaction' AND price > 0
      )::numeric AS registered_median_price,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_sq_ft) FILTER (
        WHERE source_type = 'registered_transaction' AND price_per_sq_ft > 0
      )::numeric AS registered_median_price_per_sq_ft,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) FILTER (
        WHERE source_type = 'owner_input' AND owner_bhk_count >= 3 AND price > 0
      )::numeric AS owner_median_price,
      MIN(price) FILTER (
        WHERE source_type = 'owner_input' AND owner_bhk_count >= 3 AND price > 0
      )::numeric AS owner_min_price,
      MAX(price) FILTER (
        WHERE source_type = 'owner_input' AND owner_bhk_count >= 3 AND price > 0
      )::numeric AS owner_max_price,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_sq_ft) FILTER (
        WHERE source_type = 'owner_input' AND owner_bhk_count >= 3 AND price_per_sq_ft > 0
      )::numeric AS owner_median_price_per_sq_ft,
      MIN(price_per_sq_ft) FILTER (
        WHERE source_type = 'owner_input' AND owner_bhk_count >= 3 AND price_per_sq_ft > 0
      )::numeric AS owner_min_price_per_sq_ft,
      MAX(price_per_sq_ft) FILTER (
        WHERE source_type = 'owner_input' AND owner_bhk_count >= 3 AND price_per_sq_ft > 0
      )::numeric AS owner_max_price_per_sq_ft,
      MAX(value_date) FILTER (
        WHERE source_type = 'registered_transaction'
      ) AS latest_registered_date,
      MAX(value_date) FILTER (
        WHERE source_type = 'owner_input' AND owner_bhk_count >= 3
      ) AS latest_owner_date
    FROM matched_values
    GROUP BY GROUPING SETS (
      (
        catalogue_id,
        flat_inventory_id,
        society,
        location,
        builder,
        catalogue_source
      ),
      (
        catalogue_id,
        flat_inventory_id,
        society,
        location,
        builder,
        catalogue_source,
        bhk
      )
    )
    HAVING
      GROUPING(bhk) = 1
      OR (
        bhk IS NOT NULL
        AND (
          COUNT(final_value_id) FILTER (
            WHERE source_type = 'registered_transaction'
          ) > 0
          OR COUNT(final_value_id) FILTER (
            WHERE source_type = 'owner_input' AND owner_bhk_count >= 3
          ) > 0
        )
      )
  )
  SELECT
    catalogue_id,
    flat_inventory_id,
    society,
    location,
    builder,
    catalogue_source,
    bhk,
    is_all_bhks,
    registered_count,
    approved_owner_count,
    public_owner_count,
    registered_median_price,
    registered_median_price_per_sq_ft,
    owner_median_price,
    owner_min_price,
    owner_max_price,
    owner_median_price_per_sq_ft,
    owner_min_price_per_sq_ft,
    owner_max_price_per_sq_ft,
    latest_registered_date,
    latest_owner_date,
    CASE
      WHEN registered_count > 0 AND public_owner_count > 0 THEN 'combined'
      WHEN registered_count > 0 THEN 'registered_transaction'
      WHEN public_owner_count > 0 THEN 'owner_input'
      ELSE 'none'
    END AS evidence_source
  FROM aggregated
);
