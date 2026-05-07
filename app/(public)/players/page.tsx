import { createClient } from '@/lib/supabase/server'
import { computePlayerAverages } from '@/lib/supabase/queries'
import { resolveSeasonAndAll } from '@/lib/supabase/season'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SeasonSwitcher from '@/components/public/SeasonSwitcher'
import PlayerStatsTable from '@/components/public/PlayerStatsTable'

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>
}) {
  const { s } = await searchParams
  const supabase = await createClient()
  const { season, allSeasons } = await resolveSeasonAndAll(supabase, s)

  if (!season) return <p className="text-muted-foreground">Nema sezona.</p>

  const [regularStats, playoffStats] = await Promise.all([
    computePlayerAverages(supabase, season.id, false),
    computePlayerAverages(supabase, season.id, true),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Statistike igrača</h1>
        <SeasonSwitcher seasons={allSeasons} currentSeasonId={season.id} />
      </div>

      <Tabs defaultValue="regular">
        <TabsList>
          <TabsTrigger value="regular">Regularni dio ({regularStats.length})</TabsTrigger>
          <TabsTrigger value="playoff">Playoff ({playoffStats.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="regular">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{season.name} — regularni dio</CardTitle>
            </CardHeader>
            <CardContent>
              <PlayerStatsTable stats={regularStats} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="playoff">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{season.name} — playoff</CardTitle>
            </CardHeader>
            <CardContent>
              {playoffStats.length === 0
                ? <p className="text-sm text-muted-foreground">Nema playoff statistike za ovu sezonu.</p>
                : <PlayerStatsTable stats={playoffStats} />
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
