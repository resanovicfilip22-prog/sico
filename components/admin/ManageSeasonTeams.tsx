'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Team, SeasonTeam } from '@/lib/supabase/types'

interface Props {
  seasonId: string
  seasonTeams: (SeasonTeam & { team: Team })[]
  allTeams: Team[]
}

export default function ManageSeasonTeams({ seasonId, seasonTeams, allTeams }: Props) {
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const enrolled = new Set(seasonTeams.map(st => st.team_id))
  const available = allTeams.filter(t => !enrolled.has(t.id))

  const addTeam = async () => {
    if (!selectedTeamId) return
    setLoading(true)
    await supabase.from('season_teams').insert({ season_id: seasonId, team_id: selectedTeamId })
    setSelectedTeamId('')
    setLoading(false)
    router.refresh()
  }

  const removeTeam = async (seasonTeamId: string) => {
    setLoading(true)
    await supabase.from('season_teams').delete().eq('id', seasonTeamId)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {seasonTeams.map(st => (
          <Badge key={st.id} variant="secondary" className="gap-1 pr-1">
            {st.team?.name}
            <button
              onClick={() => removeTeam(st.id)}
              className="ml-1 hover:text-destructive text-xs"
              disabled={loading}
            >
              ×
            </button>
          </Badge>
        ))}
        {seasonTeams.length === 0 && (
          <p className="text-sm text-muted-foreground">Nema ekipa u sezoni.</p>
        )}
      </div>
      {available.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedTeamId} onValueChange={v => v && setSelectedTeamId(v)} items={available.map(t => ({ value: t.id, label: t.name }))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Odaberi ekipu" />
            </SelectTrigger>
            <SelectContent>
              {available.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addTeam} disabled={!selectedTeamId || loading} size="sm">
            Dodaj
          </Button>
        </div>
      )}
    </div>
  )
}
