// Executa varios arquivos .sql em sequencia no Postgres do Supabase via pg client.
// Uso: DB_URL=postgresql://... node scripts/run-migrations.mjs arq1.sql arq2.sql ...
// Abre 1 conexao so e roda em ordem. Para no primeiro erro.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const arquivos = process.argv.slice(2);
if (arquivos.length === 0) {
  console.error("[X] Uso: node scripts/run-migrations.mjs <arq1.sql> [arq2.sql ...]");
  process.exit(2);
}
if (!process.env.DB_URL) {
  console.error("[X] Variavel DB_URL nao definida");
  process.exit(2);
}

const client = new pg.Client({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
});

let ok = 0;
let falha = null;

try {
  console.log("[..] conectando...");
  await client.connect();
  console.log("[OK] conectado");
  console.log("");

  for (const arq of arquivos) {
    const nome = path.basename(arq);
    if (!fs.existsSync(arq)) {
      console.error("[X] arquivo nao existe: " + arq);
      falha = arq;
      break;
    }
    const sql = fs.readFileSync(arq, "utf-8");
    console.log(">>> " + nome + " (" + sql.split("\n").length + " linhas)");
    try {
      const r = await client.query(sql);
      const results = Array.isArray(r) ? r : [r];
      for (const item of results) {
        if (item && item.rows && item.rows.length > 0) {
          for (const row of item.rows) {
            console.log("    " + JSON.stringify(row));
          }
        }
      }
      console.log("    [OK]");
      ok++;
    } catch (e) {
      console.error("    [X] ERRO: " + e.message);
      if (e.detail) console.error("        detail: " + e.detail);
      if (e.hint) console.error("        hint:   " + e.hint);
      falha = nome;
      break;
    }
  }
} finally {
  await client.end();
}

console.log("");
if (falha) {
  console.error("[X] parou em " + falha + " apos " + ok + " ok");
  process.exit(1);
} else {
  console.log("[OK] " + ok + " migration(s) aplicada(s)");
}
