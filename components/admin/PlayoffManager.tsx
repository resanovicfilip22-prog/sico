'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Season, StandingsRow, PlayoffSeries, Round, Match } from '@/lib/supabase/types'
import Link from 'next/link'

interface Props {
  season: Season
  standings: StandingsRow[]
  seriesList: PlayoffSeries[]
  rounds: Round[]
  matches: Match[]
}

function getRoundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return 'Finale'
  if (fromEnd === 1) return 'Poluzavršnica'
  if (fromEnd === 2) return 'Četvrtzavršnica'
  return `Runda ${round}`
}

function calcBracketRounds(n: number): number[] {
  const rounds = []
  let teams = n
  let round = 1
  while (teams > 1) {
    rounds.push(round++)
    teams = Math.ceil(teams / 2)
  }
  return rounds
}

export default function PlayoffManager({ season, standings, seriesList, rounds, matches }: Props) {
  const [loading, setLoading] = useState(false)
  const [playoffTeams, setPlayoffTeams] = useState(season.playoff_teams_count)
  const [addMatchForm, setAddMatchForm] = useState<{ seriesId: string; gameNumber: string; date: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const hasPlayoff = seriesList.length > 0
  const bracketRounds = calcBracketRounds(playoffTeams)
  const totalPlayoffRounds = hasPlayoff ? Math.max(...seriesList.map(s => s.round)) : bracketRounds.length

  const generateBracket = async () => {
    if (!confirm(`Generiraj playoff bracket za top ${playoffTeams} ekipa? Postojeći bracket će biti obrisan.`)) return
    setLoading(true)

    await supabase.from('playoff_series').delete().eq('season_id', season.id)
    await supabase.from('rounds').delete().eq('season_id', season.id).eq('is_playoff', true)

    const topTeams = standings.slice(0, playoffTeams)
    const seriesInserts = []

    let round = 1
    let teamsInRound = playoffTeams

    while (teamsInRound > 1) {
      const pairs = Math.floor(teamsInRound / 2)
      for (let pos = 0; pos < pairs; pos++) {
        if (round === 1) {
          const team1 = topTeams[pos]
          const team2 = topTeams[teamsInRound - 1 - pos]
          seriesInserts.push({
            season_id: season.id,
            round,
            position: pos,
            team1_id: team1?.team_id ?? null,
            team2_id: team2?.team_id ?? null,
          })
        } else {
          seriesInserts.push({ season_id: season.id, round, position: pos })
        }
      }
      round++
      teamsInRound = pairs
    }

    const maxRoundNumber = rounds.filter(r => !r.is_playoff).length
    const roundInserts = bracketRounds.map((r, i) => ({
      season_id: season.id,
      round_number: maxRoundNumber + i + 1,
      name: getRoundName(r, bracketRounds.length),
      is_playoff: true,
      playoff_round: r,
    }))

    await supabase.from('rounds').insert(roundInserts)
    await supabase.from('playoff_series').insert(seriesInserts)

    setLoading(false)
    router.refresh()
  }

  const addMatchToSeries = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addMatchForm) return
    setLoading(true)

    const series = seriesList.find(s => s.id === addMatchForm.seriesId)
    if (!series) { setLoading(false); return }

    const playoffRound = rounds.find(r => r.is_playoff && r.playoff_round === series.round)
    if (!playoffRound) { setLoading(false); return }

    const gameNumber = +addMatchForm.gameNumber
    await supabase.from('matches').insert({
      season_id: season.id,
      round_id: playoffRound.id,
      home_team_id: series.team1_id,
      away_team_id: series.team2_id,
      match_date: addMatchForm.date || null,
      status: 'scheduled',
      is_playoff: true,
      playoff_series_id: series.id,
      playoff_game_number: gameNumber,
    })

    setAddMatchForm(null)
    setLoading(false)
    router.refresh()
  }

  const recordSeriesResult = async (seriesId: string, matchId: string, homeScore: number, awayScore: number) => {
    setLoading(true)
    const series = seriesList.find(s => s.id === seriesId)
    if (!series) { setLoading(false); return }

    await supabase.from('matches').update({ home_score: homeScore, away_score: awayScore, status: 'finished' }).eq('id', matchId)

    const seriesMatches = matches.filter(m => m.playoff_series_id === seriesId && m.status === 'finished')
    let t1wins = series.team1_wins
    let t2wins = series.team2_wins

    if (homeScore > awayScore) {
      t1wins++
    } else {
      t2wins++
    }

    const needed = 2
    let winnerId = null
    if (t1wins >= needed) winnerId = series.team1_id
    if (t2wins >= needed) winnerId = series.team2_id

    await supabase.from('playoff_series').update({ team1_wins: t1wins, team2_wins: t2wins, winner_id: winnerId }).eq('id', seriesId)

    if (winnerId) {
      const nextRound = series.round + 1
      const nextSeries = seriesList.find(s => s.round === nextRound && s.position === Math.floor(series.position / 2))
      if (nextSeries) {
        const isTeam1Slot = series.position % 2 === 0
        await supabase.from('playoff_series').update(
          isTeam1Slot ? { team1_id: winnerId } : { team2_id: winnerId }
        ).eq('id', nextSeries.id)
      }
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {!hasPlayoff ? (
        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="font-semibold">Generiraj playoff bracket</h3>
          <p className="text-sm text-muted-foreground">
            Ljestvica ima {standings.length} ekipa. Odaberi koliko prolazi u playoff.
          </p>
          <div className="flex items-center gap-3">
            <Label>Broj ekipa u playoffu:</Label>
            <Input
              type="number"
              min={2}
              max={standings.length}
              value={playoffTeams}
              onChange={e => setPlayoffTeams(+e.target.value)}
              className="w-20"
            />
          </div>
          {playoffTeams > 0 && (
            <div className="text-sm text-muted-foreground">
              Format: {bracketRounds.map(r => getRoundName(r, bracketRounds.length)).join(' → ')}
              <br />
              Top {playoffTeams} ekipa: {standings.slice(0, playoffTeams).map(s => s.team.name).join(', ')}
            </div>
          )}
          <Button onClick={generateBracket} disabled={loading || standings.length < 2}>
            {loading ? 'Generira...' : 'Generiraj bracket'}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Playoff bracket je aktivan.</p>
            <Button variant="outline" size="sm" onClick={generateBracket} disabled={loading}>
              Resetiraj bracket
            </Button>
          </div>

          <div className="space-y-6">
            {[...new Set(seriesList.map(s => s.round))].sort().map(round => (
              <div key={round}>
                <h3 className="font-semibold mb-3">{getRoundName(round, totalPlayoffRounds)}</h3>
                <div className="space-y-3">
                  {seriesList.filter(s => s.round === round).map(series => {
                    const seriesMatches = matches.filter(m => m.playoff_series_id === series.id)
                    const canAddGame = !series.winner_id && seriesMatches.length < 3 && series.team1_id && series.team2_id

                    return (
                      <div key={series.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-4">
                          <div className={`flex-1 flex items-center justify-between p-2 rounded ${series.winner_id === series.team1_id ? 'bg-green-50 dark:bg-green-950' : ''}`}>
                            <span className="font-medium">{series.team1?.name ?? 'TBD'}</span>
                            <span className="font-bold text-xl">{series.team1_wins}</span>
                          </div>
                          <span className="text-muted-foreground font-bold">vs</span>
                          <div className={`flex-1 flex items-center justify-between p-2 rounded ${series.winner_id === series.team2_id ? 'bg-green-50 dark:bg-green-950' : ''}`}>
                            <span className="font-bold text-xl">{series.team2_wins}</span>
                            <span className="font-medium">{series.team2?.name ?? 'TBD'}</span>
                          </div>
                          {series.winner_id && (
                            <Badge className="ml-2">
                              {series.winner_id === series.team1_id ? series.team1?.name : series.team2?.name} pobijedio
                            </Badge>
                          )}
                        </div>

                        {seriesMatches.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Igra</TableHead>
                                <TableHead>Rezultat</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {seriesMatches.map(m => (
                                <TableRow key={m.id}>
                                  <TableCell>Igra {m.playoff_game_number}</TableCell>
                                  <TableCell>
                                    {m.status === 'finished'
                                      ? `${m.home_team?.short_name} ${m.home_score}–${m.away_score} ${m.away_team?.short_name}`
                                      : `${m.home_team?.short_name} vs ${m.away_team?.short_name}`}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={m.status === 'finished' ? 'secondary' : 'outline'}>
                                      {m.status === 'finished' ? 'Završena' : 'Zakazana'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {m.status === 'finished' ? (
                                      <Link href={`/admin/matches/${m.id}/stats`} className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}>Statistika</Link>
                                    ) : series.team1_id && series.team2_id ? (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            const hs = prompt(`${series.team1?.name} koševi:`)
                                            const as_ = prompt(`${series.team2?.name} koševi:`)
                                            if (hs !== null && as_ !== null) {
                                              recordSeriesResult(series.id, m.id, +hs, +as_)
                                            }
                                          }}
                                          disabled={loading}
                                        >
                                          Unesi rezultat
                                        </Button>
                                      </div>
                                    ) : null}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        {canAddGame && (
                          addMatchForm?.seriesId === series.id ? (
                            <form onSubmit={addMatchToSeries} className="flex gap-2 items-end">
                              <div className="space-y-1">
                                <Label className="text-xs">Br. igre</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={3}
                                  value={addMatchForm.gameNumber}
                                  onChange={e => setAddMatchForm(f => f ? { ...f, gameNumber: e.target.value } : null)}
                                  className="w-16 h-7"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Datum</Label>
                                <Input
                                  type="datetime-local"
                                  value={addMatchForm.date}
                                  onChange={e => setAddMatchForm(f => f ? { ...f, date: e.target.value } : null)}
                                  className="h-7"
                                />
                              </div>
                              <Button type="submit" size="sm" disabled={loading}>Dodaj</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setAddMatchForm(null)}>Odustani</Button>
                            </form>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAddMatchForm({ seriesId: series.id, gameNumber: String(seriesMatches.length + 1), date: '' })}
                            >
                              + Dodaj utakmicu u seriju
                            </Button>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
