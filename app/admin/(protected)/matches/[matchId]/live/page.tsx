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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/matches" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          ← Utakmice
        </Link>
      </div>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-lg">Live unos rezultata</CardTitle>
        </CardHeader>
        <CardContent>
          <LiveScoreBoard initialMatch={match} />
        </CardContent>
      </Card>
    </div>
  )
}
