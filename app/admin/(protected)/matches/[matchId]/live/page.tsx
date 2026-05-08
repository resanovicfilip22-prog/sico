import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LiveScoreBoard from '@/components/admin/LiveScoreBoard'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function LiveMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), round:rounds(*)')
    .eq('id', matchId)
    .single()

  if (!match) notFound()

  const [{ data: homeRoster }, { data: awayRoster }] = await Promise.all([
    supabase.from('player_team_seasons').select('*, player:players(*)').eq('team_id', match.home_team_id).eq('season_id', match.season_id).order('jersey_number'),
    supabase.from('player_team_seasons').select('*, player:players(*)').eq('team_id', match.away_team_id).eq('season_id', match.season_id).order('jersey_number'),
  ])

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <Link href="/admin/matches" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          ← Utakmice
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-lg">Live unos rezultata</CardTitle>
        </CardHeader>
        <CardContent>
          <LiveScoreBoard
            initialMatch={match}
            homeRoster={homeRoster ?? []}
            awayRoster={awayRoster ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
