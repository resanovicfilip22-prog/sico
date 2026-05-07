'use client'

import Link from 'next/link'
import { PlayoffSeries, Match } from '@/lib/supabase/types'

interface Props {
  seriesList: PlayoffSeries[]
  matches: Match[]
}

const CARD_H = 80
const CARD_GAP = 28
const SLOT_H = CARD_H + CARD_GAP
const COL_W = 180
const COL_GAP = 56
const LABEL_H = 28

function getRoundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return 'Finale'
  if (fromEnd === 1) return 'Polufinale'
  if (fromEnd === 2) return 'Četvrtfinale'
  return `Runda ${round}`
}

function seriesCenterY(round: number, position: number): number {
  const slotSpan = Math.pow(2, round - 1)
  return LABEL_H + (position * slotSpan + slotSpan / 2) * SLOT_H - CARD_GAP / 2
}

export default function PlayoffBracket({ seriesList, matches }: Props) {
  if (seriesList.length === 0) return null

  const rounds = [...new Set(seriesList.map(s => s.round))].sort((a, b) => a - b)
  const totalRounds = Math.max(...rounds)
  const firstRound = rounds[0]
  const firstRoundCount = seriesList.filter(s => s.round === firstRound).length
  const totalSlots = firstRoundCount * Math.pow(2, firstRound - 1)

  const svgH = LABEL_H + totalSlots * SLOT_H
  const svgW = rounds.length * (COL_W + COL_GAP) - COL_GAP

  const connectors: { bracket: string; stem: string }[] = []

  for (let ri = 0; ri < rounds.length - 1; ri++) {
    const round = rounds[ri]
    const nextRound = rounds[ri + 1]
    const roundSeries = seriesList.filter(s => s.round === round).sort((a, b) => a.position - b.position)

    for (let i = 0; i < roundSeries.length; i += 2) {
      const s1 = roundSeries[i]
      const s2 = roundSeries[i + 1]
      if (!s1) continue

      const x_right = ri * (COL_W + COL_GAP) + COL_W
      const x_left = (ri + 1) * (COL_W + COL_GAP)
      const mx = x_right + COL_GAP / 2

      const y1 = seriesCenterY(round, s1.position)
      const y2 = s2 ? seriesCenterY(round, s2.position) : y1
      const yMid = (y1 + y2) / 2

      connectors.push({
        bracket: `${x_right},${y1} ${mx},${y1} ${mx},${y2} ${x_right},${y2}`,
        stem: `${mx},${yMid} ${x_left},${yMid}`,
      })
    }
  }

  return (
    <div className="overflow-x-auto pb-6">
      <div className="relative" style={{ width: svgW, height: svgH, minWidth: svgW }}>
        <svg
          className="absolute inset-0 pointer-events-none"
          width={svgW}
          height={svgH}
        >
          {connectors.map((c, i) => (
            <g key={i}>
              <polyline points={c.bracket} fill="none" stroke="hsl(var(--border))" strokeWidth={1.5} />
              <polyline points={c.stem} fill="none" stroke="hsl(var(--border))" strokeWidth={1.5} />
            </g>
          ))}
        </svg>

        {rounds.map((round, ri) => {
          const colLeft = ri * (COL_W + COL_GAP)
          const roundSeries = seriesList.filter(s => s.round === round).sort((a, b) => a.position - b.position)

          return (
            <div key={round}>
              <div
                className="absolute text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center"
                style={{ top: 0, left: colLeft, width: COL_W, height: LABEL_H, lineHeight: `${LABEL_H}px` }}
              >
                {getRoundName(round, totalRounds)}
              </div>

              {roundSeries.map(series => {
                const top = seriesCenterY(round, series.position) - CARD_H / 2
                const seriesMatches = matches
                  .filter(m => m.playoff_series_id === series.id)
                  .sort((a, b) => (a.playoff_game_number ?? 0) - (b.playoff_game_number ?? 0))

                return (
                  <div
                    key={series.id}
                    className={`absolute border rounded-lg bg-card shadow-sm overflow-hidden ${series.winner_id ? 'border-primary/40' : 'border-border'}`}
                    style={{ top, left: colLeft, width: COL_W, height: CARD_H }}
                  >
                    {series.team1_id && series.team2_id ? (
                      <div className="flex flex-col h-full divide-y divide-border text-sm">
                        <div className={`flex items-center justify-between px-3 flex-1 ${series.winner_id === series.team1_id ? 'bg-green-50 dark:bg-green-950 font-semibold' : ''}`}>
                          <Link href={`/teams/${series.team1_id}`} className="hover:underline truncate max-w-[120px] text-xs">
                            {series.team1?.name}
                          </Link>
                          <span className="font-bold tabular-nums ml-2">{series.team1_wins}</span>
                        </div>
                        <div className={`flex items-center justify-between px-3 flex-1 ${series.winner_id === series.team2_id ? 'bg-green-50 dark:bg-green-950 font-semibold' : ''}`}>
                          <Link href={`/teams/${series.team2_id}`} className="hover:underline truncate max-w-[120px] text-xs">
                            {series.team2?.name}
                          </Link>
                          <span className="font-bold tabular-nums ml-2">{series.team2_wins}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                        TBD
                      </div>
                    )}

                    {seriesMatches.length > 0 && (
                      <div className="absolute bottom-0 right-0 flex gap-0.5 p-1">
                        {seriesMatches.map(m => (
                          <Link
                            key={m.id}
                            href={`/matches/${m.id}`}
                            title={m.status === 'finished' ? `${m.home_score}–${m.away_score}` : 'Zakazana'}
                            className={`text-[8px] px-1 rounded border ${m.status === 'finished' ? 'border-border text-muted-foreground' : 'border-primary/50 text-primary'}`}
                          >
                            G{m.playoff_game_number}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
