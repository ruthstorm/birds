import { useState } from "react"
import { fetchTopBirds } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { TopBirdsResponse } from "@/types"

export default function App() {
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TopBirdsResponse | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const data = await fetchTopBirds(city.trim(), state.trim().toUpperCase())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 max-w-6xl mx-auto">
      <div className="max-w-2xl space-y-2 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Birds Near You</h1>
        <p className="text-muted-foreground">
          Enter a city and state or province in North America to find the 5 most common birds from recent nearby eBird observations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-3 items-end mb-8 max-w-2xl">
        <div className="space-y-1">
          <label className="text-sm font-medium">City</label>
          <Input
            placeholder="Austin"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">State</label>
          <Input
            placeholder="TX"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            maxLength={2}
            required
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </form>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <Skeleton className="h-44 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {result && !loading && (
        <section className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing top 5 birds from {result.totalObservations} observations near {result.location.city}, {" "}
            {result.location.state} within {result.searchWindow.radiusKm} km over the last {result.searchWindow.days} days.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {result.birds.map((bird, index) => (
              <Card key={bird.speciesCode ?? bird.commonName} className="overflow-hidden h-full">
                {bird.imageUrl ? (
                  <img
                    src={bird.imageUrl}
                    alt={bird.commonName}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-44 w-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    No bird photo
                  </div>
                )}

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{bird.commonName}</CardTitle>
                    <Badge variant="secondary">#{index + 1}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-1">
                  {bird.scientificName && (
                    <p className="text-xs italic text-muted-foreground">{bird.scientificName}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

