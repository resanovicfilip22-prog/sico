'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Player, Season, Team, PlayerTeamSeason } from '@/lib/supabase/types'

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C', 'N/A']

interface RosterEntry extends PlayerTeamSeason { player: Player }
interface SeasonRoster { season: Season; roster: RosterEntry[] }

interface Props {
  team: Team
  seasons: Season[]
  seasonRosters: SeasonRoster[]
  allPlayers: Player[]
}

export default function AdminTeamRoster({ team, seasons, seasonRosters, allPlayers }: Props) {
  const activeSeason = seasons.find(s => s.is_active) ?? seasons[0]
  const [selectedSeasonId, setSelectedSeasonId] = useState(activeSeason?.id ?? '')
  const [addOpen, setAddOpen] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [existingPlayerId, setExistingPlayerId] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [newPlayer, setNewPlayer] = useState({ first_name: '', last_name: '', birth_year: '', position: 'N/A' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const currentRoster = seasonRosters.find(sr => sr.season.id === selectedSeasonId)?.roster ?? []
  const currentPlayerIds = new Set(currentRoster.map(r => r.player_id))
  const availablePlayers = allPlayers.filter(p => !currentPlayerIds.has(p.id))

  const handleAddExisting = async () => {
    if (!existingPlayerId || !selectedSeasonId) return
    setLoading(true)
    await supabase.from('player_team_seasons').upsert({
      player_id: existingPlayerId,
      team_id: team.id,
      season_id: selectedSeasonId,
      jersey_number: jerseyNumber ? +jerseyNumber : null,
    }, { onConflict: 'player_id,season_id' })
    setExistingPlayerId('')
    setJerseyNumber('')
    setAddOpen(false)
    setLoading(false)
    router.refresh()
  }

  const handleCreateAndAdd = async () => {
    if (!newPlayer.first_name || !newPlayer.last_name || !selectedSeasonId) return
    setLoading(true)
    const { data: created } = await supabase
      .from('players')
      .insert({
        first_name: newPlayer.first_name,
        last_name: newPlayer.last_name,
        birth_year: newPlayer.birth_year ? +newPlayer.birth_year : null,
        position: newPlayer.position,
      })
      .select()
      .single()

    if (created) {
      await supabase.from('player_team_seasons').insert({
        player_id: created.id,
        team_id: team.id,
        season_id: selectedSeasonId,
        jersey_number: jerseyNumber ? +jerseyNumber : null,
      })
    }
    setNewPlayer({ first_name: '', last_name: '', birth_year: '', position: 'N/A' })
    setJerseyNumber('')
    setAddOpen(false)
    setLoading(false)
    router.refresh()
  }

  const handleRemove = async (entryId: string) => {
    await supabase.from('player_team_seasons').delete().eq('id', entryId)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label>Sezona:</Label>
          <Select value={selectedSeasonId} onValueChange={v => v && setSelectedSeasonId(v)} items={seasons.map(s => ({ value: s.id, label: s.name + (s.is_active ? ' (aktivna)' : '') }))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasons.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.is_active ? '(aktivna)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button>+ Dodaj igrača</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj igrača u {team.name}</DialogTitle>
            </DialogHeader>
            <Tabs value={mode} onValueChange={v => setMode(v as 'existing' | 'new')}>
              <TabsList className="w-full">
                <TabsTrigger value="existing" className="flex-1">Postoji igrač</TabsTrigger>
                <TabsTrigger value="new" className="flex-1">Novi igrač</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>Igrač</Label>
                  <Select value={existingPlayerId} onValueChange={v => v && setExistingPlayerId(v)} items={availablePlayers.map(p => ({ value: p.id, label: `${p.last_name} ${p.first_name}${p.birth_year ? ` (${p.birth_year})` : ''}` }))}>
                    <SelectTrigger><SelectValue placeholder="Pretraži igrača..." /></SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.last_name} {p.first_name}
                          {p.birth_year ? ` (${p.birth_year})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Broj dresa</Label>
                  <Input type="number" value={jerseyNumber} onChange={e => setJerseyNumber(e.target.value)} placeholder="npr. 23" className="w-28" />
                </div>
                <Button onClick={handleAddExisting} disabled={!existingPlayerId || loading} className="w-full">
                  {loading ? 'Dodaje...' : 'Dodaj u tim'}
                </Button>
              </TabsContent>

              <TabsContent value="new" className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Ime</Label>
                    <Input value={newPlayer.first_name} onChange={e => setNewPlayer(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Prezime</Label>
                    <Input value={newPlayer.last_name} onChange={e => setNewPlayer(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>God. rođenja</Label>
                    <Input type="number" placeholder="1995" value={newPlayer.birth_year} onChange={e => setNewPlayer(p => ({ ...p, birth_year: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Pozicija</Label>
                    <Select value={newPlayer.position} onValueChange={v => v && setNewPlayer(p => ({ ...p, position: v }))} items={POSITIONS.map(pos => ({ value: pos, label: pos }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Broj dresa</Label>
                  <Input type="number" value={jerseyNumber} onChange={e => setJerseyNumber(e.target.value)} placeholder="npr. 23" className="w-28" />
                </div>
                <Button onClick={handleCreateAndAdd} disabled={!newPlayer.first_name || !newPlayer.last_name || loading} className="w-full">
                  {loading ? 'Kreira...' : 'Kreiraj i dodaj u tim'}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {currentRoster.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nema igrača u ovoj sezoni. Klikni "+ Dodaj igrača".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {currentRoster
            .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
            .map(r => (
              <div key={r.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  {r.jersey_number != null && (
                    <span className="text-muted-foreground text-sm font-mono w-6">#{r.jersey_number}</span>
                  )}
                  <div>
                    <p className="font-medium text-sm">{r.player?.last_name} {r.player?.first_name}</p>
                    {r.player?.position && <p className="text-xs text-muted-foreground">{r.player.position}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(r.id)}
                  className="text-muted-foreground hover:text-destructive text-xs ml-2"
                >
                  ×
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
