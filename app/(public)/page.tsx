import { createClient } from '@/lib/supabase/server'
import { computeStandings, computePlayerAverages, getMatches } from '@/lib/supabase/queries'
import { resolveSeasonAndAll } from '@/lib/supabase/season'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import StandingsTable from '@/components/public/StandingsTable'
import SeasonSwitcher from '@/components/public/SeasonSwitcher'
import Link from 'next/link'
import { Match } from '@/lib/supabase/types'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>
}) {
  const { s } = await searchParams
  const supabase = await createClient()
  const { season, allSeasons } = await resolveSeasonAndAll(supabase, s)

  if (!season || allSeasons.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-2">KL Šibenik</h1>
        <p className="text-muted-foreground">Još nema sezona u sustavu.</p>
      </div>
    )
  }

  const [standings, allMatches, topScorers] = await Promise.all([
    computeStandings(supabase, season.id),
    getMatches(supabase, season.id),
    computePlayerAverages(supabase, season.id),
  ])

  const matches = (allMatches.data ?? []) as Match[]
  const lastMatches = matches.filter(m => m.status === 'finished').slice(-5).reverse()
  const nextMatches = matches.filter(m => m.status === 'scheduled').slice(0, 5)
  const scorers = [...topScorers].sort((a, b) => b.avg_points - a.avg_points).slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">KL Šibenik</h1>
          <p className="text-muted-foreground">{season.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {season.is_active && <Badge variant="secondary">Aktivna sezona</Badge>}
          {allSeasons.length > 1 && (
            <SeasonSwitcher seasons={allSeasons} currentSeasonId={season.id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Ljestvica</CardTitle>
              <Link href={`/standings${s ? `?s=${s}` : ''}`} className="text-sm text-primary hover:underline">
                Cijela ljestvica →
              </Link>
            </CardHeader>
            <CardContent>
              <StandingsTable rows={standings} compact playoffCutoff={season.playoff_teams_count} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Top strijelci
                <Link href={`/players${s ? `?s=${s}` : ''}`} className="text-xs text-primary hover:underline font-normal">svi →</Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scorers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nema statistike.</p>
              ) : (
                <ol className="space-y-2">
                  {scorers.map((scorer, i) => (
                    <li key={scorer.player_id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-4 text-xs">{i + 1}.</span>
                        <Link href={`/players/${scorer.player_id}`} className="hover:underline font-medium">
                          {scorer.player?.last_name} {scorer.player?.first_name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{scorer.team?.short_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{scorer.avg_points}</span>
                        <span className="text-xs text-muted-foreground ml-1">ppg</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {lastMatches.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  Zadnji rezultati
                  <Link href={`/matches${s ? `?s=${s}` : ''}`} className="text-xs text-primary hover:underline font-normal">svi →</Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {lastMatches.map(m => (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      className="flex items-center justify-between text-sm py-1.5 hover:bg-accent rounded px-1 transition-colors"
                    >
                      <span className="flex-1 text-right truncate text-xs">{m.home_team?.name}</span>
                      <span className="font-bold mx-3 tabular-nums">{m.home_score}–{m.away_score}</span>
                      <span className="flex-1 truncate text-xs">{m.away_team?.name}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {nextMatches.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Nadolazeće utakmice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {nextMatches.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-sm py-1">
                      <span className="flex-1 text-right truncate text-xs">{m.home_team?.name}</span>
                      <span className="text-muted-foreground mx-3 text-xs">vs</span>
                      <span className="flex-1 truncate text-xs">{m.away_team?.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
