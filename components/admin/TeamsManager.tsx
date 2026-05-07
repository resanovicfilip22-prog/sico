'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Team } from '@/lib/supabase/types'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function TeamsManager({ teams }: { teams: Team[] }) {
  const [form, setForm] = useState({ name: '', short_name: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', short_name: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('teams').insert(form)
    setForm({ name: '', short_name: '' })
    setLoading(false)
    router.refresh()
  }

  const handleEdit = async (id: string) => {
    setLoading(true)
    await supabase.from('teams').update(editForm).eq('id', id)
    setEditId(null)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (team: Team) => {
    if (!confirm(`Obriši ekipu "${team.name}"? Ovo će obrisati ekipu iz svih sezona, rasporeda i statistika.`)) return
    const { error } = await supabase.from('teams').delete().eq('id', team.id)
    if (error) alert(`Greška pri brisanju: ${error.message}`)
    else router.refresh()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex gap-3 items-end">
        <div className="space-y-1">
          <Label>Naziv ekipe</Label>
          <Input
            placeholder="npr. KK Šibenik"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            className="w-48"
          />
        </div>
        <div className="space-y-1">
          <Label>Kratice (max 4 znaka)</Label>
          <Input
            placeholder="npr. KKŠ"
            maxLength={4}
            value={form.short_name}
            onChange={e => setForm(f => ({ ...f, short_name: e.target.value.toUpperCase() }))}
            required
            className="w-24"
          />
        </div>
        <Button type="submit" disabled={loading}>+ Dodaj ekipu</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Naziv</TableHead>
            <TableHead>Kratica</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map(team => (
            <TableRow key={team.id}>
              <TableCell>
                {editId === team.id ? (
                  <Input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="h-8"
                  />
                ) : (
                  team.name
                )}
              </TableCell>
              <TableCell>
                {editId === team.id ? (
                  <Input
                    value={editForm.short_name}
                    maxLength={4}
                    onChange={e => setEditForm(f => ({ ...f, short_name: e.target.value.toUpperCase() }))}
                    className="h-8 w-20"
                  />
                ) : (
                  team.short_name
                )}
              </TableCell>
              <TableCell>
                {editId === team.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => handleEdit(team.id)} disabled={loading}>Spremi</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Odustani</Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditId(team.id); setEditForm({ name: team.name, short_name: team.short_name }) }}
                    >
                      Uredi
                    </Button>
                    <Link href={`/admin/teams/${team.id}`} className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}>
                      Roster →
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(team)}
                    >
                      Obriši
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
