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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Player, Season, Team, PlayerTeamSeason } from '@/lib/supabase/types'
import Link from 'next/link'

interface Props {
  players: Player[]
  seasons: Season[]
  teams: Team[]
  rosters: (PlayerTeamSeason & { player: Player; team: Team; season: Season })[]
}

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C', 'N/A']

export default function PlayersManager({ players, seasons, teams, rosters }: Props) {
  const [form, setForm] = useState({ first_name: '', last_name: '', birth_year: '', position: 'N/A' as string })
  const [assignForm, setAssignForm] = useState({ player_id: '', season_id: '', team_id: '', jersey_number: '' as string })
  const [assignOpen, setAssignOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('players').insert({
      first_name: form.first_name,
      last_name: form.last_name,
      birth_year: form.birth_year ? +form.birth_year : null,
      position: form.position,
    })
    setForm({ first_name: '', last_name: '', birth_year: '', position: 'N/A' })
    setLoading(false)
    router.refresh()
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('player_team_seasons').upsert({
      player_id: assignForm.player_id,
      season_id: assignForm.season_id,
      team_id: assignForm.team_id,
      jersey_number: assignForm.jersey_number ? +assignForm.jersey_number : null,
    }, { onConflict: 'player_id,season_id' })
    setAssignOpen(false)
    setAssignForm({ player_id: '', season_id: '', team_id: '', jersey_number: '' })
    setLoading(false)
    router.refresh()
  }

  const removeAssignment = async (id: string) => {
    await supabase.from('player_team_seasons').delete().eq('id', id)
    router.refresh()
  }

  const handleDeletePlayer = async (player: Player) => {
    if (!confirm(`Obriši igrača "${player.last_name} ${player.first_name}"? Ovo će obrisati i sve njegove dodjele ekipama i statistike.`)) return
    const { error } = await supabase.from('players').delete().eq('id', player.id)
    if (error) alert(`Greška pri brisanju: ${error.message}`)
    else router.refresh()
  }

  const filtered = players.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div className="space-y-1">
          <Label>Ime</Label>
          <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label>Prezime</Label>
          <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label>God. roj.</Label>
          <Input type="number" placeholder="1990" value={form.birth_year} onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Pozicija</Label>
          <Select value={form.position} onValueChange={v => { if (v) setForm(f => ({ ...f, position: v })) }} items={POSITIONS.map(p => ({ value: p, label: p }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={loading}>+ Dodaj</Button>
      </form>

      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Pretraži igrače..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger render={<Button variant="outline">Dodijeli igrača ekipi</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Dodijeli igrača ekipi u sezoni</DialogTitle></DialogHeader>
            <form onSubmit={handleAssign} className="space-y-4">
              <div className="space-y-1">
                <Label>Igrač</Label>
                <Select value={assignForm.player_id} onValueChange={v => { if (v) setAssignForm(f => ({ ...f, player_id: v })) }} items={players.map(p => ({ value: p.id, label: `${p.last_name} ${p.first_name}` }))}>
                  <SelectTrigger><SelectValue placeholder="Odaberi igrača" /></SelectTrigger>
                  <SelectContent>
                    {players.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.last_name} {p.first_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sezona</Label>
                <Select value={assignForm.season_id} onValueChange={v => { if (v) setAssignForm(f => ({ ...f, season_id: v })) }} items={seasons.map(s => ({ value: s.id, label: s.name }))}>
                  <SelectTrigger><SelectValue placeholder="Odaberi sezonu" /></SelectTrigger>
                  <SelectContent>
                    {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ekipa</Label>
                <Select value={assignForm.team_id} onValueChange={v => { if (v) setAssignForm(f => ({ ...f, team_id: v })) }} items={teams.map(t => ({ value: t.id, label: t.name }))}>
                  <SelectTrigger><SelectValue placeholder="Odaberi ekipu" /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Broj dresa (opcionalno)</Label>
                <Input type="number" value={assignForm.jersey_number} onChange={e => setAssignForm(f => ({ ...f, jersey_number: e.target.value }))} />
              </div>
              <Button type="submit" disabled={loading || !assignForm.player_id || !assignForm.season_id || !assignForm.team_id} className="w-full">
                Dodijeli
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prezime Ime</TableHead>
            <TableHead>Pozicija</TableHead>
            <TableHead>God.</TableHead>
            <TableHead>Sezone / Ekipe</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(player => {
            const playerRosters = rosters.filter(r => r.player_id === player.id)
            return (
              <TableRow key={player.id}>
                <TableCell className="font-medium">
                  <Link href={`/players/${player.id}`} className="hover:underline">
                    {player.last_name} {player.first_name}
                  </Link>
                </TableCell>
                <TableCell>{player.position ?? '-'}</TableCell>
                <TableCell>{player.birth_year ?? '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {playerRosters.map(r => (
                      <Badge key={r.id} variant="outline" className="text-xs gap-1 pr-1">
                        {r.season?.name} · {r.team?.short_name}
                        {r.jersey_number ? ` #${r.jersey_number}` : ''}
                        <button onClick={() => removeAssignment(r.id)} className="hover:text-destructive ml-0.5">×</button>
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAssignForm(f => ({ ...f, player_id: player.id }))}
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDeletePlayer(player)}
                    >
                      Obriši
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
