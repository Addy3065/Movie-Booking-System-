# Project Context

_Durable knowledge for every agent session: architecture, conventions, decisions, gotchas._

## Architecture
- Node/Express API, MySQL 8 via `mysql2/promise` (migrated from Postgres/`pg` on 2026-10-15). Pool in `db/db.js`; transactions via `src/utils/transaction.js` (`withTransaction`, sets READ COMMITTED to match old Postgres semantics).
- DDL in `db/schema.sql`, demo data in `db/seed.sql` (re-runnable).

## Conventions
- Queries use `?` placeholders with `pool.query`/`client.query` (not `execute`) so arrays expand for `IN (?)` and bulk `VALUES ?`. Results: `const [rows] = await ...`; writes use `result.insertId` / `affectedRows` (MySQL has no RETURNING).
- DB error mapping lives in `src/middleware/errorHandler.js` keyed by mysql2 `err.code` (e.g. `ER_DUP_ENTRY`).

## Decisions
- Owner wants strictly scoped changes: do only what is asked, don't touch features.

## Gotchas
- SQL targets real MySQL 8 (uses `FOR SHARE`, `SKIP LOCKED`); the server's local `mysql` on :3306 is MariaDB 11.8, which rejects `FOR SHARE`.
- `FOR UPDATE` locks every joined table in MySQL (no `OF tbl`), so locking reads select from `show_seats` alone.
- Lock timestamps are `DATETIME(3)`; compare against `NOW(3)`.
- Other projects' Node servers run on this host (`workspace/api`, `workspace/cron`); never `pkill -f "node server.js"`.
