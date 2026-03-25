import type { TopBirdsResponse } from "./types"

const FUNCTION_URL = import.meta.env.VITE_TOP_BIRDS_FUNCTION_URL as string

export async function fetchTopBirds(city: string, state: string): Promise<TopBirdsResponse> {
  if (!FUNCTION_URL) {
    throw new Error("Missing VITE_TOP_BIRDS_FUNCTION_URL")
  }

  const url = new URL(FUNCTION_URL)
  url.searchParams.set("city", city)
  url.searchParams.set("state", state)

  const res = await fetch(url.toString())
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to fetch birds")
  }

  return data as TopBirdsResponse
}
