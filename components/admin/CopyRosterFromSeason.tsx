'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Season } from '@/lib/supabase/types'

interface Props {
  targetSeasonId: string
  targetSeasonName: string
  availableSeasons: Season[]
}

export default function CopyRosterFromSeason({ targetSeasonId, targetSeasonName, availableSeasons }: Props) {
  const [sourceSeasonId, setSourceSeasonId] = useState('')
  const [preview, setPreview] = useState<{ teams: { id: string; name: string; playerCount: number }[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const loadPreview = async (seasonId: string) => {
    setSourceSeasonId(seasonId)
    setDone(false)
    if (!seasonId) { setPreview(null); return }
    setLoading(true)

    const { data: seasonTeams } = await supabase
      .from('season_teams')
      .select('team_id, team:teams(name)')
      .eq('season_id', seasonId)

    const teamIds = (seasonTeams ?? []).map(st => st.team_id)
    const teamsWithCounts = await Promise.all(
      (seasonTeams ?? []).map(async st => {
        const { count } = await supabase
          .from('player_team_seasons')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', st.team_id)
          .eq('season_id', seasonId)
        return {
          id: st.team_id,
          name: (st.team as unknown as { name: string })?.name ?? st.team_id,
          playerCount: count ?? 0,
        }
      })
    )

    setPreview({ teams: teamsWithCounts })
    setLoading(false)
  }

  const handleCopy = async () => {
    if (!sourceSeasonId || !preview) return
    if (!confirm(`Kopirati ${preview.teams.length} ekipa i sve njihove igrače u sezonu ${targetSeasonName}?`)) return

    setLoading(true)

    const { data: sourceTeams } = await supabase
      .from('season_teams')
      .select('team_id')
      .eq('season_id', sourceSeasonId)

    for (const st of sourceTeams ?? []) {
      await supabase
        .from('season_teams')
        .upsert({ season_id: targetSeasonId, team_id: st.team_id }, { onConflict: 'season_id,team_id' })

      const { data: players } = await supabase
        .from('player_team_seasons')
        .select('*')
        .eq('season_id', sourceSeasonId)
        .eq('team_id', st.team_id)

      if (players && players.length > 0) {
        await supabase
          .from('player_team_seasons')
          .upsert(
            players.map(p => ({
              player_id: p.player_id,
              team_id: p.team_id,
              season_id: targetSeasonId,
              jersey_number: p.jersey_number,
            })),
            { onConflict: 'player_id,season_id' }
          )
      }
    }

    setDone(true)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Odaberi sezonu iz koje želiš kopirati ekipe i njihove igrače u ovu sezonu.
        Igrači koji već postoje u ovoj sezoni neće biti dvostruko dodani.
      </p>

      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <Label>Izvorna sezona</Label>
          <Select value={sourceSeasonId} onValueChange={v => v && loadPreview(v)} items={availableSeasons.map(s => ({ value: s.id, label: s.name }))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Odaberi sezonu" />
            </SelectTrigger>
            <SelectContent>
              {availableSeasons.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {preview && (
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Što će biti kopirano:</p>
          <div className="flex flex-wrap gap-2">
            {preview.teams.map(t => (
              <Badge key={t.id} variant="secondary">
                {t.name} ({t.playerCount} igrača)
              </Badge>
            ))}
          </div>
          {preview.teams.length === 0 && (
            <p className="text-sm text-muted-foreground">Ta sezona nema ekipa.</p>
          )}
          {done ? (
            <p className="text-sm text-green-600 font-medium">Kopirano uspješno!</p>
          ) : (
            <Button onClick={handleCopy} disabled={loading || preview.teams.length === 0}>
              {loading ? 'Kopira...' : `Kopiraj ${preview.teams.length} ekipa`}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
