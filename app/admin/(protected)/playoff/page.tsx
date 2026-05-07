import { createClient } from '@/lib/supabase/server'
import { getActiveSeason, computeStandings, getPlayoffSeries, getRounds, getMatches } from '@/lib/supabase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PlayoffManager from '@/components/admin/PlayoffManager'
import PlayoffBracket from '@/components/admin/PlayoffBracket'

export default async function AdminPlayoffPage() {
  const supabase = await createClient()
  const { data: season } = await getActiveSeason(supabase)

  if (!season) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Playoff</h1>
        <p className="text-muted-foreground">Nema aktivne sezone.</p>
      </div>
    )
  }

  const [standings, { data: seriesList }, { data: rounds }, { data: matches }] = await Promise.all([
    computeStandings(supabase, season.id),
    getPlayoffSeries(supabase, season.id),
    getRounds(supabase, season.id),
    getMatches(supabase, season.id),
  ])

  const playoffMatches = (matches ?? []).filter(m => m.is_playoff)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Playoff — {season.name}</h1>

      {seriesList && seriesList.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Bracket</CardTitle></CardHeader>
          <CardContent className="pt-8 pb-10">
            <PlayoffBracket seriesList={seriesList} matches={playoffMatches} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Upravljanje playoffom</CardTitle></CardHeader>
        <CardContent>
          <PlayoffManager
            season={season}
            standings={standings}
            seriesList={seriesList ?? []}
            rounds={rounds ?? []}
            matches={playoffMatches}
          />
        </CardContent>
      </Card>
    </div>
  )
}
