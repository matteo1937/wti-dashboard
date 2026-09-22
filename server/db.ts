import { Pool } from "pg";
import type { Grossist, GrossistMatch, ProductRecognition } from "./types";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface StoredProduct {
  id: string;
  eanBarcode: string;
  product: ProductRecognition;
  savedByUserId: string;
  savedByUserName: string;
  manuellKorrigiert: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductRow {
  id: string;
  ean_barcode: string;
  product_json: ProductRecognition;
  saved_by_user_id: string;
  saved_by_user_name: string;
  manuell_korrigiert: boolean;
  created_at: Date;
  updated_at: Date;
}

function rowToStoredProduct(row: ProductRow): StoredProduct {
  return {
    id: row.id,
    eanBarcode: row.ean_barcode,
    product: row.product_json,
    savedByUserId: row.saved_by_user_id,
    savedByUserName: row.saved_by_user_name,
    manuellKorrigiert: row.manuell_korrigiert,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function findProductByEan(orgId: string, ean: string): Promise<StoredProduct | null> {
  const { rows } = await pool.query<ProductRow>(
    "SELECT * FROM products WHERE org_id = $1 AND ean_barcode = $2",
    [orgId, ean]
  );
  return rows[0] ? rowToStoredProduct(rows[0]) : null;
}

export async function saveProduct(params: {
  orgId: string;
  ean: string;
  product: ProductRecognition;
  userId: string;
  userName: string;
  manuellKorrigiert?: boolean;
}): Promise<StoredProduct> {
  const { rows } = await pool.query<ProductRow>(
    `
    INSERT INTO products (org_id, ean_barcode, product_json, saved_by_user_id, saved_by_user_name, manuell_korrigiert)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (org_id, ean_barcode) DO UPDATE SET
      product_json = excluded.product_json,
      saved_by_user_id = excluded.saved_by_user_id,
      saved_by_user_name = excluded.saved_by_user_name,
      manuell_korrigiert = excluded.manuell_korrigiert,
      updated_at = now()
    RETURNING *
    `,
    [
      params.orgId,
      params.ean,
      JSON.stringify(params.product),
      params.userId,
      params.userName,
      params.manuellKorrigiert ?? false
    ]
  );
  return rowToStoredProduct(rows[0]);
}

export interface CatalogImportRow {
  hersteller: string | null;
  bezeichnung: string | null;
  typ: string | null;
  kategorie: string | null;
  eldasNummer: string;
  eanBarcode: string | null;
  beschreibung: string | null;
  grossist: Grossist;
  prioritaet: number;
  shopUrl: string | null;
  verfuegbar: boolean;
  preisChf: number | null;
}

export async function upsertCatalogRow(row: CatalogImportRow): Promise<void> {
  const { rows } = await pool.query<{ id: string }>(
    `
    INSERT INTO catalog_products (hersteller, bezeichnung, typ, kategorie, eldas_nummer, ean_barcode, beschreibung, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, now())
    ON CONFLICT (eldas_nummer) DO UPDATE SET
      hersteller = excluded.hersteller,
      bezeichnung = excluded.bezeichnung,
      typ = excluded.typ,
      kategorie = excluded.kategorie,
      ean_barcode = excluded.ean_barcode,
      beschreibung = excluded.beschreibung,
      updated_at = now()
    RETURNING id
    `,
    [row.hersteller, row.bezeichnung, row.typ, row.kategorie, row.eldasNummer, row.eanBarcode, row.beschreibung]
  );
  const productId = rows[0].id;

  await pool.query(
    `
    INSERT INTO supplier_listings (product_id, grossist, prioritaet, shop_url, verfuegbar, preis_chf, checked_at)
    VALUES ($1, $2, $3, $4, $5, $6, now())
    ON CONFLICT (product_id, grossist) DO UPDATE SET
      prioritaet = excluded.prioritaet,
      shop_url = excluded.shop_url,
      verfuegbar = excluded.verfuegbar,
      preis_chf = excluded.preis_chf,
      checked_at = now()
    `,
    [productId, row.grossist, row.prioritaet, row.shopUrl, row.verfuegbar, row.preisChf]
  );
}

interface CatalogProductRow {
  id: string;
  eldas_nummer: string;
}

interface SupplierListingRow {
  grossist: Grossist;
  shop_url: string | null;
  verfuegbar: boolean;
  preis_chf: string | null;
}

async function pickBestListing(productId: string): Promise<SupplierListingRow | null> {
  const { rows } = await pool.query<SupplierListingRow>(
    "SELECT * FROM supplier_listings WHERE product_id = $1 ORDER BY prioritaet ASC",
    [productId]
  );
  return rows.find((listing) => listing.verfuegbar) ?? rows[0] ?? null;
}

async function toMatch(
  product: CatalogProductRow,
  matchQuality: "ean" | "fuzzy"
): Promise<GrossistMatch | null> {
  const listing = await pickBestListing(product.id);
  if (!listing) return null;

  return {
    grossist: listing.grossist,
    eldasNummer: product.eldas_nummer,
    shopUrl: listing.shop_url,
    verfuegbar: listing.verfuegbar,
    preisChf: listing.preis_chf != null ? Number(listing.preis_chf) : null,
    matchQuality
  };
}

export async function findCatalogMatch(params: {
  eanBarcode?: string | null;
  hersteller?: string | null;
  typBezeichnung?: string | null;
}): Promise<GrossistMatch | null> {
  if (params.eanBarcode) {
    const { rows } = await pool.query<CatalogProductRow>(
      "SELECT id, eldas_nummer FROM catalog_products WHERE ean_barcode = $1",
      [params.eanBarcode]
    );
    if (rows[0]) return toMatch(rows[0], "ean");
  }

  if (params.hersteller && params.typBezeichnung) {
    const { rows } = await pool.query<CatalogProductRow>(
      "SELECT id, eldas_nummer FROM catalog_products WHERE lower(hersteller) = lower($1) AND lower(typ) LIKE lower($2)",
      [params.hersteller, `%${params.typBezeichnung}%`]
    );
    if (rows[0]) return toMatch(rows[0], "fuzzy");
  }

  return null;
}

export interface ScanLogEntry {
  orgId: string;
  userId: string;
  userName: string;
  erkanntVia: "foto_ki" | "barcode_db";
  eanBarcode: string | null;
  produkt: ProductRecognition;
  projektTag: string | null;
  manuellKorrigiert: boolean;
}

export async function logScan(entry: ScanLogEntry): Promise<void> {
  await pool.query(
    `
    INSERT INTO scans (org_id, user_id, user_name, erkannt_via, ean_barcode, produkt_json, projekt_tag, manuell_korrigiert)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      entry.orgId,
      entry.userId,
      entry.userName,
      entry.erkanntVia,
      entry.eanBarcode,
      JSON.stringify(entry.produkt),
      entry.projektTag,
      entry.manuellKorrigiert
    ]
  );
}

export interface ScanHistoryRow {
  id: string;
  userId: string;
  userName: string;
  erkanntVia: "foto_ki" | "barcode_db";
  eanBarcode: string | null;
  produkt: ProductRecognition;
  projektTag: string | null;
  manuellKorrigiert: boolean;
  createdAt: Date;
}

interface RawScanRow {
  id: string;
  user_id: string;
  user_name: string;
  erkannt_via: "foto_ki" | "barcode_db";
  ean_barcode: string | null;
  produkt_json: ProductRecognition;
  projekt_tag: string | null;
  manuell_korrigiert: boolean;
  created_at: Date;
}

export async function listScans(params: {
  orgId: string;
  userId?: string;
  projektTag?: string;
  von?: string;
  bis?: string;
}): Promise<ScanHistoryRow[]> {
  const conditions = ["org_id = $1"];
  const values: unknown[] = [params.orgId];

  if (params.userId) {
    values.push(params.userId);
    conditions.push(`user_id = $${values.length}`);
  }
  if (params.projektTag) {
    values.push(params.projektTag);
    conditions.push(`projekt_tag = $${values.length}`);
  }
  if (params.von) {
    values.push(params.von);
    conditions.push(`created_at >= $${values.length}`);
  }
  if (params.bis) {
    values.push(params.bis);
    conditions.push(`created_at <= $${values.length}`);
  }

  const { rows } = await pool.query<RawScanRow>(
    `SELECT * FROM scans WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT 500`,
    values
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    erkanntVia: row.erkannt_via,
    eanBarcode: row.ean_barcode,
    produkt: row.produkt_json,
    projektTag: row.projekt_tag,
    manuellKorrigiert: row.manuell_korrigiert,
    createdAt: row.created_at
  }));
}
