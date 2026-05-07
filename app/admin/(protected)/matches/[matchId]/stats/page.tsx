import { createClient } from '@/lib/supabase/server'
import { getMatchWithStats } from '@/lib/supabase/queries'
import { notFound } from 'next/navigation'
import StatsEntryForm from '@/components/admin/StatsEntryForm'

export default async function StatsEntryPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const supabase = await createClient()
  const { match: { data: match }, stats: { data: existingStats } } = await getMatchWithStats(supabase, matchId)

  if (!match) notFound()

  const [{ data: homeRoster }, { data: awayRoster }] = await Promise.all([
    supabase
      .from('player_team_seasons')
      .select('*, player:players(*)')
      .eq('team_id', match.home_team_id)
      .eq('season_id', match.season_id),
    supabase
      .from('player_team_seasons')
      .select('*, player:players(*)')
      .eq('team_id', match.away_team_id)
      .eq('season_id', match.season_id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unos statistike</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {match.home_team?.name} {match.home_score} – {match.away_score} {match.away_team?.name}
          {' · '}{match.round?.name}
        </p>
      </div>
      <StatsEntryForm
        match={match}
        homeRoster={homeRoster ?? []}
        awayRoster={awayRoster ?? []}
        existingStats={existingStats ?? []}
      />
    </div>
  )
}
