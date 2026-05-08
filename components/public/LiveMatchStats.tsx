'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StatRow {
  player_id: string
  team_id: string
  player: { first_name: string; last_name: string } | null
  two_pt_made: number; three_pt_made: number; ft_made: number
  off_rebounds: number; def_rebounds: number
  assists: number; turnovers: number; steals: number; blocks: number; fouls: number
  two_pt_attempted: number; three_pt_attempted: number; ft_attempted: number
}

function pts(s: StatRow) { return s.two_pt_made * 2 + s.three_pt_made * 3 + s.ft_made }
function reb(s: StatRow) { return s.off_rebounds + s.def_rebounds }

interface Props {
  matchId: string
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
}

export default function LiveMatchStats({ matchId, homeTeamId, awayTeamId, homeTeamName, awayTeamName }: Props) {
  const [stats, setStats] = useState<StatRow[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('player_match_stats')
      .select('*, player:players(first_name, last_name)')
      .eq('match_id', matchId)
      .then(({ data }) => { if (data) setStats(data as StatRow[]) })

    const channel = supabase
      .channel(`pub-stats-${matchId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'player_match_stats', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setStats(prev => {
            const idx = prev.findIndex(s => s.player_id === (payload.new as StatRow).player_id)
            const updated = { ...prev[idx] ?? {}, ...payload.new } as StatRow
            if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next }
            return [...prev, updated]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  const homeStats = stats.filter(s => s.team_id === homeTeamId).sort((a, b) => pts(b) - pts(a))
  const awayStats = stats.filter(s => s.team_id === awayTeamId).sort((a, b) => pts(b) - pts(a))

  if (stats.length === 0) return null

  const PlayerRow = ({ s }: { s: StatRow }) => (
    <tr className="border-t border-border/40">
      <td className="py-1 pr-2 text-xs">
        {s.player ? `${s.player.last_name} ${s.player.first_name[0]}.` : '?'}
      </td>
      <td className="text-center font-bold text-xs tabular-nums">{pts(s)}</td>
      <td className="text-center text-xs tabular-nums text-muted-foreground">{s.two_pt_made}/{s.two_pt_attempted}</td>
      <td className="text-center text-xs tabular-nums text-muted-foreground">{s.three_pt_made}/{s.three_pt_attempted}</td>
      <td className="text-center text-xs tabular-nums text-muted-foreground">{s.ft_made}/{s.ft_attempted}</td>
      <td className="text-center text-xs tabular-nums">{reb(s)}</td>
      <td className="text-center text-xs tabular-nums">{s.assists}</td>
    </tr>
  )

  return (
    <div className="border border-red-200 dark:border-red-900 rounded-lg p-4 bg-red-50/40 dark:bg-red-950/20 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-red-500 animate-pulse uppercase tracking-wide">● Statistike uživo</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { name: homeTeamName, rows: homeStats },
          { name: awayTeamName, rows: awayStats },
        ].map(({ name, rows }) => (
          <div key={name}>
            <p className="font-semibold text-sm mb-1">{name}</p>
            <table className="w-full">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left text-xs pb-1 font-normal">Igrač</th>
                  <th className="text-center text-xs pb-1 font-normal">Koš</th>
                  <th className="text-center text-xs pb-1 font-normal">2P</th>
                  <th className="text-center text-xs pb-1 font-normal">3P</th>
                  <th className="text-center text-xs pb-1 font-normal">SB</th>
                  <th className="text-center text-xs pb-1 font-normal">Sk</th>
                  <th className="text-center text-xs pb-1 font-normal">As</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => <PlayerRow key={s.player_id} s={s} />)}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="text-xs text-muted-foreground py-2">Još nema statistika.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
