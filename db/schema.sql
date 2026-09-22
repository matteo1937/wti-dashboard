-- Das aktive Postgres-Schema liegt in server/migrations/001_init.sql
-- (products, catalog_products, supplier_listings, scans) und wird über
-- `npm run migrate` angelegt. Organisationen/Benutzer werden von Clerk
-- verwaltet, es gibt bewusst keine lokalen organizations/users-Tabellen.
--
-- Diese Datei ist die Erweiterung für eine noch NICHT umgesetzte Funktion:
-- automatische Ersatzprodukt-Vorschläge (kompatible Alternativen anderer
-- Hersteller) statt nur der Such-Kriterien, die MVP 3 bereits anzeigt.

CREATE TABLE IF NOT EXISTS alternatives (
    product_id              UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    alternative_product_id  UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    kompatibilitaets_grad   TEXT NOT NULL CHECK (kompatibilitaets_grad IN ('gleichwertig', 'kompatibel', 'bedingt_kompatibel')),
    PRIMARY KEY (product_id, alternative_product_id)
);
