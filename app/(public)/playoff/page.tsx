import { createClient } from '@/lib/supabase/server'
import { getPlayoffSeries, getMatches } from '@/lib/supabase/queries'
import { resolveSeasonAndAll } from '@/lib/supabase/season'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SeasonSwitcher from '@/components/public/SeasonSwitcher'
import Link from 'next/link'
import { PlayoffSeries, Match } from '@/lib/supabase/types'

function getRoundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return 'Finale'
  if (fromEnd === 1) return 'Poluzavršnica'
  if (fromEnd === 2) return 'Četvrtzavršnica'
  return `Runda ${round}`
}

export default async function PlayoffPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>
}) {
  const { s } = await searchParams
  const supabase = await createClient()
  const { season, allSeasons } = await resolveSeasonAndAll(supabase, s)

  if (!season) return <p className="text-muted-foreground">Nema sezona.</p>

  const [{ data: seriesList }, { data: matches }] = await Promise.all([
    getPlayoffSeries(supabase, season.id),
    getMatches(supabase, season.id),
  ])

  const playoffMatches = (matches ?? []).filter((m: Match) => m.is_playoff)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Playoff</h1>
        <SeasonSwitcher seasons={allSeasons} currentSeasonId={season.id} />
      </div>

      {!seriesList || seriesList.length === 0 ? (
        <p className="text-muted-foreground">Playoff još nije počeo za ovu sezonu.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {(() => {
            const totalPlayoffRounds = Math.max(...seriesList.map((s: PlayoffSeries) => s.round))
            return [...new Set(seriesList.map((s: PlayoffSeries) => s.round))].sort().map(round => (
            <div key={round} className="space-y-3">
              <h2 className="font-bold text-lg border-b pb-1 text-center">
                {getRoundName(round, totalPlayoffRounds)}
              </h2>
              {seriesList
                .filter((s: PlayoffSeries) => s.round === round)
                .map((series: PlayoffSeries) => {
                  const seriesMatches = playoffMatches.filter((m: Match) => m.playoff_series_id === series.id)
                  const isOver = !!series.winner_id

                  return (
                    <Card key={series.id} className={isOver ? 'border-primary/50' : ''}>
                      <CardContent className="pt-4 space-y-2">
                        {series.team1_id && series.team2_id ? (
                          <>
                            <div className={`flex justify-between items-center px-3 py-2 rounded-md ${series.winner_id === series.team1_id ? 'bg-green-50 dark:bg-green-950 font-bold' : ''}`}>
                              <Link href={`/teams/${series.team1_id}`} className="hover:underline">
                                {series.team1?.name}
                              </Link>
                              <span className="text-2xl font-bold ml-2">{series.team1_wins}</span>
                            </div>
                            <div className={`flex justify-between items-center px-3 py-2 rounded-md ${series.winner_id === series.team2_id ? 'bg-green-50 dark:bg-green-950 font-bold' : ''}`}>
                              <Link href={`/teams/${series.team2_id}`} className="hover:underline">
                                {series.team2?.name}
                              </Link>
                              <span className="text-2xl font-bold ml-2">{series.team2_wins}</span>
                            </div>
                            {isOver && (
                              <div className="text-center text-xs text-green-600 font-medium pt-1">
                                Pobjednik serije: {series.winner?.name}
                              </div>
                            )}
                            {seriesMatches.length > 0 && (
                              <div className="border-t pt-2 space-y-1 mt-2">
                                {seriesMatches
                                  .sort((a: Match, b: Match) => (a.playoff_game_number ?? 0) - (b.playoff_game_number ?? 0))
                                  .map((m: Match) => (
                                    <Link
                                      key={m.id}
                                      href={`/matches/${m.id}`}
                                      className="flex justify-between text-xs text-muted-foreground hover:text-foreground px-1"
                                    >
                                      <span>Igra {m.playoff_game_number}</span>
                                      {m.status === 'finished' ? (
                                        <span className="font-medium">
                                          {m.home_team?.short_name} {m.home_score}–{m.away_score} {m.away_team?.short_name}
                                        </span>
                                      ) : (
                                        <Badge variant="outline" className="text-xs h-4">TBD</Badge>
                                      )}
                                    </Link>
                                  ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-3">TBD</p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}
