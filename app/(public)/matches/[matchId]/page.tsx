import { createClient } from '@/lib/supabase/server'
import { getMatchWithStats } from '@/lib/supabase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PlayerMatchStatsComputed } from '@/lib/supabase/types'

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const supabase = await createClient()
  const { match: { data: match }, stats: { data: stats } } = await getMatchWithStats(supabase, matchId)

  if (!match) notFound()

  // Fetch jersey numbers for all players in this match's season
  const { data: jerseyData } = await supabase
    .from('player_team_seasons')
    .select('player_id, jersey_number')
    .eq('season_id', match.season_id)

  const jerseyMap = new Map((jerseyData ?? []).map(j => [j.player_id, j.jersey_number]))

  const homeStats = (stats ?? []).filter((s: PlayerMatchStatsComputed) => s.team_id === match.home_team_id)
  const awayStats = (stats ?? []).filter((s: PlayerMatchStatsComputed) => s.team_id === match.away_team_id)

  const homeTotalPts = homeStats.reduce((sum, s) => sum + (s.points ?? 0), 0)
  const awayTotalPts = awayStats.reduce((sum, s) => sum + (s.points ?? 0), 0)
  const statsMatchScore =
    match.status === 'finished' &&
    match.home_score != null &&
    match.away_score != null &&
    homeStats.length > 0 &&
    awayStats.length > 0 &&
    homeTotalPts === match.home_score &&
    awayTotalPts === match.away_score

  const TeamStats = ({ teamStats, teamName }: { teamStats: PlayerMatchStatsComputed[]; teamName: string }) => {
    const totals = teamStats.reduce((a, s) => ({
      pts: a.pts + (s.points ?? 0),
      reb: a.reb + (s.total_rebounds ?? 0),
      ast: a.ast + s.assists,
      stl: a.stl + s.steals,
      blk: a.blk + s.blocks,
      tov: a.tov + s.turnovers,
      fgm: a.fgm + s.two_pt_made + s.three_pt_made,
      fga: a.fga + s.two_pt_attempted + s.three_pt_attempted,
      threem: a.threem + s.three_pt_made,
      threea: a.threea + s.three_pt_attempted,
      ftm: a.ftm + s.ft_made,
      fta: a.fta + s.ft_attempted,
      val: a.val + (s.val ?? 0),
    }), { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, threem: 0, threea: 0, ftm: 0, fta: 0, val: 0 })

    const pct = (m: number, a: number) => a > 0 ? (m / a * 100).toFixed(1) + '%' : '-'

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{teamName}</CardTitle>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
            <span>FG: {pct(totals.fgm, totals.fga)}</span>
            <span>3P: {pct(totals.threem, totals.threea)}</span>
            <span>SB: {pct(totals.ftm, totals.fta)}</span>
            <span>Sk: {totals.reb}</span>
            <span>As: {totals.ast}</span>
            <span>UK: {totals.stl}</span>
            <span>Bl: {totals.blk}</span>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead className="min-w-[130px]">Igrač</TableHead>
                <TableHead className="text-center">Min</TableHead>
                <TableHead className="text-center">Koš</TableHead>
                <TableHead className="text-center">2P</TableHead>
                <TableHead className="text-center">3P</TableHead>
                <TableHead className="text-center">SB</TableHead>
                <TableHead className="text-center">Sk</TableHead>
                <TableHead className="text-center">As</TableHead>
                <TableHead className="text-center">UK</TableHead>
                <TableHead className="text-center">Bl</TableHead>
                <TableHead className="text-center">Izg</TableHead>
                <TableHead className="text-center">Gr</TableHead>
                <TableHead className="text-center">+/-</TableHead>
                <TableHead className="text-center">VAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamStats
                .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
                .map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {jerseyMap.get(s.player_id) != null ? `${jerseyMap.get(s.player_id)}` : ''}
                    </TableCell>
                    <TableCell>
                      <Link href={`/players/${s.player_id}`} className="hover:underline font-medium">
                        {s.player?.last_name} {s.player?.first_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">{s.minutes}</TableCell>
                    <TableCell className="text-center font-bold">{s.points}</TableCell>
                    <TableCell className="text-center text-xs">{s.two_pt_made}/{s.two_pt_attempted}</TableCell>
                    <TableCell className="text-center text-xs">{s.three_pt_made}/{s.three_pt_attempted}</TableCell>
                    <TableCell className="text-center text-xs">{s.ft_made}/{s.ft_attempted}</TableCell>
                    <TableCell className="text-center">{s.off_rebounds + s.def_rebounds}</TableCell>
                    <TableCell className="text-center">{s.assists}</TableCell>
                    <TableCell className="text-center">{s.steals}</TableCell>
                    <TableCell className="text-center">{s.blocks}</TableCell>
                    <TableCell className="text-center">{s.turnovers}</TableCell>
                    <TableCell className="text-center">{s.fouls}</TableCell>
                    <TableCell className="text-center">{s.plus_minus > 0 ? `+${s.plus_minus}` : s.plus_minus}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{s.val}</TableCell>
                  </TableRow>
                ))}
              <TableRow className="bg-muted/30 font-bold text-sm">
                <TableCell></TableCell>
                <TableCell>EKIPA UKUPNO</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-center">{totals.pts}</TableCell>
                <TableCell className="text-center text-xs">{totals.fgm - totals.threem}/{totals.fga - totals.threea}</TableCell>
                <TableCell className="text-center text-xs">{totals.threem}/{totals.threea}</TableCell>
                <TableCell className="text-center text-xs">{totals.ftm}/{totals.fta}</TableCell>
                <TableCell className="text-center">{totals.reb}</TableCell>
                <TableCell className="text-center">{totals.ast}</TableCell>
                <TableCell className="text-center">{totals.stl}</TableCell>
                <TableCell className="text-center">{totals.blk}</TableCell>
                <TableCell className="text-center">{totals.tov}</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-center text-primary">{totals.val}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          {match.round?.name}
          {match.is_playoff && <Badge className="ml-2">Playoff</Badge>}
          {match.match_date && (
            <span className="ml-2">
              {new Date(match.match_date).toLocaleDateString('hr-HR', { dateStyle: 'long' })}
            </span>
          )}
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <Link href={`/teams/${match.home_team_id}`} className="text-2xl font-bold hover:underline">
            {match.home_team?.name}
          </Link>
          {match.status === 'finished' ? (
            <span className="text-4xl font-bold tabular-nums">{match.home_score} – {match.away_score}</span>
          ) : (
            <Badge variant="outline" className="text-lg px-3 py-1">Zakazano</Badge>
          )}
          <Link href={`/teams/${match.away_team_id}`} className="text-2xl font-bold hover:underline">
            {match.away_team?.name}
          </Link>
        </div>
      </div>

      {statsMatchScore ? (
        <div className="space-y-4">
          <TeamStats teamStats={homeStats} teamName={match.home_team?.name ?? 'Domaćin'} />
          <TeamStats teamStats={awayStats} teamName={match.away_team?.name ?? 'Gost'} />
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {match.status !== 'finished'
              ? 'Utakmica još nije odigrana.'
              : stats && stats.length > 0
                ? 'Statistike se obrađuju — bit će dostupne nakon provjere.'
                : 'Statistika za ovu utakmicu još nije unesena.'}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
