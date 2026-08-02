# Birds Near You

Birds Near You is a portfolio project focused on practical API orchestration and clean frontend UX.

Given a city and state/province, the app returns the five most commonly observed birds nearby, using real-world observation data from eBird and image enrichment from Wikipedia.

**[Demo](https://ruthstorm.github.io/birds/)**

## Project goals

1. For the fun of pairing my love of birding and coding.
2. Build a fast, simple search experience with meaningful data.
2. Experiment with React and learn Supabase.
2. Keep third-party API credentials secure by moving external calls server-side.
3. Demonstrate end-to-end integration across multiple APIs with graceful fallback behavior.

## Stack

1. Frontend: React, Vite, TypeScript
2. UI: Tailwind CSS, shadcn/ui
3. Backend: Supabase Edge Functions
4. External APIs: eBird, OpenStreetMap Nominatim, Wikipedia Summary API

## Why this architecture

The frontend never talks to eBird directly.

All upstream calls run through a Supabase Edge Function so `EBIRD_API_KEY` stays in Supabase Secrets and is never exposed in the browser bundle or network requests.

## Request flow

1. User submits city and state/province from the React app.
2. Frontend calls the hosted `top-birds` Edge Function.
3. Function geocodes location with Nominatim.
4. Function requests recent geo observations from eBird.
5. Function groups observations by species and returns top five by sightings.
6. Function finds each bird's Wikipedia lead image, verifies it's hosted on Wikimedia Commons under an allowed open license, and fetches its attribution metadata. Falls back from scientific name to common name, and skips the image entirely if no verified-license Commons file is found.
7. Frontend renders ranked cards with loading and error states, including a visible attribution caption (photographer/uploader and license, linked to source) on every displayed image.

## Behavior and defaults

1. Default lookback window: 30 days
2. Default search radius: 25 km
3. Default eBird max results: 500
4. Input validation and clear error responses for invalid requests

## Image licensing and attribution

Bird photos are only shown when their license can be verified:

1. The function resolves each species to its Wikipedia article's lead image, then checks whether that image is hosted on Wikimedia Commons (not a local, non-free "fair use" upload).
2. It queries the Commons API for the file's `extmetadata` and checks the license against an allow-list (`CC0`, `CC BY`, `CC BY-SA`, `Public domain`, `GFDL`, matched by substring).
3. If the image isn't Commons-hosted, isn't found, or isn't under an allowed license, no image is shown for that bird — the card falls back to the "No bird photo" state rather than displaying unverified or non-free content.
4. Verified images are returned with `artist`, `licenseShortName`, `licenseUrl`, and `sourcePageUrl`, and the frontend renders this as a caption directly on the image (linking to the source page and license), so attribution travels with the photo every time it's displayed.

## Environment setup

Create .env.local at the project root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_TOP_BIRDS_FUNCTION_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/top-birds
```

Set the hosted secret (never commit real keys):

```bash
supabase secrets set EBIRD_API_KEY='YOUR_EBIRD_API_KEY'
```

## Run locally (frontend)

```bash
npm install
npm run dev
```

## Deploy Edge Function (hosted Supabase)

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy top-birds --no-verify-jwt
```

## Smoke test the hosted function

```bash
curl -i "https://YOUR_PROJECT_REF.supabase.co/functions/v1/top-birds?city=Austin&state=TX"
```

Expected result:

1. 200 with JSON payload including location metadata and top bird list
2. 400 for invalid/missing input
3. 500 for upstream provider failures

## What this project demonstrates

1. Secure secret handling with server-side function boundaries
2. Multi-API data pipeline design and transformation
3. Resilient UI states for async network behavior
4. Deploy-first debugging workflow using hosted function logs

## Next iterations

1. Add lightweight response caching for repeated searches
2. Tree animation for engagement
3. Add automated tests for aggregation and fallback image logic
