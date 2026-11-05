// small interactive SQL shell for the tunneled PostgreSQL, using the pg module from
// @cap-js/postgres (no psql needed). credentials come from env vars set by db-shell.sh.
// helpers: \dt tables  \d <table> columns  \q quit. SQL needs no trailing ";".
const { Client } = require("pg");
const readline = require("readline");

const cfg = {
  host: "127.0.0.1",
  port: Number(process.env.PG_LOCAL_PORT || 63306),
  database: process.env.PG_DBNAME,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  // cert is for the real DB host, not localhost
  ssl: { rejectUnauthorized: false },
};

async function main() {
  const c = new Client(cfg);
  await c.connect();
  console.log(`connected to "${cfg.database}" as "${cfg.user}" via localhost:${cfg.port}`);
  console.log('helpers: \\dt (tables)  \\d <table> (columns)  \\q (quit). SQL needs no ";".');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "sql> " });
  rl.prompt();

  rl.on("line", async (raw) => {
    const line = raw.trim();
    if (!line) { rl.prompt(); return; }
    if (line === "\\q" || line === "exit" || line === "quit") { rl.close(); return; }

    let sql = line;
    if (line === "\\dt") {
      sql = "select tablename from pg_tables where schemaname='public' and tablename not like 'pg_%' order by 1";
    } else if (line.startsWith("\\d ")) {
      const t = line.slice(3).trim().replace(/[";]/g, "");
      sql = `select column_name, data_type from information_schema.columns where table_schema='public' and table_name='${t}' order by ordinal_position`;
    }

    try {
      const res = await c.query(sql);
      if (Array.isArray(res.rows) && res.rows.length) console.table(res.rows);
      else console.log(res.command || "OK", res.rowCount != null ? `(${res.rowCount} rows)` : "");
    } catch (e) {
      console.error("ERR:", e.message);
    }
    rl.prompt();
  });

  rl.on("close", async () => { try { await c.end(); } catch (e) { /* ignore */ } process.exit(0); });
}

main().catch((e) => { console.error("connect failed:", e.message); process.exit(1); });
