import { createClient } from '@/lib/supabase/server'
import { computeStandings } from '@/lib/supabase/queries'
import { resolveSeasonAndAll } from '@/lib/supabase/season'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StandingsTable from '@/components/public/StandingsTable'
import SeasonSwitcher from '@/components/public/SeasonSwitcher'

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>
}) {
  const { s } = await searchParams
  const supabase = await createClient()
  const { season, allSeasons } = await resolveSeasonAndAll(supabase, s)

  if (!season) return <p className="text-muted-foreground">Nema sezona.</p>

  const standings = await computeStandings(supabase, season.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Ljestvica</h1>
        <SeasonSwitcher seasons={allSeasons} currentSeasonId={season.id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{season.name} — regularni dio</CardTitle>
        </CardHeader>
        <CardContent>
          <StandingsTable rows={standings} playoffCutoff={season.playoff_teams_count} />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Zelena crta = top {season.playoff_teams_count} ekipa prolaze u playoff · U=Utakmice P=Pobjede I=Izgubljene
      </p>
    </div>
  )
}
