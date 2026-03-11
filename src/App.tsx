import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function App() {
  return (
    <main className="min-h-screen bg-background text-foreground p-8 max-w-2xl mx-auto space-y-10">

      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Component Preview</h1>
        <p className="text-muted-foreground text-sm">Tailwind + shadcn/ui — Nova theme</p>
      </div>

      {/* Buttons */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Inputs</h2>
        <div className="flex gap-3">
          <Input placeholder="City" className="flex-1" />
          <Input placeholder="ST" className="w-20 uppercase" maxLength={2} />
          <Button>Search</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>#1</Badge>
          <Badge variant="secondary">#2</Badge>
          <Badge variant="outline">#3</Badge>
          <Badge variant="destructive">Error</Badge>
        </div>
      </section>

      {/* Card */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Card</h2>
        <Card className="overflow-hidden w-56">
          <div className="h-36 bg-muted flex items-center justify-center text-muted-foreground text-sm">
            No bird photo
          </div>
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">American Robin</CardTitle>
              <Badge variant="secondary">#1</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">Turdus migratorius</p>
            <p className="text-sm text-muted-foreground mt-1">34 sightings</p>
          </CardContent>
        </Card>
      </section>

      {/* Skeletons */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Skeleton (loading state)</h2>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 w-40">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>

      {/* Typography & color tokens */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Typography / tokens</h2>
        <p className="text-foreground font-bold text-lg">Foreground bold</p>
        <p className="text-muted-foreground">Muted foreground</p>
        <p className="text-destructive">Destructive</p>
        <div className="flex gap-2 mt-2">
          <div className="w-8 h-8 rounded bg-primary" title="primary" />
          <div className="w-8 h-8 rounded bg-secondary border" title="secondary" />
          <div className="w-8 h-8 rounded bg-muted border" title="muted" />
          <div className="w-8 h-8 rounded bg-destructive" title="destructive" />
          <div className="w-8 h-8 rounded bg-card border" title="card" />
        </div>
      </section>

    </main>
  )
}

