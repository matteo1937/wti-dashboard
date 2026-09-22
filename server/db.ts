import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ProductRecognition, StoredProduct } from "./types";

const DB_PATH = process.env.SQLITE_PATH ?? "data/products.db";
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    ean_barcode TEXT UNIQUE NOT NULL,
    product_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
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
