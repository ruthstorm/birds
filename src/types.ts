export interface BirdImage {
  url: string
  artist: string | null
  licenseShortName: string
  licenseUrl: string | null
  sourcePageUrl: string
}

export interface BirdResult {
  commonName: string
  scientificName: string | null
  speciesCode: string | null
  sightings: number
  image: BirdImage | null
}

export interface TopBirdsResponse {
  location: {
    city: string
    state: string
    displayName: string
    lat: number
    lng: number
  }
  searchWindow: {
    days: number
    radiusKm: number
    maxResults: number
  }
  totalObservations: number
  birds: BirdResult[]
}
