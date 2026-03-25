import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const EBIRD_API_KEY = Deno.env.get("EBIRD_API_KEY") ?? ""

if (!EBIRD_API_KEY) {
  throw new Error("Missing EBIRD_API_KEY secret")
}

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://ruthstorm.github.io",
]

const DEFAULT_DAYS = 30
const DEFAULT_RADIUS_KM = 25
const DEFAULT_MAX_RESULTS = 500

const DEPLOY_MARKER = "top-birds-debug-2026-03-24-r1"

interface Bird {
  commonName: string
  scientificName: string | null
  speciesCode: string | null
  sightings: number
  imageUrl: string | null
}

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  }
}

async function geocode(city: string, state: string): Promise<{ lat: number; lng: number; displayName: string }> {
  const query = encodeURIComponent(`${city}, ${state}, USA`)
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
  const res = await fetch(url, {
    headers: { "User-Agent": "birds-portfolio/1.0" },
  })
  if (!res.ok) throw new Error("Geocoding request failed")
  const data = await res.json()
  if (!data.length) throw new Error(`Location not found: ${city}, ${state}`)
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  }
}

async function fetchRecentObservations(lat: number, lng: number, days: number, radiusKm: number, maxResults: number) {
  const url = new URL("https://api.ebird.org/v2/data/obs/geo/recent")
  url.searchParams.set("lat", String(lat))
  url.searchParams.set("lng", String(lng))
  url.searchParams.set("back", String(days))
  url.searchParams.set("dist", String(radiusKm))
  url.searchParams.set("maxResults", String(maxResults))

  const res = await fetch(url.toString(), {
    headers: {
      "X-eBirdApiToken": EBIRD_API_KEY,
      "Accept": "application/json",
      "User-Agent": "birds-portfolio/1.0",
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`eBird API error: ${res.status} ${body}`)
  }
  return res.json()
}

function topBirdsFromObservations(observations: Array<{ comName: string; sciName: string; speciesCode: string }>): Bird[] {
  const counts = new Map<string, Bird>()
  for (const obs of observations) {
    const key = obs.speciesCode ?? obs.comName
    if (counts.has(key)) {
      counts.get(key)!.sightings++
    } else {
      counts.set(key, {
        commonName: obs.comName,
        scientificName: obs.sciName ?? null,
        speciesCode: obs.speciesCode ?? null,
        sightings: 1,
        imageUrl: null,
      })
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.sightings - a.sightings)
    .slice(0, 5)
}

async function fetchWikipediaImage(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "birds-portfolio/1.0",
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.thumbnail?.source ?? data?.originalimage?.source ?? null
  } catch {
    return null
  }
}

async function addBirdImages(birds: Bird[]): Promise<Bird[]> {
  return Promise.all(
    birds.map(async (bird) => {
      let imageUrl = bird.scientificName ? await fetchWikipediaImage(bird.scientificName) : null
      if (!imageUrl) imageUrl = await fetchWikipediaImage(bird.commonName)
      return { ...bird, imageUrl }
    })
  )
}

Deno.serve(async (req: { headers: { get: (arg0: string) => any }; method: string; url: string | URL }) => {
  const origin = req.headers.get("origin")
  const headers = corsHeaders(origin)

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers })
  }

  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get("city")?.trim()
    const state = searchParams.get("state")?.trim().toUpperCase()

    if (!city || !state) {
      return new Response(JSON.stringify({ error: "city and state are required" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      })
    }
    if (!/^[A-Z]{2}$/.test(state)) {
      return new Response(JSON.stringify({ error: "state must be a 2-letter code" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      })
    }

    const days = Math.min(30, Math.max(1, parseInt(searchParams.get("days") ?? "") || DEFAULT_DAYS))
    const radiusKm = Math.min(50, Math.max(1, parseInt(searchParams.get("radiusKm") ?? "") || DEFAULT_RADIUS_KM))
    const maxResults = Math.min(10000, Math.max(1, parseInt(searchParams.get("maxResults") ?? "") || DEFAULT_MAX_RESULTS))

    const location = await geocode(city, state)
    const observations = await fetchRecentObservations(location.lat, location.lng, days, radiusKm, maxResults)
    const topBirds = topBirdsFromObservations(observations)
    const birdsWithImages = await addBirdImages(topBirds)

    const body = JSON.stringify({
      location: { city, state, displayName: location.displayName, lat: location.lat, lng: location.lng },
      searchWindow: { days, radiusKm, maxResults },
      totalObservations: observations.length,
      birds: birdsWithImages,
    })

    return new Response(body, {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    })
  }
})