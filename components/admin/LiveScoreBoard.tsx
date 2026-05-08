'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Match, PlayerTeamSeason, Player } from '@/lib/supabase/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Roster extends PlayerTeamSeason { player: Player }

interface Props {
  initialMatch: Match
  homeRoster: Roster[]
  awayRoster: Roster[]
}

type StatKey = 'two_pt_made' | 'two_pt_attempted' | 'three_pt_made' | 'three_pt_attempted'
  | 'ft_made' | 'ft_attempted' | 'off_rebounds' | 'def_rebounds'
  | 'assists' | 'turnovers' | 'steals' | 'blocks' | 'fouls'

type LiveStat = Record<StatKey, number>

const DEFAULT: LiveStat = {
  two_pt_made: 0, two_pt_attempted: 0, three_pt_made: 0, three_pt_attempted: 0,
  ft_made: 0, ft_attempted: 0, off_rebounds: 0, def_rebounds: 0,
  assists: 0, turnovers: 0, steals: 0, blocks: 0, fouls: 0,
}

const ACTIONS: { label: string; deltas: Partial<LiveStat>; variant: 'success' | 'miss' | 'neutral' }[] = [
  { label: '2P ✓', deltas: { two_pt_made: 1, two_pt_attempted: 1 }, variant: 'success' },
  { label: '2P ✗', deltas: { two_pt_attempted: 1 }, variant: 'miss' },
  { label: '3P ✓', deltas: { three_pt_made: 1, three_pt_attempted: 1 }, variant: 'success' },
  { label: '3P ✗', deltas: { three_pt_attempted: 1 }, variant: 'miss' },
  { label: 'SB ✓', deltas: { ft_made: 1, ft_attempted: 1 }, variant: 'success' },
  { label: 'SB ✗', deltas: { ft_attempted: 1 }, variant: 'miss' },
  { label: 'SK N.', deltas: { off_rebounds: 1 }, variant: 'neutral' },
  { label: 'SK O.', deltas: { def_rebounds: 1 }, variant: 'neutral' },
  { label: 'As', deltas: { assists: 1 }, variant: 'neutral' },
  { label: 'Izg', deltas: { turnovers: 1 }, variant: 'neutral' },
  { label: 'Ukr', deltas: { steals: 1 }, variant: 'neutral' },
  { label: 'Blk', deltas: { blocks: 1 }, variant: 'neutral' },
  { label: 'Gr', deltas: { fouls: 1 }, variant: 'neutral' },
]

function calcPts(s: LiveStat) { return s.two_pt_made * 2 + s.three_pt_made * 3 + s.ft_made }
function pointsDelta(deltas: Partial<LiveStat>) {
  return (deltas.two_pt_made ?? 0) * 2 + (deltas.three_pt_made ?? 0) * 3 + (deltas.ft_made ?? 0)
}

interface HistoryEntry {
  playerId: string
  teamId: string
  prevStats: LiveStat
  newStats: LiveStat
  prevScore: number
  scorePointsDelta: number
  scoreField: 'home_score' | 'away_score'
  label: string
}

export default function LiveScoreBoard({ initialMatch, homeRoster, awayRoster }: Props) {
  const [match, setMatch] = useState(initialMatch)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<Record<string, LiveStat>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const router = useRouter()
  const supabase = createClient()

  const hasRosters = homeRoster.length > 0 || awayRoster.length > 0

  useEffect(() => {
    const channel = supabase
      .channel(`live-match-${match.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
        (payload) => setMatch(prev => ({ ...prev, ...payload.new })))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [match.id])

  useEffect(() => {
    supabase.from('player_match_stats').select('*').eq('match_id', match.id).then(({ data }) => {
      if (!data) return
      const map: Record<string, LiveStat> = {}
      data.forEach(s => { map[s.player_id] = s as unknown as LiveStat })
      setStats(map)
    })
  }, [match.id])

  // Manual score adjustment (only used when no rosters)
  const addPoints = async (team: 'home' | 'away', delta: number) => {
    const field = team === 'home' ? 'home_score' : 'away_score'
    const current = (team === 'home' ? match.home_score : match.away_score) ?? 0
    const next = Math.max(0, current + delta)
    setMatch(prev => ({ ...prev, [field]: next }))
    setSaving(true)
    await supabase.from('matches').update({ [field]: next }).eq('id', match.id)
    setSaving(false)
  }

  const doStat = async (playerId: string, teamId: string, deltas: Partial<LiveStat>, label: string) => {
    const prevStats = stats[playerId] ?? DEFAULT
    const newStats = { ...prevStats }
    for (const [k, v] of Object.entries(deltas)) newStats[k as StatKey] = newStats[k as StatKey] + (v ?? 0)

    const pts = pointsDelta(deltas)
    const scoreField = teamId === match.home_team_id ? 'home_score' : 'away_score'
    const prevScore = (scoreField === 'home_score' ? match.home_score : match.away_score) ?? 0
    const newScore = Math.max(0, prevScore + pts)

    // Optimistic update
    setStats(prev => ({ ...prev, [playerId]: newStats }))
    if (pts !== 0) setMatch(prev => ({ ...prev, [scoreField]: newScore }))

    // Push to history (keep last 20)
    setHistory(prev => [...prev.slice(-19), { playerId, teamId, prevStats, newStats, prevScore, scorePointsDelta: pts, scoreField, label }])

    setSaving(true)
    const ops = [
      supabase.from('player_match_stats').upsert({
        match_id: match.id, player_id: playerId, team_id: teamId,
        minutes: 0, plus_minus: 0, ...newStats,
      }, { onConflict: 'match_id,player_id' }),
      ...(pts !== 0 ? [supabase.from('matches').update({ [scoreField]: newScore }).eq('id', match.id)] : []),
    ]
    await Promise.all(ops)
    setSaving(false)
  }

  const undo = async () => {
    const last = history[history.length - 1]
    if (!last) return

    setHistory(prev => prev.slice(0, -1))
    setStats(prev => ({ ...prev, [last.playerId]: last.prevStats }))
    if (last.scorePointsDelta !== 0) setMatch(prev => ({ ...prev, [last.scoreField]: last.prevScore }))

    setSaving(true)
    const ops = [
      supabase.from('player_match_stats').upsert({
        match_id: match.id, player_id: last.playerId, team_id: last.teamId,
        minutes: 0, plus_minus: 0, ...last.prevStats,
      }, { onConflict: 'match_id,player_id' }),
      ...(last.scorePointsDelta !== 0 ? [supabase.from('matches').update({ [last.scoreField]: last.prevScore }).eq('id', match.id)] : []),
    ]
    await Promise.all(ops)
    setSaving(false)
  }

  const finish = async () => {
    if (!confirm(`Završiti utakmicu? Rezultat: ${match.home_team?.name} ${match.home_score ?? 0} – ${match.away_score ?? 0} ${match.away_team?.name}`)) return
    setSaving(true)
    await supabase.from('matches').update({ status: 'finished' }).eq('id', match.id)
    setSaving(false)
    router.push(`/admin/matches/${match.id}/stats`)
  }

  const homeScore = match.home_score ?? 0
  const awayScore = match.away_score ?? 0
  const isFinished = match.status === 'finished'
  const roster = activeTab === 'home' ? homeRoster : awayRoster
  const teamId = (activeTab === 'home' ? match.home_team_id : match.away_team_id) ?? ''
  const lastAction = history[history.length - 1]

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <Badge variant={isFinished ? 'secondary' : 'default'} className={isFinished ? '' : 'bg-red-500 text-white animate-pulse'}>
          {isFinished ? 'Završeno' : '● UŽIVO'}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {match.round?.name}{match.is_playoff ? ' · Playoff' : ''}
          {saving && <span className="ml-2 text-xs">Sprema...</span>}
        </span>
      </div>

      {/* Score board */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-bold leading-tight">{match.home_team?.name}</p>
          <p className="text-8xl font-bold tabular-nums">{homeScore}</p>
          {!isFinished && !hasRosters && (
            <div className="flex justify-center flex-wrap gap-2">
              {[1, 2, 3].map(pts => (
                <Button key={pts} variant="outline" onClick={() => addPoints('home', pts)} disabled={saving} className="w-12">+{pts}</Button>
              ))}
              <Button variant="ghost" onClick={() => addPoints('home', -1)} disabled={saving || homeScore === 0} className="w-12 text-muted-foreground">−1</Button>
            </div>
          )}
        </div>
        <div className="text-5xl font-bold text-muted-foreground select-none">—</div>
        <div className="text-center space-y-4">
          <p className="text-lg font-bold leading-tight">{match.away_team?.name}</p>
          <p className="text-8xl font-bold tabular-nums">{awayScore}</p>
          {!isFinished && !hasRosters && (
            <div className="flex justify-center flex-wrap gap-2">
              {[1, 2, 3].map(pts => (
                <Button key={pts} variant="outline" onClick={() => addPoints('away', pts)} disabled={saving} className="w-12">+{pts}</Button>
              ))}
              <Button variant="ghost" onClick={() => addPoints('away', -1)} disabled={saving || awayScore === 0} className="w-12 text-muted-foreground">−1</Button>
            </div>
          )}
        </div>
      </div>

      {/* Player stat entry */}
      {hasRosters && !isFinished && (
        <div className="border rounded-lg overflow-hidden">
          {/* Team tabs + undo */}
          <div className="flex border-b">
            {(['home', 'away'] as const).map(tab => {
              const r = tab === 'home' ? homeRoster : awayRoster
              const name = tab === 'home' ? match.home_team?.name : match.away_team?.name
              const total = r.reduce((s, p) => s + calcPts(stats[p.player_id] ?? DEFAULT), 0)
              return (
                <button
                  key={tab}
                  type="button"
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}
                  onClick={() => { setActiveTab(tab); setSelected(null) }}
                >
                  {name} — {total} koš
                </button>
              )
            })}
            {lastAction && (
              <button
                type="button"
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-l shrink-0"
                onClick={undo}
                disabled={saving}
                title={`Poništi: ${lastAction.label}`}
              >
                ↩ {lastAction.label}
              </button>
            )}
          </div>

          {/* Player list */}
          <div className="divide-y">
            {roster.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">Nema igrača u rosteru.</p>
            ) : roster.map(r => {
              const s = stats[r.player_id] ?? DEFAULT
              const pts = calcPts(s)
              const reb = s.off_rebounds + s.def_rebounds
              const isSelected = selected === r.player_id

              return (
                <div key={r.player_id}>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${isSelected ? 'bg-muted' : ''}`}
                    onClick={() => setSelected(isSelected ? null : r.player_id)}
                  >
                    <span className="font-medium">
                      {r.jersey_number != null && <span className="text-muted-foreground mr-2 tabular-nums w-5 inline-block text-right">#{r.jersey_number}</span>}
                      {r.player?.last_name} {r.player?.first_name}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {pts} koš · {reb} sk · {s.assists} as
                    </span>
                  </button>

                  {isSelected && (
                    <div className="px-4 pb-3 pt-2 bg-muted/20">
                      <div className="flex flex-wrap gap-1.5">
                        {ACTIONS.map(action => (
                          <Button
                            key={action.label}
                            size="sm"
                            variant={action.variant === 'success' ? 'default' : action.variant === 'miss' ? 'outline' : 'secondary'}
                            className={`h-8 text-xs ${action.variant === 'miss' ? 'text-muted-foreground' : ''}`}
                            onClick={() => doStat(
                              r.player_id, teamId, action.deltas,
                              `${r.player?.last_name} ${action.label}`
                            )}
                            disabled={saving}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        2P: {s.two_pt_made}/{s.two_pt_attempted} · 3P: {s.three_pt_made}/{s.three_pt_attempted} · SB: {s.ft_made}/{s.ft_attempted} · SK N.: {s.off_rebounds} · SK O.: {s.def_rebounds} · As: {s.assists} · Izg: {s.turnovers} · Gr: {s.fouls}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 pt-4 border-t">
        {isFinished ? (
          <Link href={`/admin/matches/${match.id}/stats`} className={cn(buttonVariants())}>
            Unesi statistiku →
          </Link>
        ) : (
          <Button onClick={finish} disabled={saving} variant="default" size="lg">
            Završi utakmicu
          </Button>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Rezultat se ažurira u realnom vremenu za sve koji imaju otvorenu stranicu.
        </p>
      </div>
    </div>
  )
}
