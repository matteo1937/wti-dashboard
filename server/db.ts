import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Grossist, GrossistMatch, ProductRecognition, StoredProduct } from "./types";

const DB_PATH = process.env.SQLITE_PATH ?? "data/products.db";
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    ean_barcode TEXT UNIQUE NOT NULL,
    product_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS catalog_products (
    id TEXT PRIMARY KEY,
    hersteller TEXT,
    bezeichnung TEXT,
    typ TEXT,
    kategorie TEXT,
    eldas_nummer TEXT UNIQUE NOT NULL,
    ean_barcode TEXT,
    beschreibung TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_catalog_ean ON catalog_products(ean_barcode);
  CREATE INDEX IF NOT EXISTS idx_catalog_hersteller_typ ON catalog_products(hersteller, typ);

  CREATE TABLE IF NOT EXISTS supplier_listings (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    grossist TEXT NOT NULL,
    prioritaet INTEGER NOT NULL,
    shop_url TEXT,
    verfuegbar INTEGER NOT NULL,
    preis_chf REAL,
    checked_at TEXT NOT NULL,
    UNIQUE(product_id, grossist)
  );
  CREATE INDEX IF NOT EXISTS idx_listings_product ON supplier_listings(product_id, prioritaet);
`);

function rowToStoredProduct(row: {
  id: string;
  ean_barcode: string;
  product_json: string;
  created_at: string;
}): StoredProduct {
  return {
    id: row.id,
    eanBarcode: row.ean_barcode,
    product: JSON.parse(row.product_json) as ProductRecognition,
    createdAt: row.created_at
  };
}

export function findProductByEan(ean: string): StoredProduct | null {
  const stmt = db.prepare("SELECT * FROM products WHERE ean_barcode = ?");
  const row = stmt.get(ean) as
    | { id: string; ean_barcode: string; product_json: string; created_at: string }
    | undefined;
  return row ? rowToStoredProduct(row) : null;
}

export function saveProduct(ean: string, product: ProductRecognition): StoredProduct {
  const existing = findProductByEan(ean);
  const id = existing?.id ?? randomUUID();
  const createdAt = existing?.createdAt ?? new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO products (id, ean_barcode, product_json, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(ean_barcode) DO UPDATE SET product_json = excluded.product_json
  `);
  stmt.run(id, ean, JSON.stringify(product), createdAt);

  return { id, eanBarcode: ean, product, createdAt };
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

export function upsertCatalogRow(row: CatalogImportRow): void {
  const now = new Date().toISOString();

  const existing = db
    .prepare("SELECT id FROM catalog_products WHERE eldas_nummer = ?")
    .get(row.eldasNummer) as { id: string } | undefined;
  const productId = existing?.id ?? randomUUID();

  db.prepare(
    `
    INSERT INTO catalog_products
      (id, hersteller, bezeichnung, typ, kategorie, eldas_nummer, ean_barcode, beschreibung, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(eldas_nummer) DO UPDATE SET
      hersteller = excluded.hersteller,
      bezeichnung = excluded.bezeichnung,
      typ = excluded.typ,
      kategorie = excluded.kategorie,
      ean_barcode = excluded.ean_barcode,
      beschreibung = excluded.beschreibung,
      updated_at = excluded.updated_at
  `
  ).run(
    productId,
    row.hersteller,
    row.bezeichnung,
    row.typ,
    row.kategorie,
    row.eldasNummer,
    row.eanBarcode,
    row.beschreibung,
    now
  );

  db.prepare(
    `
    INSERT INTO supplier_listings
      (id, product_id, grossist, prioritaet, shop_url, verfuegbar, preis_chf, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(product_id, grossist) DO UPDATE SET
      prioritaet = excluded.prioritaet,
      shop_url = excluded.shop_url,
      verfuegbar = excluded.verfuegbar,
      preis_chf = excluded.preis_chf,
      checked_at = excluded.checked_at
  `
  ).run(
    randomUUID(),
    productId,
    row.grossist,
    row.prioritaet,
    row.shopUrl,
    row.verfuegbar ? 1 : 0,
    row.preisChf,
    now
  );
}

interface CatalogProductRow {
  id: string;
  eldas_nummer: string;
}

interface SupplierListingRow {
  grossist: string;
  shop_url: string | null;
  verfuegbar: number;
  preis_chf: number | null;
}

function pickBestListing(productId: string): SupplierListingRow | null {
  const listings = db
    .prepare("SELECT * FROM supplier_listings WHERE product_id = ? ORDER BY prioritaet ASC")
    .all(productId) as unknown as SupplierListingRow[];
  return listings.find((listing) => listing.verfuegbar) ?? listings[0] ?? null;
}

function toMatch(product: CatalogProductRow, matchQuality: "ean" | "fuzzy"): GrossistMatch | null {
  const listing = pickBestListing(product.id);
  if (!listing) return null;

  return {
    grossist: listing.grossist as Grossist,
    eldasNummer: product.eldas_nummer,
    shopUrl: listing.shop_url,
    verfuegbar: Boolean(listing.verfuegbar),
    preisChf: listing.preis_chf,
    matchQuality
  };
}

export function findCatalogMatch(params: {
  eanBarcode?: string | null;
  hersteller?: string | null;
  typBezeichnung?: string | null;
}): GrossistMatch | null {
  if (params.eanBarcode) {
    const row = db
      .prepare("SELECT id, eldas_nummer FROM catalog_products WHERE ean_barcode = ?")
      .get(params.eanBarcode) as CatalogProductRow | undefined;
    if (row) return toMatch(row, "ean");
  }

  if (params.hersteller && params.typBezeichnung) {
    const row = db
      .prepare(
        "SELECT id, eldas_nummer FROM catalog_products WHERE lower(hersteller) = lower(?) AND lower(typ) LIKE lower(?)"
      )
      .get(params.hersteller, `%${params.typBezeichnung}%`) as CatalogProductRow | undefined;
    if (row) return toMatch(row, "fuzzy");
  }

  return null;
}
