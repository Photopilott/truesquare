import propertyData from '@/data/property-data.json';
import { getSql, hasDatabase } from '@/db';

type TransactionRow = {
  id: string;
  location: string;
  society: string;
  tower: string | null;
  bhk: string | null;
  registration_date: string | Date | null;
  raw_date: string;
  price: string | number | null;
  effective_area: string | number | null;
  price_per_sq_ft: string | number | null;
  area_basis: string | null;
  sale_type: string | null;
  qa_notes: string | null;
  source_file: string;
  source_url: string;
};

export async function getRegisteredTransactions() {
  if (!hasDatabase()) return propertyData.records;

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        id,
        location,
        society,
        tower,
        bhk,
        registration_date,
        raw_date,
        price,
        effective_area,
        price_per_sq_ft,
        area_basis,
        sale_type,
        qa_notes,
        source_file,
        source_url
      FROM registered_transactions
      ORDER BY society, registration_date DESC NULLS LAST, id
    ` as TransactionRow[];

    if (!rows.length) return propertyData.records;
    return rows.map((row) => ({
      id: row.id,
      location: row.location,
      society: row.society,
      tower: row.tower,
      bhk: row.bhk,
      registrationDate: row.registration_date
        ? new Date(row.registration_date).toISOString().slice(0, 10)
        : null,
      rawDate: row.raw_date,
      price: row.price == null ? null : Number(row.price),
      effectiveArea: row.effective_area == null ? null : Number(row.effective_area),
      pricePerSqFt: row.price_per_sq_ft == null ? null : Number(row.price_per_sq_ft),
      areaBasis: row.area_basis,
      saleType: row.sale_type,
      qaNotes: row.qa_notes,
      sourceFile: row.source_file,
      sourceUrl: row.source_url,
    }));
  } catch (error) {
    console.error('Unable to load registered transactions from the database.', error);
    return propertyData.records;
  }
}
