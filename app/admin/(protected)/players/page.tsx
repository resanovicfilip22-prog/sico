import { createClient } from '@/lib/supabase/server'
import { getPlayers, getSeasons } from '@/lib/supabase/queries'
import { Card, CardContent } from '@/components/ui/card'
import PlayersManager from '@/components/admin/PlayersManager'
import { Season } from '@/lib/supabase/types'

export default async function AdminPlayersPage() {
  const supabase = await createClient()
  const [{ data: players }, { data: seasons }, { data: teams }, { data: allRosters }] = await Promise.all([
    getPlayers(supabase),
    getSeasons(supabase),
    supabase.from('teams').select('*').order('name'),
    supabase.from('player_team_seasons').select('*, player:players(*), team:teams(*), season:seasons(*)'),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Igrači</h1>
      <Card>
        <CardContent className="pt-6">
          <PlayersManager
            players={players ?? []}
            seasons={seasons ?? []}
            teams={teams ?? []}
            rosters={allRosters ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
