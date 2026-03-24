export interface BirdResult {
  commonName: string
  scientificName: string | null
  speciesCode: string | null
  sightings: number
  imageUrl: string | null
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
