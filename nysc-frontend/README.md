# NYSC-2026 Frontend

Landing page for the National Young Scientist Conference 2026, built with
React + Vite + Tailwind CSS v4 + Framer Motion.

## Running it locally (Windows PowerShell)

```powershell
cd ncys-frontend
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

## Design notes
- **Colors**: deep-space navy, a cool pale "atmosphere" background, a
  rust-ochre accent (mining-flavored, distinct from generic terracotta),
  moss green for the sustainability track, gold for small accents.
  All defined as CSS variables in `src/index.css` under `@theme`.
- **Type**: Space Grotesk (display/headlines) + IBM Plex Sans (body) —
  loaded via Google Fonts in `src/index.css`.
- **Motif**: a recurring orbital-ring + topographic-contour SVG
  (`src/components/OrbitalMotif.jsx`) used as the one consistent visual
  signature across the page, instead of a different icon per section.
- Content (tracks, dates) is placeholder-flagged in the UI itself
  ("Finalized tracks to follow", "To be announced") since the real
  values aren't decided yet — update `Tracks.jsx` and `Dates.jsx` directly
  once they are.

## What's next
- Wire the "Register to attend" / "Submit a paper" buttons to the
  registration flow once that page exists (they currently link to an
  in-page anchor)
- Build the actual registration form, connecting to the backend's
  `POST /registrations` and `POST /payments/create-order` endpoints
- Committee/speaker section once names are available
