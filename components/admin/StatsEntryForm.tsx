'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Match, PlayerTeamSeason, Player, PlayerMatchStatsComputed } from '@/lib/supabase/types'

interface Roster extends PlayerTeamSeason { player: Player }

interface Props {
  match: Match
  homeRoster: Roster[]
  awayRoster: Roster[]
  existingStats: PlayerMatchStatsComputed[]
}

interface StatRow {
  player_id: string
  team_id: string
  minutes: string
  two_pt_made: string; two_pt_attempted: string
  three_pt_made: string; three_pt_attempted: string
  ft_made: string; ft_attempted: string
  off_rebounds: string; def_rebounds: string
  assists: string; turnovers: string; steals: string; blocks: string
  fouls: string; plus_minus: string
}

const EMPTY = (player_id: string, team_id: string): StatRow => ({
  player_id, team_id,
  minutes: '0', two_pt_made: '0', two_pt_attempted: '0',
  three_pt_made: '0', three_pt_attempted: '0',
  ft_made: '0', ft_attempted: '0',
  off_rebounds: '0', def_rebounds: '0',
  assists: '0', turnovers: '0', steals: '0', blocks: '0',
  fouls: '0', plus_minus: '0',
})

const fromExisting = (s: PlayerMatchStatsComputed): StatRow => ({
  player_id: s.player_id, team_id: s.team_id,
  minutes: String(s.minutes),
  two_pt_made: String(s.two_pt_made), two_pt_attempted: String(s.two_pt_attempted),
  three_pt_made: String(s.three_pt_made), three_pt_attempted: String(s.three_pt_attempted),
  ft_made: String(s.ft_made), ft_attempted: String(s.ft_attempted),
  off_rebounds: String(s.off_rebounds), def_rebounds: String(s.def_rebounds),
  assists: String(s.assists), turnovers: String(s.turnovers),
  steals: String(s.steals), blocks: String(s.blocks),
  fouls: String(s.fouls), plus_minus: String(s.plus_minus),
})

const calcPoints = (r: StatRow) =>
  (+r.two_pt_made) * 2 + (+r.three_pt_made) * 3 + (+r.ft_made)

const calcVal = (r: StatRow) =>
  calcPoints(r) + (+r.assists) + (+r.off_rebounds) + (+r.def_rebounds)

export default function StatsEntryForm({ match, homeRoster, awayRoster, existingStats }: Props) {
  const initRows = (roster: Roster[], teamId: string): Record<string, StatRow> => {
    const rows: Record<string, StatRow> = {}
    for (const r of roster) {
      const existing = existingStats.find(s => s.player_id === r.player_id && s.team_id === teamId)
      rows[r.player_id] = existing ? fromExisting(existing) : EMPTY(r.player_id, teamId)
    }
    return rows
  }

  const [homeRows, setHomeRows] = useState<Record<string, StatRow>>(() => initRows(homeRoster, match.home_team_id))
  const [awayRows, setAwayRows] = useState<Record<string, StatRow>>(() => initRows(awayRoster, match.away_team_id))
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const update = useCallback(
    (isHome: boolean, playerId: string, field: keyof StatRow, value: string) => {
      const setter = isHome ? setHomeRows : setAwayRows
      setter(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }))
    }, []
  )

  const handleSave = async () => {
    setLoading(true)
    const allRows = [...Object.values(homeRows), ...Object.values(awayRows)]
    const upserts = allRows.map(r => ({
      match_id: match.id,
      player_id: r.player_id,
      team_id: r.team_id,
      minutes: +r.minutes || 0,
      two_pt_made: +r.two_pt_made || 0,
      two_pt_attempted: +r.two_pt_attempted || 0,
      three_pt_made: +r.three_pt_made || 0,
      three_pt_attempted: +r.three_pt_attempted || 0,
      ft_made: +r.ft_made || 0,
      ft_attempted: +r.ft_attempted || 0,
      off_rebounds: +r.off_rebounds || 0,
      def_rebounds: +r.def_rebounds || 0,
      assists: +r.assists || 0,
      turnovers: +r.turnovers || 0,
      steals: +r.steals || 0,
      blocks: +r.blocks || 0,
      fouls: +r.fouls || 0,
      plus_minus: +r.plus_minus || 0,
    }))
    await supabase.from('player_match_stats').upsert(upserts, { onConflict: 'match_id,player_id' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setLoading(false)
    router.refresh()
  }

  const StatInput = ({ value, onChange, wide }: { value: string; onChange: (v: string) => void; wide?: boolean }) => (
    <Input
      type="number"
      min="0"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`h-7 text-center px-1 ${wide ? 'w-14' : 'w-11'}`}
    />
  )

  const TeamTable = ({ roster, rows, teamId, isHome }: { roster: Roster[]; rows: Record<string, StatRow>; teamId: string; isHome: boolean }) => {
    if (roster.length === 0) {
      return <p className="text-sm text-muted-foreground">Nema igrača u rosteru za ovu sezonu. Dodaj igrače u <a href="/admin/players" className="underline">administraciji igrača</a>.</p>
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Igrač</TableHead>
              <TableHead className="text-center">Min</TableHead>
              <TableHead className="text-center">2P (M/P)</TableHead>
              <TableHead className="text-center">3P (M/P)</TableHead>
              <TableHead className="text-center">SB (M/P)</TableHead>
              <TableHead className="text-center">SK+</TableHead>
              <TableHead className="text-center">SK-</TableHead>
              <TableHead className="text-center">As</TableHead>
              <TableHead className="text-center">Izg</TableHead>
              <TableHead className="text-center">UK</TableHead>
              <TableHead className="text-center">Bl</TableHead>
              <TableHead className="text-center">Gr</TableHead>
              <TableHead className="text-center">+/-</TableHead>
              <TableHead className="text-center">Koš</TableHead>
              <TableHead className="text-center">VAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.map(r => {
              const row = rows[r.player_id] ?? EMPTY(r.player_id, teamId)
              const pts = calcPoints(row)
              const val = calcVal(row)
              const f = (field: keyof StatRow) => (v: string) => update(isHome, r.player_id, field, v)
              return (
                <TableRow key={r.player_id}>
                  <TableCell className="sticky left-0 bg-background font-medium whitespace-nowrap">
                    {r.player?.last_name} {r.player?.first_name}
                    {r.jersey_number ? <span className="text-muted-foreground ml-1 text-xs">#{r.jersey_number}</span> : null}
                  </TableCell>
                  <TableCell><StatInput value={row.minutes} onChange={f('minutes')} /></TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <StatInput value={row.two_pt_made} onChange={f('two_pt_made')} />
                      <span className="self-center text-muted-foreground">/</span>
                      <StatInput value={row.two_pt_attempted} onChange={f('two_pt_attempted')} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <StatInput value={row.three_pt_made} onChange={f('three_pt_made')} />
                      <span className="self-center text-muted-foreground">/</span>
                      <StatInput value={row.three_pt_attempted} onChange={f('three_pt_attempted')} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <StatInput value={row.ft_made} onChange={f('ft_made')} />
                      <span className="self-center text-muted-foreground">/</span>
                      <StatInput value={row.ft_attempted} onChange={f('ft_attempted')} />
                    </div>
                  </TableCell>
                  <TableCell><StatInput value={row.off_rebounds} onChange={f('off_rebounds')} /></TableCell>
                  <TableCell><StatInput value={row.def_rebounds} onChange={f('def_rebounds')} /></TableCell>
                  <TableCell><StatInput value={row.assists} onChange={f('assists')} /></TableCell>
                  <TableCell><StatInput value={row.turnovers} onChange={f('turnovers')} /></TableCell>
                  <TableCell><StatInput value={row.steals} onChange={f('steals')} /></TableCell>
                  <TableCell><StatInput value={row.blocks} onChange={f('blocks')} /></TableCell>
                  <TableCell><StatInput value={row.fouls} onChange={f('fouls')} /></TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.plus_minus}
                      onChange={e => update(isHome, r.player_id, 'plus_minus', e.target.value)}
                      className="h-7 text-center px-1 w-14"
                    />
                  </TableCell>
                  <TableCell className="text-center font-bold">{pts}</TableCell>
                  <TableCell className="text-center font-medium text-primary">{val}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  const homeTotalPts = Object.values(homeRows).reduce((sum, row) => sum + calcPoints(row), 0)
  const awayTotalPts = Object.values(awayRows).reduce((sum, row) => sum + calcPoints(row), 0)

  const hasScore = match.home_score != null && match.away_score != null
  const homeOk = !hasScore || homeTotalPts === match.home_score
  const awayOk = !hasScore || awayTotalPts === match.away_score
  const mismatch = hasScore && (!homeOk || !awayOk)

  return (
    <div className="space-y-4">
      <Tabs defaultValue="home">
        <TabsList>
          <TabsTrigger value="home">
            {match.home_team?.name} — {homeTotalPts} koš
            {hasScore && <span className={`ml-1.5 ${homeOk ? 'text-green-600' : 'text-destructive'}`}>{homeOk ? '✓' : '⚠'}</span>}
          </TabsTrigger>
          <TabsTrigger value="away">
            {match.away_team?.name} — {awayTotalPts} koš
            {hasScore && <span className={`ml-1.5 ${awayOk ? 'text-green-600' : 'text-destructive'}`}>{awayOk ? '✓' : '⚠'}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="home">
          <TeamTable roster={homeRoster} rows={homeRows} teamId={match.home_team_id} isHome={true} />
        </TabsContent>
        <TabsContent value="away">
          <TeamTable roster={awayRoster} rows={awayRows} teamId={match.away_team_id} isHome={false} />
        </TabsContent>
      </Tabs>

      {hasScore && (
        <div className="flex gap-6 text-sm px-1">
          <span className={homeOk ? 'text-green-600' : 'text-destructive font-medium'}>
            {match.home_team?.name}: {homeTotalPts} / {match.home_score}
            {homeOk ? ' — poklapa se' : ' — ne poklapa se!'}
          </span>
          <span className={awayOk ? 'text-green-600' : 'text-destructive font-medium'}>
            {match.away_team?.name}: {awayTotalPts} / {match.away_score}
            {awayOk ? ' — poklapa se' : ' — ne poklapa se!'}
          </span>
        </div>
      )}

      {mismatch && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          ⚠ Statistike se ne poklapaju s rezultatom — možeš ih spremiti, ali neće biti vidljive u javnom dijelu dok se ne usklade s rezultatom ({match.home_score} – {match.away_score}).
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={loading} size="lg">
          {saved ? 'Statistika spremljena!' : loading ? 'Sprema...' : 'Spremi statistiku'}
        </Button>
        {saved && <Badge variant="secondary">Sve statistike su ažurirane</Badge>}
        {!mismatch && <span className="text-xs text-muted-foreground">Koš i VAL se računaju automatski</span>}
      </div>
    </div>
  )
}
