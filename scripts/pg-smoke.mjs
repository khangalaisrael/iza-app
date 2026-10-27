// Starts an in-memory Postgres on a local port, then exercises the same code path as production
// (DATABASE_URL + the `pg` driver) against it. Usage: node scripts/pg-smoke.mjs
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const pg = await PGlite.create();
const server = new PGLiteSocketServer({ db: pg, port: 54329, host: "127.0.0.1" });
await server.start();
console.log("postgres ready on 127.0.0.1:54329");
process.on("SIGTERM", async () => { await server.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
