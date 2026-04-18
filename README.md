# CookShare

Full-stack recipe sharing app — React frontend served by an Express backend.

## Project Structure

```
cookshare-web/
├── frontend/   # Vite + React
└── backend/    # Express + MongoDB
    └── public/ # Built frontend assets (served statically)
```

## Development

Run frontend and backend separately with hot-reload:

```bash
# Terminal 1 — backend
cd backend
npm run dev     # runs on http://localhost:5001

# Terminal 2 — frontend
cd frontend
npm run dev     # runs on http://localhost:5173
```

### Frontend environment variables (dev)

Create `frontend/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

> **Important:** Vite reads `.env` at **build time**, not at runtime. The value
> of `VITE_GOOGLE_CLIENT_ID` is **baked into the compiled JS bundle**. There is
> no `.env` file on the server — the variable must be set before running
> `npm run build`.

## Production Build

Build the frontend and copy the output into the backend's `public/` folder so
Express serves it as a static SPA:

```bash
cd frontend
npm run build                          # reads frontend/.env, compiles to dist/
cp -r dist/* ../backend/public/        # replace backend/public with new build
```

Then start the backend — it serves both the API and the frontend from one process:

```bash
cd backend
npm start        # serves frontend at / and API at /api/*
```

### How the client-side env works in production

| Stage | What happens |
|---|---|
| `npm run build` | Vite reads `frontend/.env` and inlines every `VITE_*` variable directly into the JS bundle as string literals. |
| Deploy | The compiled bundle (no `.env` file) is copied to `backend/public/`. |
| Runtime | The browser loads the JS — the values are already embedded. The backend never sees or needs them. |

This means: **to change `VITE_GOOGLE_CLIENT_ID` in production, you must rebuild the frontend with the correct value in `frontend/.env` before copying to `backend/public/`.**
