import { createClient } from '@/lib/supabase/server'
import { getTeams } from '@/lib/supabase/queries'
import { Card, CardContent } from '@/components/ui/card'
import TeamsManager from '@/components/admin/TeamsManager'

export default async function AdminTeamsPage() {
  const supabase = await createClient()
  const { data: teams } = await getTeams(supabase)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ekipe</h1>
      <Card>
        <CardContent className="pt-6">
          <TeamsManager teams={teams ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
