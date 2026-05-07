import { createClient } from '@/lib/supabase/server'
import { getSeasons } from '@/lib/supabase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { notFound } from 'next/navigation'
import AdminTeamRoster from '@/components/admin/AdminTeamRoster'

export default async function AdminTeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const supabase = await createClient()

  const [{ data: team }, { data: seasons }, { data: allPlayers }] = await Promise.all([
    supabase.from('teams').select('*').eq('id', teamId).single(),
    getSeasons(supabase),
    supabase.from('players').select('*').order('last_name'),
  ])

  if (!team) notFound()

  const seasonRosters = await Promise.all(
    (seasons ?? []).map(async season => {
      const { data: roster } = await supabase
        .from('player_team_seasons')
        .select('*, player:players(*)')
        .eq('team_id', teamId)
        .eq('season_id', season.id)
      return { season, roster: roster ?? [] }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <span className="text-muted-foreground text-sm">{team.short_name}</span>
      </div>

      <AdminTeamRoster
        team={team}
        seasons={seasons ?? []}
        seasonRosters={seasonRosters}
        allPlayers={allPlayers ?? []}
      />
    </div>
  )
}
