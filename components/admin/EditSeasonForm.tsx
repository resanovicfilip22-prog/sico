'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Season } from '@/lib/supabase/types'

export default function EditSeasonForm({ season }: { season: Season }) {
  const [form, setForm] = useState({
    name: season.name,
    year_start: season.year_start,
    year_end: season.year_end,
    playoff_teams_count: season.playoff_teams_count,
    is_active: season.is_active,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (form.is_active) {
      await supabase.from('seasons').update({ is_active: false }).neq('id', season.id)
    }
    await supabase.from('seasons').update(form).eq('id', season.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Naziv</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Godina početka</Label>
          <Input type="number" value={form.year_start} onChange={e => setForm(f => ({ ...f, year_start: +e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Godina završetka</Label>
          <Input type="number" value={form.year_end} onChange={e => setForm(f => ({ ...f, year_end: +e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Broj ekipa u playoffu</Label>
        <Input type="number" min={2} max={16} value={form.playoff_teams_count} onChange={e => setForm(f => ({ ...f, playoff_teams_count: +e.target.value }))} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={form.is_active}
          onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
          className="h-4 w-4"
        />
        <Label htmlFor="is_active">Aktivna sezona</Label>
      </div>
      <Button type="submit" disabled={loading}>
        {saved ? 'Spremljeno!' : loading ? 'Sprema...' : 'Spremi promjene'}
      </Button>
    </form>
  )
}
