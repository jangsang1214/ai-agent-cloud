# Vercel deployment checklist

ATLAS is deployed from the `atlas-rebuild` branch as a Preview until it is explicitly promoted or merged.

## Project settings

- Framework: Vite
- Node.js: 22.x
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root

`vercel.json` defines function duration limits and baseline security headers.

## Required server environment variables

Set these in Vercel. Never prefix them with `VITE_` and never commit their values.

- `MASSIVE_API_KEY` — required for LIVE price/volume data.
- `ATLAS_BATCH_TOKEN` — required only for protected batch endpoints used by future whole-market jobs.

Recommended targets: Preview and Production. Development is optional for `vercel dev`.

## API exposure

- `/api/bars` is public but restricted to the symbols used by the live dashboard and is CDN cached.
- `/api/universe` and `/api/grouped` require `ATLAS_BATCH_TOKEN` and return `private, no-store` responses.
- Upstream Massive requests have an 8-second timeout so a stalled provider does not consume the full function duration.

## Verification before promotion

1. GitHub Actions `ATLAS CI` must pass for the exact commit.
2. Open the Vercel Preview URL and confirm DEMO mode renders.
3. With `MASSIVE_API_KEY` configured, switch to LIVE and verify the allowed symbols load.
4. Confirm `/api/bars?symbol=AAPL` is rejected with 403.
5. Confirm `/api/universe` without the batch token is rejected.
6. Inspect Vercel build/runtime logs for errors before promoting anything to production.

## Current external blocker

The connected Vercel integration can read the GitHub repository but currently receives HTTP 403 when attempting to create the Vercel project. This is an account/integration permission issue rather than a repository build issue. Once a Vercel project is created or the integration gains project-create permission, `atlas-rebuild` can be deployed as a Preview without changing `main`.
