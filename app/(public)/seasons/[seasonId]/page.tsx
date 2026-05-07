import { createClient } from '@/lib/supabase/server'
import { computeStandings, computePlayerAverages, getMatches, getRounds } from '@/lib/supabase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import StandingsTable from '@/components/public/StandingsTable'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Match, Round } from '@/lib/supabase/types'

export default async function SeasonPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params
  const supabase = await createClient()

  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single()
  if (!season) notFound()

  const [standings, playerStats, { data: matches }, { data: rounds }] = await Promise.all([
    computeStandings(supabase, seasonId),
    computePlayerAverages(supabase, seasonId),
    getMatches(supabase, seasonId),
    getRounds(supabase, seasonId),
  ])

  const topScorers = [...(playerStats ?? [])].sort((a, b) => b.avg_points - a.avg_points).slice(0, 10)
  const topRebounders = [...(playerStats ?? [])].sort((a, b) => b.avg_rebounds - a.avg_rebounds).slice(0, 5)
  const topAssists = [...(playerStats ?? [])].sort((a, b) => b.avg_assists - a.avg_assists).slice(0, 5)
  const topVal = [...(playerStats ?? [])].sort((a, b) => b.avg_val - a.avg_val).slice(0, 5)

  const matchesByRound = (matches ?? []).reduce((acc: Record<string, Match[]>, m: Match) => {
    if (!acc[m.round_id]) acc[m.round_id] = []
    acc[m.round_id].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{season.name}</h1>
        {season.is_active && <Badge>Aktivna</Badge>}
        <span className="text-muted-foreground">{season.year_start}/{season.year_end}</span>
      </div>

      <Tabs defaultValue="standings">
        <TabsList>
          <TabsTrigger value="standings">Ljestvica</TabsTrigger>
          <TabsTrigger value="stats">Statistike</TabsTrigger>
          <TabsTrigger value="matches">Utakmice</TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          <Card>
            <CardHeader><CardTitle>Ljestvica — regularni dio</CardTitle></CardHeader>
            <CardContent>
              <StandingsTable rows={standings} playoffCutoff={season.playoff_teams_count} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Top strijelci (prosjek)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Igrač</TableHead>
                      <TableHead className="text-center">U</TableHead>
                      <TableHead className="text-center">Koš</TableHead>
                      <TableHead className="text-center">VAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topScorers.map((s, i) => (
                      <TableRow key={s.player_id}>
                        <TableCell>
                          <span className="text-muted-foreground mr-2">{i + 1}.</span>
                          <Link href={`/players/${s.player_id}`} className="hover:underline">
                            {s.player?.last_name} {s.player?.first_name}
                          </Link>
                          <span className="text-xs text-muted-foreground ml-1">{s.team?.short_name}</span>
                        </TableCell>
                        <TableCell className="text-center">{s.games}</TableCell>
                        <TableCell className="text-center font-bold">{s.avg_points}</TableCell>
                        <TableCell className="text-center text-primary">{s.avg_val}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {[
                { title: 'Top skakači', data: topRebounders, key: 'avg_rebounds' as const, label: 'Sk/ut' },
                { title: 'Top asistenti', data: topAssists, key: 'avg_assists' as const, label: 'As/ut' },
                { title: 'Top VAL', data: topVal, key: 'avg_val' as const, label: 'VAL' },
              ].map(({ title, data, key, label }) => (
                <Card key={title}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
                  <CardContent>
                    <ol className="space-y-1">
                      {data.map((s, i) => (
                        <li key={s.player_id} className="flex justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground mr-1">{i + 1}.</span>
                            <Link href={`/players/${s.player_id}`} className="hover:underline">
                              {s.player?.last_name} {s.player?.first_name}
                            </Link>
                          </div>
                          <span className="font-bold">{s[key]}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          {(rounds ?? []).filter((r: Round) => !r.is_playoff).map((round: Round) => (
            <Card key={round.id}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{round.name}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {(matchesByRound[round.id] ?? []).map((m: Match) => (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors text-sm"
                    >
                      <span className="flex-1 text-right">{m.home_team?.name}</span>
                      <span className="mx-4 font-bold">
                        {m.status === 'finished' ? `${m.home_score} – ${m.away_score}` : 'vs'}
                      </span>
                      <span className="flex-1">{m.away_team?.name}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
