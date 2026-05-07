'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { PlayerSeasonAverages } from '@/lib/supabase/types'

interface Col {
  key: keyof PlayerSeasonAverages | 'total_points' | 'total_rebounds' | 'total_assists'
  label: string
  shortLabel: string
  defaultVisible: boolean
  isTotal?: boolean
}

const COLUMNS: Col[] = [
  { key: 'games', label: 'Utakmice', shortLabel: 'U', defaultVisible: true },
  { key: 'avg_points', label: 'Koš/ut', shortLabel: 'Koš', defaultVisible: true },
  { key: 'total_points', label: 'Ukupno koševa', shortLabel: 'Tot.Koš', defaultVisible: false, isTotal: true },
  { key: 'avg_rebounds', label: 'Skokovi/ut', shortLabel: 'Sk', defaultVisible: true },
  { key: 'total_rebounds', label: 'Ukupno skokova', shortLabel: 'Tot.Sk', defaultVisible: false, isTotal: true },
  { key: 'avg_assists', label: 'Asistencije/ut', shortLabel: 'As', defaultVisible: true },
  { key: 'total_assists', label: 'Ukupno asistencija', shortLabel: 'Tot.As', defaultVisible: false, isTotal: true },
  { key: 'avg_steals', label: 'Ukr. lopte/ut', shortLabel: 'UK', defaultVisible: true },
  { key: 'avg_blocks', label: 'Blokade/ut', shortLabel: 'Bl', defaultVisible: false },
  { key: 'avg_turnovers', label: 'Izgubljene/ut', shortLabel: 'Izg', defaultVisible: false },
  { key: 'avg_minutes', label: 'Minute/ut', shortLabel: 'Min', defaultVisible: false },
  { key: 'avg_val', label: 'VAL/ut', shortLabel: 'VAL', defaultVisible: true },
  { key: 'fg_pct', label: 'FG%', shortLabel: 'FG%', defaultVisible: true },
  { key: 'two_pt_pct', label: '2P%', shortLabel: '2P%', defaultVisible: false },
  { key: 'three_pt_pct', label: '3P%', shortLabel: '3P%', defaultVisible: true },
  { key: 'ft_pct', label: 'SB%', shortLabel: 'SB%', defaultVisible: false },
]

type SortKey = keyof PlayerSeasonAverages | 'total_points' | 'total_rebounds' | 'total_assists'

const getValue = (s: PlayerSeasonAverages, key: SortKey): number => {
  if (key === 'total_points') return s.total_points
  if (key === 'total_rebounds') return s.total_rebounds
  if (key === 'total_assists') return s.total_assists
  const v = s[key as keyof PlayerSeasonAverages]
  return (typeof v === 'number' ? v : 0)
}

const formatValue = (s: PlayerSeasonAverages, key: SortKey): string => {
  const v = getValue(s, key)
  if (key === 'fg_pct' || key === 'two_pt_pct' || key === 'three_pt_pct' || key === 'ft_pct') {
    return v != null ? `${v}%` : '-'
  }
  return v != null ? String(v) : '-'
}

export default function PlayerStatsTable({ stats }: { stats: PlayerSeasonAverages[] }) {
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  )
  const [sortKey, setSortKey] = useState<SortKey>('avg_points')
  const [sortDesc, setSortDesc] = useState(true)
  const [showSelector, setShowSelector] = useState(false)

  const toggleCol = (key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(true) }
  }

  const sorted = useMemo(() =>
    [...stats].sort((a, b) => {
      const av = getValue(a, sortKey) ?? -1
      const bv = getValue(b, sortKey) ?? -1
      return sortDesc ? bv - av : av - bv
    }),
    [stats, sortKey, sortDesc]
  )

  const activeCols = COLUMNS.filter(c => visibleCols.has(c.key as string))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Sortirano po:</span>
          <Badge variant="secondary">{COLUMNS.find(c => c.key === sortKey)?.label ?? sortKey}</Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSelector(s => !s)}
        >
          {showSelector ? 'Sakrij kolone' : 'Odaberi kolone'}
        </Button>
      </div>

      {showSelector && (
        <div className="border rounded-lg p-3 flex flex-wrap gap-2">
          {COLUMNS.map(col => (
            <button
              key={String(col.key)}
              onClick={() => toggleCol(String(col.key))}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                visibleCols.has(String(col.key))
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground'
              }`}
            >
              {col.label}
              {col.isTotal && <span className="ml-1 opacity-60">(total)</span>}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background w-8">#</TableHead>
              <TableHead className="sticky left-8 bg-background min-w-[140px]">Igrač</TableHead>
              <TableHead className="min-w-[60px]">Ekipa</TableHead>
              {activeCols.map(col => (
                <TableHead
                  key={String(col.key)}
                  className="text-center cursor-pointer hover:bg-accent select-none whitespace-nowrap"
                  onClick={() => handleSort(col.key as SortKey)}
                >
                  {col.shortLabel}
                  {sortKey === col.key && (
                    <span className="ml-1 text-primary">{sortDesc ? '↓' : '↑'}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s, i) => (
              <TableRow key={s.player_id}>
                <TableCell className="sticky left-0 bg-background text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="sticky left-8 bg-background">
                  <Link href={`/players/${s.player_id}`} className="hover:underline font-medium">
                    {s.player?.last_name} {s.player?.first_name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.team?.short_name}</TableCell>
                {activeCols.map(col => (
                  <TableCell
                    key={String(col.key)}
                    className={`text-center ${sortKey === col.key ? 'font-bold text-primary' : ''}`}
                  >
                    {formatValue(s, col.key as SortKey)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={3 + activeCols.length} className="text-center text-muted-foreground">
                  Nema statistike.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Klikni na zaglavlje stupca za sortiranje</p>
    </div>
  )
}
