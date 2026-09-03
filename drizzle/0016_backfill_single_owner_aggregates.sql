INSERT INTO owner_price_aggregates (
  society,
  location,
  bhk,
  approved_count,
  min_price_per_sq_ft,
  median_price_per_sq_ft,
  max_price_per_sq_ft,
  updated_at
)
SELECT
  society,
  location,
  bhk,
  COUNT(*)::integer,
  MIN(price_per_sq_ft),
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_sq_ft),
  MAX(price_per_sq_ft),
  NOW()
FROM final_flat_values
WHERE
  source_type = 'owner_input'
  AND bhk IS NOT NULL
  AND price_per_sq_ft > 0
GROUP BY society, location, bhk
ON CONFLICT (society, bhk) DO UPDATE SET
  location = EXCLUDED.location,
  approved_count = EXCLUDED.approved_count,
  min_price_per_sq_ft = EXCLUDED.min_price_per_sq_ft,
  median_price_per_sq_ft = EXCLUDED.median_price_per_sq_ft,
  max_price_per_sq_ft = EXCLUDED.max_price_per_sq_ft,
  updated_at = EXCLUDED.updated_at;
