import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const EBIRD_API_KEY = Deno.env.get("EBIRD_API_KEY") ?? ""

if (!EBIRD_API_KEY) {
  throw new Error("Missing EBIRD_API_KEY secret")
}

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "https://ruthstorm.github.io",
]

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  // Vite may pick another free port when 5173 is busy.
  try {
    const { protocol, hostname } = new URL(origin)
    return (
      (protocol === "http:" || protocol === "https:") &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    )
  } catch {
    return false
  }
}

const DEFAULT_DAYS = 30
const DEFAULT_RADIUS_KM = 25
const DEFAULT_MAX_RESULTS = 500

// Open-Meteo returns admin1 as a full name. The form submits a 2-letter code.
const REGIONS: Record<string, { countryCode: string; admin1: string }> = {
  AL: { countryCode: "US", admin1: "Alabama" },
  AK: { countryCode: "US", admin1: "Alaska" },
  AZ: { countryCode: "US", admin1: "Arizona" },
  AR: { countryCode: "US", admin1: "Arkansas" },
  CA: { countryCode: "US", admin1: "California" },
  CO: { countryCode: "US", admin1: "Colorado" },
  CT: { countryCode: "US", admin1: "Connecticut" },
  DE: { countryCode: "US", admin1: "Delaware" },
  DC: { countryCode: "US", admin1: "District of Columbia" },
  FL: { countryCode: "US", admin1: "Florida" },
  GA: { countryCode: "US", admin1: "Georgia" },
  HI: { countryCode: "US", admin1: "Hawaii" },
  ID: { countryCode: "US", admin1: "Idaho" },
  IL: { countryCode: "US", admin1: "Illinois" },
  IN: { countryCode: "US", admin1: "Indiana" },
  IA: { countryCode: "US", admin1: "Iowa" },
  KS: { countryCode: "US", admin1: "Kansas" },
  KY: { countryCode: "US", admin1: "Kentucky" },
  LA: { countryCode: "US", admin1: "Louisiana" },
  ME: { countryCode: "US", admin1: "Maine" },
  MD: { countryCode: "US", admin1: "Maryland" },
  MA: { countryCode: "US", admin1: "Massachusetts" },
  MI: { countryCode: "US", admin1: "Michigan" },
  MN: { countryCode: "US", admin1: "Minnesota" },
  MS: { countryCode: "US", admin1: "Mississippi" },
  MO: { countryCode: "US", admin1: "Missouri" },
  MT: { countryCode: "US", admin1: "Montana" },
  NE: { countryCode: "US", admin1: "Nebraska" },
  NV: { countryCode: "US", admin1: "Nevada" },
  NH: { countryCode: "US", admin1: "New Hampshire" },
  NJ: { countryCode: "US", admin1: "New Jersey" },
  NM: { countryCode: "US", admin1: "New Mexico" },
  NY: { countryCode: "US", admin1: "New York" },
  NC: { countryCode: "US", admin1: "North Carolina" },
  ND: { countryCode: "US", admin1: "North Dakota" },
  OH: { countryCode: "US", admin1: "Ohio" },
  OK: { countryCode: "US", admin1: "Oklahoma" },
  OR: { countryCode: "US", admin1: "Oregon" },
  PA: { countryCode: "US", admin1: "Pennsylvania" },
  RI: { countryCode: "US", admin1: "Rhode Island" },
  SC: { countryCode: "US", admin1: "South Carolina" },
  SD: { countryCode: "US", admin1: "South Dakota" },
  TN: { countryCode: "US", admin1: "Tennessee" },
  TX: { countryCode: "US", admin1: "Texas" },
  UT: { countryCode: "US", admin1: "Utah" },
  VT: { countryCode: "US", admin1: "Vermont" },
  VA: { countryCode: "US", admin1: "Virginia" },
  WA: { countryCode: "US", admin1: "Washington" },
  WV: { countryCode: "US", admin1: "West Virginia" },
  WI: { countryCode: "US", admin1: "Wisconsin" },
  WY: { countryCode: "US", admin1: "Wyoming" },
  AB: { countryCode: "CA", admin1: "Alberta" },
  BC: { countryCode: "CA", admin1: "British Columbia" },
  MB: { countryCode: "CA", admin1: "Manitoba" },
  NB: { countryCode: "CA", admin1: "New Brunswick" },
  NL: { countryCode: "CA", admin1: "Newfoundland and Labrador" },
  NS: { countryCode: "CA", admin1: "Nova Scotia" },
  NT: { countryCode: "CA", admin1: "Northwest Territories" },
  NU: { countryCode: "CA", admin1: "Nunavut" },
  ON: { countryCode: "CA", admin1: "Ontario" },
  PE: { countryCode: "CA", admin1: "Prince Edward Island" },
  QC: { countryCode: "CA", admin1: "Quebec" },
  SK: { countryCode: "CA", admin1: "Saskatchewan" },
  YT: { countryCode: "CA", admin1: "Yukon" },
}

interface OpenMeteoPlace {
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country?: string
  country_code?: string
  population?: number
}

interface BirdImage {
  url: string
  artist: string | null
  licenseShortName: string
  licenseUrl: string | null
  sourcePageUrl: string
}

interface Bird {
  commonName: string
  scientificName: string | null
  speciesCode: string | null
  sightings: number
  image: BirdImage | null
}

// Only images licensed under one of these (matched case-insensitively, by
// substring) are shown. Anything else (fair-use uploads, unclear rights,
// non-commercial-only licenses, etc.) is skipped rather than displayed.
const ALLOWED_LICENSE_SUBSTRINGS = [
  "cc0",
  "cc-by",
  "cc by",
  "public domain",
  "gfdl",
]

function isAllowedLicense(licenseShortName: string): boolean {
  const normalized = licenseShortName.toLowerCase()
  return ALLOWED_LICENSE_SUBSTRINGS.some((allowed) => normalized.includes(allowed))
}

function stripHtml(value: string | undefined | null): string | null {
  if (!value) return null
  const text = value.replace(/<[^>]*>/g, "").trim()
  return text.length ? text : null
}

// Wikipedia article thumbnails can come from Wikimedia Commons (freely
// licensed) or from a local, non-free "fair use" upload scoped to that
// wiki. Only Commons-hosted files have verifiable open licenses, so we
// extract the underlying Commons file name and reject anything else.
function extractCommonsFileName(imageUrl: string): string | null {
  try {
    const { pathname } = new URL(imageUrl)
    const segments = pathname.split("/").filter(Boolean)
    const commonsIndex = segments.indexOf("commons")
    if (commonsIndex === -1) return null

    const afterCommons = segments.slice(commonsIndex + 1)
    // Thumbnail path: commons/thumb/<a>/<ab>/<Filename>/<size>-<Filename>
    // Original path:  commons/<a>/<ab>/<Filename>
    const isThumb = afterCommons[0] === "thumb"
    const fileNameIndex = isThumb ? 3 : 2
    const fileName = afterCommons[fileNameIndex]
    return fileName ? decodeURIComponent(fileName) : null
  } catch {
    return null
  }
}

function corsHeaders(origin: string | null) {
  const allowed = isAllowedOrigin(origin) ? origin : null
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  }
}

async function geocode(city: string, state: string): Promise<{ lat: number; lng: number; displayName: string }> {
  const region = REGIONS[state]
  if (!region) throw new Error(`Location not found: ${city}, ${state}`)

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
  url.searchParams.set("name", city)
  url.searchParams.set("count", "100")
  url.searchParams.set("language", "en")
  url.searchParams.set("format", "json")

  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "BirdsNearYou/1.0 (https://ruthstorm.github.io/birds/)",
    },
  })
  if (!res.ok) throw new Error(`Geocoding request failed: ${res.status}`)

  const data = await res.json()
  const matches = ((data?.results ?? []) as OpenMeteoPlace[])
    .filter(
      (place) =>
        place.country_code === region.countryCode &&
        place.admin1?.toLowerCase() === region.admin1.toLowerCase(),
    )
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))

  const place = matches[0]
  if (!place) throw new Error(`Location not found: ${city}, ${state}`)

  return {
    lat: place.latitude,
    lng: place.longitude,
    displayName: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
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
        image: null,
      })
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.sightings - a.sightings)
    .slice(0, 10)
}

async function fetchWikipediaThumbnailUrl(title: string): Promise<string | null> {
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
    return data?.originalimage?.source ?? data?.thumbnail?.source ?? null
  } catch {
    return null
  }
}

// Looks up the verified license/attribution metadata for a Commons file.
// Returns null if the file can't be found or isn't under an allowed
// open license, so the caller can fall back to "no image" rather than
// display something with unclear reuse rights.
async function fetchCommonsImageAttribution(fileName: string): Promise<BirdImage | null> {
  const url = new URL("https://commons.wikimedia.org/w/api.php")
  url.searchParams.set("action", "query")
  url.searchParams.set("titles", `File:${fileName}`)
  url.searchParams.set("prop", "imageinfo")
  url.searchParams.set("iiprop", "url|extmetadata")
  url.searchParams.set("format", "json")
  url.searchParams.set("origin", "*")

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "birds-portfolio/1.0",
      },
    })
    if (!res.ok) return null

    const data = await res.json()
    const pages = data?.query?.pages ?? {}
    const page = Object.values(pages)[0] as any
    const info = page?.imageinfo?.[0]
    if (!info) return null

    const meta = info.extmetadata ?? {}
    const licenseShortName: string | undefined = meta.LicenseShortName?.value
    if (!licenseShortName || !isAllowedLicense(licenseShortName)) return null

    return {
      url: info.url,
      artist: stripHtml(meta.Artist?.value) ?? stripHtml(meta.Credit?.value),
      licenseShortName,
      licenseUrl: meta.LicenseUrl?.value ?? null,
      sourcePageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${fileName}`,
    }
  } catch {
    return null
  }
}

// Finds a Wikipedia article's lead image, then verifies (and attributes)
// it against Wikimedia Commons. Non-Commons images (e.g. local fair-use
// uploads) and images without an allowed open license are skipped.
async function fetchBirdImage(title: string): Promise<BirdImage | null> {
  const thumbnailUrl = await fetchWikipediaThumbnailUrl(title)
  if (!thumbnailUrl) return null

  const fileName = extractCommonsFileName(thumbnailUrl)
  if (!fileName) return null

  return fetchCommonsImageAttribution(fileName)
}

async function addBirdImages(birds: Bird[]): Promise<Bird[]> {
  return Promise.all(
    birds.map(async (bird) => {
      let image = bird.scientificName ? await fetchBirdImage(bird.scientificName) : null
      if (!image) image = await fetchBirdImage(bird.commonName)
      return { ...bird, image }
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