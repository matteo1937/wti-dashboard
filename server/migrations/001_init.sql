-- Elektro Scanner – Postgres-Schema (MVP 4).
-- Organisationen/Benutzer werden von Clerk verwaltet (org_id/user_id sind
-- Clerk-IDs als Text) – deshalb keine lokalen organizations/users-Tabellen.

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  ean_barcode TEXT NOT NULL,
  product_json JSONB NOT NULL,
  saved_by_user_id TEXT NOT NULL,
  saved_by_user_name TEXT NOT NULL,
  manuell_korrigiert BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, ean_barcode)
);

CREATE TABLE IF NOT EXISTS catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hersteller TEXT,
  bezeichnung TEXT,
  typ TEXT,
  kategorie TEXT,
  eldas_nummer TEXT UNIQUE NOT NULL,
  ean_barcode TEXT,
  beschreibung TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_catalog_ean ON catalog_products(ean_barcode);
CREATE INDEX IF NOT EXISTS idx_catalog_hersteller_typ ON catalog_products(hersteller, typ);

CREATE TABLE IF NOT EXISTS supplier_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  grossist TEXT NOT NULL,
  prioritaet INT NOT NULL,
  shop_url TEXT,
  verfuegbar BOOLEAN NOT NULL,
  preis_chf NUMERIC(10, 2),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, grossist)
);
CREATE INDEX IF NOT EXISTS idx_listings_product ON supplier_listings(product_id, prioritaet);

CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  erkannt_via TEXT NOT NULL CHECK (erkannt_via IN ('foto_ki', 'barcode_db')),
  ean_barcode TEXT,
  produkt_json JSONB NOT NULL,
  projekt_tag TEXT,
  manuell_korrigiert BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scans_org_created ON scans(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_projekt_tag ON scans(org_id, projekt_tag);
