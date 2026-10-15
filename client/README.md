# Marquee — frontend

React (Vite) frontend for the movie booking API in the parent folder.

Pages: movies → showtimes → seat map (hold → confirm → pay) → my bookings, plus sign in / register.

## Run

```bash
# 1. start the API from the project root (defaults to http://localhost:3000)
npm start

# 2. in another terminal
cd client
npm install
npm run dev        # http://localhost:5173
```

In dev, Vite proxies `/api` to `http://localhost:3000`. If the API runs elsewhere:
`API_PROXY=http://localhost:4000 npm run dev`.

## Production build

```bash
VITE_API_URL=https://api.example.com npm run build   # output in dist/
```

The API must then allow the frontend's origin in its `CORS_ORIGIN` env var.
