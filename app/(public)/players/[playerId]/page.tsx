import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PlayerMatchStatsComputed, PlayerTeamSeason, Season, Team } from '@/lib/supabase/types'

interface SeasonGroup {
  season: Season
  isPlayoff: boolean
  stats: PlayerMatchStatsComputed[]
}

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const supabase = await createClient()

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  if (!player) notFound()

  const { data: seasonRosters } = await supabase
    .from('player_team_seasons')
    .select('*, team:teams(*), season:seasons(*)')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })

  const { data: rawStats } = await supabase
    .from('player_match_stats_computed')
    .select('*, match:matches(*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), season:seasons(*), round:rounds(*))')
    .eq('player_id', playerId)

  const stats = (rawStats ?? []) as (PlayerMatchStatsComputed & {
    match?: { id: string; home_score: number; away_score: number; is_playoff: boolean; home_team?: Team; away_team?: Team; season?: Season; round?: { name: string } }
  })[]

  const statsByKey = stats.reduce<Record<string, SeasonGroup>>((acc, s) => {
    const season = s.match?.season as Season | undefined
    if (!season) return acc
    const key = `${season.id}-${s.match?.is_playoff ? 'playoff' : 'regular'}`
    if (!acc[key]) acc[key] = { season, isPlayoff: !!s.match?.is_playoff, stats: [] }
    acc[key].stats.push(s as unknown as PlayerMatchStatsComputed)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{player.first_name} {player.last_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {player.position && <Badge variant="outline">{player.position}</Badge>}
            {player.birth_year && <span className="text-muted-foreground text-sm">r. {player.birth_year}</span>}
          </div>
        </div>
      </div>

      {seasonRosters && seasonRosters.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Karijera</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(seasonRosters as (PlayerTeamSeason & { team: Team; season: Season })[]).map(s => (
                <div key={s.id} className="text-sm border rounded px-2 py-1">
                  <span className="font-medium">{s.season?.name}</span>
                  <span className="text-muted-foreground mx-1">—</span>
                  <Link href={`/teams/${s.team_id}`} className="hover:underline">{s.team?.name}</Link>
                  {s.jersey_number && <span className="text-muted-foreground ml-1">#{s.jersey_number}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(statsByKey).map(([key, { season, isPlayoff, stats: gameStats }]) => {
        const totals = gameStats.reduce((a, s) => ({
          games: a.games + 1,
          pts: a.pts + (s.points ?? 0),
          reb: a.reb + (s.total_rebounds ?? 0),
          ast: a.ast + s.assists,
          stl: a.stl + s.steals,
          blk: a.blk + s.blocks,
          tov: a.tov + s.turnovers,
          val: a.val + (s.val ?? 0),
          fgm: a.fgm + s.two_pt_made + s.three_pt_made,
          fga: a.fga + s.two_pt_attempted + s.three_pt_attempted,
          threem: a.threem + s.three_pt_made,
          threea: a.threea + s.three_pt_attempted,
          ftm: a.ftm + s.ft_made,
          fta: a.fta + s.ft_attempted,
        }), { games: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, val: 0, fgm: 0, fga: 0, threem: 0, threea: 0, ftm: 0, fta: 0 })

        const g = totals.games || 1
        const avg = (v: number) => (v / g).toFixed(1)
        const pct = (m: number, a: number) => a > 0 ? (m / a * 100).toFixed(1) + '%' : '-'

        const typedStats = gameStats as unknown as (PlayerMatchStatsComputed & {
          match?: { id: string; home_score: number; away_score: number; home_team?: Team; away_team?: Team; round?: { name: string } }
        })[]

        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {season?.name}
                <Badge variant={isPlayoff ? 'default' : 'secondary'}>
                  {isPlayoff ? 'Playoff' : 'Regularni'}
                </Badge>
                <span className="text-muted-foreground font-normal text-sm">({totals.games} ut.)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-4">
                {[
                  { label: 'Koš', value: avg(totals.pts) },
                  { label: 'Sk', value: avg(totals.reb) },
                  { label: 'As', value: avg(totals.ast) },
                  { label: 'UK', value: avg(totals.stl) },
                  { label: 'Bl', value: avg(totals.blk) },
                  { label: 'VAL', value: avg(totals.val) },
                  { label: 'FG%', value: pct(totals.fgm, totals.fga) },
                  { label: '3P%', value: pct(totals.threem, totals.threea) },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="text-xl font-bold">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              <Tabs defaultValue="games">
                <TabsList className="h-8">
                  <TabsTrigger value="games" className="text-xs">Po utakmicama</TabsTrigger>
                </TabsList>
                <TabsContent value="games">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kolo</TableHead>
                          <TableHead>Utakmica</TableHead>
                          <TableHead className="text-center">Min</TableHead>
                          <TableHead className="text-center">Koš</TableHead>
                          <TableHead className="text-center">2P</TableHead>
                          <TableHead className="text-center">3P</TableHead>
                          <TableHead className="text-center">SB</TableHead>
                          <TableHead className="text-center">Sk</TableHead>
                          <TableHead className="text-center">As</TableHead>
                          <TableHead className="text-center">UK</TableHead>
                          <TableHead className="text-center">Bl</TableHead>
                          <TableHead className="text-center">Gr</TableHead>
                          <TableHead className="text-center">+/-</TableHead>
                          <TableHead className="text-center">VAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typedStats.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm text-muted-foreground">{s.match?.round?.name}</TableCell>
                            <TableCell className="text-sm">
                              <Link href={`/matches/${s.match_id}`} className="hover:underline">
                                {s.match?.home_team?.short_name} {s.match?.home_score}-{s.match?.away_score} {s.match?.away_team?.short_name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-center">{s.minutes}</TableCell>
                            <TableCell className="text-center font-bold">{s.points}</TableCell>
                            <TableCell className="text-center text-xs">{s.two_pt_made}/{s.two_pt_attempted}</TableCell>
                            <TableCell className="text-center text-xs">{s.three_pt_made}/{s.three_pt_attempted}</TableCell>
                            <TableCell className="text-center text-xs">{s.ft_made}/{s.ft_attempted}</TableCell>
                            <TableCell className="text-center">{s.total_rebounds}</TableCell>
                            <TableCell className="text-center">{s.assists}</TableCell>
                            <TableCell className="text-center">{s.steals}</TableCell>
                            <TableCell className="text-center">{s.blocks}</TableCell>
                            <TableCell className="text-center">{s.fouls}</TableCell>
                            <TableCell className="text-center">{s.plus_minus > 0 ? `+${s.plus_minus}` : s.plus_minus}</TableCell>
                            <TableCell className="text-center font-medium text-primary">{s.val}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
