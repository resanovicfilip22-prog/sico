'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Round, Season } from '@/lib/supabase/types'

interface Props {
  rounds: Round[]
  seasons: Season[]
  defaultSeasonId: string
}

export default function RoundsManager({ rounds, seasons, defaultSeasonId }: Props) {
  const [seasonId, setSeasonId] = useState(defaultSeasonId)
  const [form, setForm] = useState({ name: '', round_number: rounds.length + 1 })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('rounds').insert({
      season_id: seasonId,
      name: form.name,
      round_number: form.round_number,
      is_playoff: false,
    })
    setForm(f => ({ name: '', round_number: f.round_number + 1 }))
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Obriši kolo? Sve utakmice u kolu biti će obrisane.')) return
    await supabase.from('rounds').delete().eq('id', id)
    router.refresh()
  }

  const seasonRounds = rounds.filter(r => r.season_id === seasonId && !r.is_playoff)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label>Sezona:</Label>
        <Select value={seasonId} onValueChange={v => v && setSeasonId(v)} items={seasons.map(s => ({ value: s.id, label: s.name }))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={handleAdd} className="flex gap-3 items-end">
        <div className="space-y-1">
          <Label>Naziv kola</Label>
          <Input
            placeholder="npr. 1. kolo"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label>Broj</Label>
          <Input
            type="number"
            value={form.round_number}
            onChange={e => setForm(f => ({ ...f, round_number: +e.target.value }))}
            className="w-20"
          />
        </div>
        <Button type="submit" disabled={loading || !seasonId}>+ Dodaj kolo</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Naziv</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seasonRounds.map(round => (
            <TableRow key={round.id}>
              <TableCell>{round.round_number}</TableCell>
              <TableCell>{round.name}</TableCell>
              <TableCell>
                <Badge variant={round.is_playoff ? 'default' : 'secondary'}>
                  {round.is_playoff ? 'Playoff' : 'Regularni'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(round.id)}>
                  Obriši
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {seasonRounds.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-center">Nema kola za ovu sezonu.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
