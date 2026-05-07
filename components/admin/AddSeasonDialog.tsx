'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Season } from '@/lib/supabase/types'

type Step = 'create' | 'copy'

export default function AddSeasonDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('create')
  const [loading, setLoading] = useState(false)
  const [createdSeasonId, setCreatedSeasonId] = useState('')
  const [createdSeasonName, setCreatedSeasonName] = useState('')
  const [existingSeasons, setExistingSeasons] = useState<Season[]>([])
  const [sourceSeasonId, setSourceSeasonId] = useState('')
  const [copyPreview, setCopyPreview] = useState<{ id: string; name: string; players: number }[]>([])
  const [form, setForm] = useState({
    name: '',
    year_start: new Date().getFullYear(),
    year_end: new Date().getFullYear() + 1,
    playoff_teams_count: 4,
  })
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: newSeason } = await supabase.from('seasons').insert(form).select().single()
    if (newSeason) {
      const { data: seasons } = await supabase.from('seasons').select('*').neq('id', newSeason.id).order('year_start', { ascending: false })
      setCreatedSeasonId(newSeason.id)
      setCreatedSeasonName(newSeason.name)
      setExistingSeasons(seasons ?? [])
      setStep('copy')
    }
    setLoading(false)
  }

  const loadCopyPreview = async (seasonId: string) => {
    setSourceSeasonId(seasonId)
    if (!seasonId) { setCopyPreview([]); return }
    const { data: seasonTeams } = await supabase
      .from('season_teams')
      .select('team_id, team:teams(name)')
      .eq('season_id', seasonId)
    const preview = await Promise.all(
      (seasonTeams ?? []).map(async st => {
        const { count } = await supabase
          .from('player_team_seasons')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', seasonId)
          .eq('team_id', st.team_id)
        return {
          id: st.team_id,
          name: (st.team as unknown as { name: string })?.name ?? '',
          players: count ?? 0,
        }
      })
    )
    setCopyPreview(preview)
  }

  const handleCopy = async () => {
    if (!sourceSeasonId || !createdSeasonId) return
    setLoading(true)
    const { data: sourceTeams } = await supabase.from('season_teams').select('team_id').eq('season_id', sourceSeasonId)
    for (const st of sourceTeams ?? []) {
      await supabase.from('season_teams').upsert({ season_id: createdSeasonId, team_id: st.team_id }, { onConflict: 'season_id,team_id' })
      const { data: players } = await supabase.from('player_team_seasons').select('*').eq('season_id', sourceSeasonId).eq('team_id', st.team_id)
      if (players?.length) {
        await supabase.from('player_team_seasons').upsert(
          players.map(p => ({ player_id: p.player_id, team_id: p.team_id, season_id: createdSeasonId, jersey_number: p.jersey_number })),
          { onConflict: 'player_id,season_id' }
        )
      }
    }
    setLoading(false)
    handleFinish()
  }

  const handleFinish = () => {
    setOpen(false)
    setStep('create')
    setForm({ name: '', year_start: new Date().getFullYear(), year_end: new Date().getFullYear() + 1, playoff_teams_count: 4 })
    setCreatedSeasonId('')
    setSourceSeasonId('')
    setCopyPreview([])
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setStep('create') } }}>
      <DialogTrigger render={<Button>+ Nova sezona</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 'create' ? 'Dodaj novu sezonu' : `Sezona "${createdSeasonName}" kreirana!`}
          </DialogTitle>
        </DialogHeader>

        {step === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Naziv (npr. 2025/26)</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="2025/26" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Godina početka</Label>
                <Input type="number" value={form.year_start} onChange={e => setForm(f => ({ ...f, year_start: +e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Godina završetka</Label>
                <Input type="number" value={form.year_end} onChange={e => setForm(f => ({ ...f, year_end: +e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Broj ekipa u playoffu</Label>
              <Input type="number" min={2} max={16} value={form.playoff_teams_count} onChange={e => setForm(f => ({ ...f, playoff_teams_count: +e.target.value }))} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Kreira...' : 'Kreiraj sezonu →'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-green-600 font-medium">Sezona uspješno kreirana.</p>
            <div className="space-y-2">
              <Label>Kopiraj ekipe i igrače iz prošle sezone (opcionalno)</Label>
              <Select value={sourceSeasonId} onValueChange={v => v && loadCopyPreview(v)} items={existingSeasons.map(s => ({ value: s.id, label: s.name }))}>
                <SelectTrigger><SelectValue placeholder="Odaberi izvornu sezonu..." /></SelectTrigger>
                <SelectContent>
                  {existingSeasons.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {copyPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Biti će kopirano:</p>
                <div className="flex flex-wrap gap-1">
                  {copyPreview.map(t => (
                    <Badge key={t.id} variant="secondary">{t.name} ({t.players})</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {sourceSeasonId && copyPreview.length > 0 && (
                <Button onClick={handleCopy} disabled={loading} className="flex-1">
                  {loading ? 'Kopira...' : `Kopiraj ${copyPreview.length} ekipa`}
                </Button>
              )}
              <Button variant="outline" onClick={handleFinish} className="flex-1">
                {sourceSeasonId ? 'Preskoči kopiranje' : 'Završi'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
