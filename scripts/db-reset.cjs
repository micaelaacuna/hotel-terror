// drop every app table/view in the public schema so the CAP deployer recreates the schema
// on the next deploy. runs INSIDE the app container (cf run-task), reading VCAP_SERVICES.
// why this exists: CAP's Postgres schema evolution cannot drop columns. extension-owned
// objects (pg_*) are skipped.
const svc = JSON.parse(process.env.VCAP_SERVICES);
const key = Object.keys(svc).find((k) => /postgres/i.test(k)) || Object.keys(svc)[0];
const cr = svc[key][0].credentials;
const { Client } = require("pg");
const c = new Client({
  host: cr.hostname, port: cr.port, database: cr.dbname,
  user: cr.username, password: cr.password,
  ssl: { rejectUnauthorized: false },
});
const mine = (n) => !n.startsWith("pg_");

(async () => {
  await c.connect();
  const views = (await c.query("SELECT viewname n FROM pg_views WHERE schemaname='public'")).rows.map((r) => r.n).filter(mine);
  const tables = (await c.query("SELECT tablename n FROM pg_tables WHERE schemaname='public'")).rows.map((r) => r.n).filter(mine);
  console.log("RESET views:", views.length, views.join(","));
  console.log("RESET tables:", tables.length, tables.join(","));
  for (const v of views) { try { await c.query('DROP VIEW IF EXISTS "' + v + '" CASCADE'); } catch (e) { console.log("skip view", v, e.message); } }
  for (const t of tables) { try { await c.query('DROP TABLE IF EXISTS "' + t + '" CASCADE'); } catch (e) { console.log("skip table", t, e.message); } }
  const left = (await c.query("SELECT tablename n FROM pg_tables WHERE schemaname='public'")).rows.map((r) => r.n).filter(mine);
  console.log("RESET remaining:", left.length, left.join(","));
  await c.end();
})().catch((e) => { console.error("RESET FAIL:", e.message); process.exit(1); });
