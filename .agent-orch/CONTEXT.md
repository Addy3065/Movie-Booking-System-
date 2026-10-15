# Project Context

_Durable knowledge for every agent session: architecture, conventions, decisions, gotchas._

## Architecture
- Node/Express API, MySQL 8 via `mysql2/promise` (migrated from Postgres/`pg` on 2026-10-15). Pool in `db/db.js`; transactions via `src/utils/transaction.js` (`withTransaction`, sets READ COMMITTED to match old Postgres semantics).
- DDL in `db/schema.sql`, demo data in `db/seed.sql` (re-runnable; 10 cinemas, 10 real films checked against the OMDb API (key `OMDB_API_KEY` in .env; IMDb ids in comments), 5 shows per movie and per cinema dated from CURRENT_DATE+1..3, so reseed when they go stale: `sudo mysql movie_booking < db/seed.sql`). Demo logins listed at top of seed.sql.
- Frontend: `client/` (Vite + React + react-router, plain CSS in `src/index.css`, no UI lib). Dev server proxies `/api` to :3000 (`API_PROXY` overrides); prod uses `VITE_API_URL`. JWT + user name kept in localStorage (`/auth/me` returns no name). Payments are simulated (`simulate: success|failure`).

- Preview: https://movies.129-154-229-134.sslip.io — Caddy block in /etc/caddy/Caddyfile serves /var/www/movie-booking (copy of client build) and proxies /api/* to systemd `movie-booking.service` (server.js, PORT 4430, root `.env`, MariaDB db `movie_booking`). Redeploy frontend: `cd client && npm run build && sudo rsync -a --delete dist/ /var/www/movie-booking/`; API: `sudo systemctl restart movie-booking`.

## Conventions
- Queries use `?` placeholders with `pool.query`/`client.query` (not `execute`) so arrays expand for `IN (?)` and bulk `VALUES ?`. Results: `const [rows] = await ...`; writes use `result.insertId` / `affectedRows` (MySQL has no RETURNING).
- DB error mapping lives in `src/middleware/errorHandler.js` keyed by mysql2 `err.code` (e.g. `ER_DUP_ENTRY`).

## Decisions
- Owner wants strictly scoped changes: do only what is asked, don't touch features.

## Gotchas
- SQL targets real MySQL 8 (uses `FOR SHARE`, `SKIP LOCKED`); the server's local `mysql` on :3306 is MariaDB 11.8, which rejects `FOR SHARE` (so admin create-show fails on the preview DB; everything else works).
- `FOR UPDATE` locks every joined table in MySQL (no `OF tbl`), so locking reads select from `show_seats` alone.
- Lock timestamps are `DATETIME(3)`; compare against `NOW(3)`.
- Port 3000 on this host is taken by another project; test the API on a spare port (e.g. 3101).
- Other projects' Node servers run on this host (`workspace/api`, `workspace/cron`); never `pkill -f "node server.js"`.
