-- Referenz-Datenmodell für MVP 2+ (Postgres).
-- Wird noch NICHT verwendet/migriert – MVP 1 läuft ohne Datenbank.
-- Dient als Grundlage für die spätere Team-, Historie- und Grossisten-Anbindung.

CREATE TABLE organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organizations(id),
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    rolle         TEXT NOT NULL CHECK (rolle IN ('admin', 'mitglied')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hersteller    TEXT,
    bezeichnung   TEXT,
    typ           TEXT,
    kategorie     TEXT NOT NULL,
    eldas_nummer  TEXT,
    ean_barcode   TEXT UNIQUE,
    beschreibung  TEXT,
    org_id        UUID REFERENCES organizations(id), -- NULL = global/geteilt, sonst team-spezifische Korrektur
    created_by    UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_ean ON products(ean_barcode);
CREATE INDEX idx_products_eldas ON products(eldas_nummer);

CREATE TABLE supplier_listings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    grossist      TEXT NOT NULL CHECK (grossist IN ('EM', 'Sonepar', 'Otto Fischer', 'Bugnard')),
    prioritaet    INT NOT NULL DEFAULT 100, -- niedriger = höher priorisiert; EM Standard-Priorität 10
    shop_url      TEXT,
    verfuegbar    BOOLEAN NOT NULL DEFAULT true,
    preis_chf     NUMERIC(10, 2),
    checked_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_listings_product ON supplier_listings(product_id, prioritaet);

CREATE TABLE alternatives (
    product_id              UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    alternative_product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    kompatibilitaets_grad    TEXT NOT NULL CHECK (kompatibilitaets_grad IN ('gleichwertig', 'kompatibel', 'bedingt_kompatibel')),
    PRIMARY KEY (product_id, alternative_product_id)
);

CREATE TABLE scans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    foto_url            TEXT,
    barcode             TEXT,
    erkannt_via         TEXT NOT NULL CHECK (erkannt_via IN ('foto_ki', 'barcode')),
    erkanntes_produkt_id UUID REFERENCES products(id),
    projekt_tag         TEXT,
    manuell_korrigiert  BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scans_org_created ON scans(org_id, created_at DESC);
CREATE INDEX idx_scans_projekt_tag ON scans(projekt_tag);
