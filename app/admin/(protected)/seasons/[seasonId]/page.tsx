import { createClient } from '@/lib/supabase/server'
import { getSeasonTeams, getTeams, getSeasons } from '@/lib/supabase/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { notFound } from 'next/navigation'
import EditSeasonForm from '@/components/admin/EditSeasonForm'
import ManageSeasonTeams from '@/components/admin/ManageSeasonTeams'
import CopyRosterFromSeason from '@/components/admin/CopyRosterFromSeason'

export default async function EditSeasonPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params
  const supabase = await createClient()

  const [{ data: season }, { data: seasonTeams }, { data: allTeams }, { data: allSeasons }] = await Promise.all([
    supabase.from('seasons').select('*').eq('id', seasonId).single(),
    getSeasonTeams(supabase, seasonId),
    getTeams(supabase),
    getSeasons(supabase),
  ])

  if (!season) notFound()

  const otherSeasons = (allSeasons ?? []).filter(s => s.id !== seasonId)

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Uredi sezonu: {season.name}</h1>

      <Card>
        <CardHeader><CardTitle>Postavke sezone</CardTitle></CardHeader>
        <CardContent>
          <EditSeasonForm season={season} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ekipe u sezoni</CardTitle>
        </CardHeader>
        <CardContent>
          <ManageSeasonTeams
            seasonId={seasonId}
            seasonTeams={seasonTeams ?? []}
            allTeams={allTeams ?? []}
          />
        </CardContent>
      </Card>

      {otherSeasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kopiraj ekipe i igrače iz prošle sezone</CardTitle>
          </CardHeader>
          <CardContent>
            <CopyRosterFromSeason
              targetSeasonId={seasonId}
              targetSeasonName={season.name}
              availableSeasons={otherSeasons}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
