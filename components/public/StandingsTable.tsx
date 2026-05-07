import { StandingsRow } from '@/lib/supabase/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Props {
  rows: StandingsRow[]
  compact?: boolean
  playoffCutoff?: number
}

export default function StandingsTable({ rows, compact, playoffCutoff }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Nema podataka o ljestvici.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>Ekipa</TableHead>
          <TableHead className="text-center">U</TableHead>
          <TableHead className="text-center">P</TableHead>
          <TableHead className="text-center">I</TableHead>
          {!compact && (
            <>
              <TableHead className="text-center">+/-</TableHead>
              <TableHead className="text-center">Ppg</TableHead>
            </>
          )}
          <TableHead className="text-center">%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow
            key={row.team_id}
            className={cn(
              playoffCutoff && i < playoffCutoff ? 'border-l-2 border-l-green-500' : '',
              playoffCutoff && i === playoffCutoff - 1 ? 'border-b-2 border-b-green-500' : ''
            )}
          >
            <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
            <TableCell>
              <Link href={`/teams/${row.team_id}`} className="hover:underline font-medium">
                {row.team.name}
              </Link>
            </TableCell>
            <TableCell className="text-center">{row.played}</TableCell>
            <TableCell className="text-center font-bold text-green-600">{row.wins}</TableCell>
            <TableCell className="text-center text-red-500">{row.losses}</TableCell>
            {!compact && (
              <>
                <TableCell className="text-center">{row.point_diff > 0 ? `+${row.point_diff}` : row.point_diff}</TableCell>
                <TableCell className="text-center">{row.played > 0 ? (row.points_for / row.played).toFixed(1) : '-'}</TableCell>
              </>
            )}
            <TableCell className="text-center">{(row.win_pct * 100).toFixed(0)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
