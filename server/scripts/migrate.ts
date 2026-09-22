import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL ist nicht gesetzt. Siehe .env.example.");
    process.exit(1);
  }

  const sql = readFileSync(join(__dirname, "../migrations/001_init.sql"), "utf-8");
  const pool = new Pool({ connectionString });

  try {
    await pool.query(sql);
    console.log("Migration erfolgreich ausgeführt.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration fehlgeschlagen:", err);
  process.exit(1);
});
