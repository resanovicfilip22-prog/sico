import { createClient } from '@/lib/supabase/server'
import { getRounds, getMatches } from '@/lib/supabase/queries'
import { resolveSeasonAndAll } from '@/lib/supabase/season'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SeasonSwitcher from '@/components/public/SeasonSwitcher'
import Link from 'next/link'
import { Match, Round } from '@/lib/supabase/types'

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>
}) {
  const { s } = await searchParams
  const supabase = await createClient()
  const { season, allSeasons } = await resolveSeasonAndAll(supabase, s)

  if (!season) return <p className="text-muted-foreground">Nema sezona.</p>

  const [{ data: rounds }, { data: matches }] = await Promise.all([
    getRounds(supabase, season.id),
    getMatches(supabase, season.id),
  ])

  const regularRounds = (rounds ?? []).filter((r: Round) => !r.is_playoff)
  const matchesByRound = (matches ?? []).reduce((acc: Record<string, Match[]>, m: Match) => {
    if (!acc[m.round_id]) acc[m.round_id] = []
    acc[m.round_id].push(m)
    return acc
  }, {})

  const finished = (matches ?? []).filter((m: Match) => m.status === 'finished').length
  const total = (matches ?? []).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Utakmice</h1>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">{finished}/{total} odigrano</p>
          )}
        </div>
        <SeasonSwitcher seasons={allSeasons} currentSeasonId={season.id} />
      </div>

      <div className="space-y-4">
        {regularRounds.map((round: Round) => {
          const roundMatches = matchesByRound[round.id] ?? []
          return (
            <Card key={round.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  {round.name}
                  <span className="text-xs text-muted-foreground font-normal">
                    {roundMatches.filter((m: Match) => m.status === 'finished').length}/{roundMatches.length} odigrano
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roundMatches.map((m: Match) => (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      className="flex items-center p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 text-right font-medium">{m.home_team?.name}</div>
                      <div className="mx-4 text-center min-w-[90px]">
                        {m.status === 'finished' ? (
                          <span className="font-bold text-lg">{m.home_score} – {m.away_score}</span>
                        ) : (
                          <Badge variant="outline">Zakazano</Badge>
                        )}
                      </div>
                      <div className="flex-1 font-medium">{m.away_team?.name}</div>
                    </Link>
                  ))}
                  {roundMatches.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nema utakmica u ovom kolu.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        {regularRounds.length === 0 && (
          <p className="text-muted-foreground">Nema kola za ovu sezonu.</p>
        )}
      </div>
    </div>
  )
}
