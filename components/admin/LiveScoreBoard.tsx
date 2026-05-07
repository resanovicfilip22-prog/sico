'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Match } from '@/lib/supabase/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function LiveScoreBoard({ initialMatch }: { initialMatch: Match }) {
  const [match, setMatch] = useState(initialMatch)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`live-match-${match.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
        (payload) => setMatch(prev => ({ ...prev, ...payload.new }))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [match.id])

  const addPoints = async (team: 'home' | 'away', delta: number) => {
    const field = team === 'home' ? 'home_score' : 'away_score'
    const current = (team === 'home' ? match.home_score : match.away_score) ?? 0
    const next = Math.max(0, current + delta)
    setMatch(prev => ({ ...prev, [field]: next }))
    setSaving(true)
    await supabase.from('matches').update({ [field]: next }).eq('id', match.id)
    setSaving(false)
  }

  const finish = async () => {
    if (!confirm(`Završiti utakmicu? Rezultat: ${match.home_team?.name} ${match.home_score ?? 0} – ${match.away_score ?? 0} ${match.away_team?.name}`)) return
    setSaving(true)
    await supabase.from('matches').update({ status: 'finished' }).eq('id', match.id)
    setSaving(false)
    router.push(`/admin/matches/${match.id}/stats`)
  }

  const homeScore = match.home_score ?? 0
  const awayScore = match.away_score ?? 0
  const isFinished = match.status === 'finished'

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <Badge variant={isFinished ? 'secondary' : 'default'} className={isFinished ? '' : 'bg-red-500 text-white animate-pulse'}>
          {isFinished ? 'Završeno' : '● UŽIVO'}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {match.round?.name}{match.is_playoff ? ' · Playoff' : ''}
          {saving && <span className="ml-2 text-xs">Sprema...</span>}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
        <div className="text-center space-y-5">
          <p className="text-lg font-bold leading-tight">{match.home_team?.name}</p>
          <p className="text-8xl font-bold tabular-nums">{homeScore}</p>
          {!isFinished && (
            <div className="flex justify-center flex-wrap gap-2">
              {[1, 2, 3].map(pts => (
                <Button key={pts} variant="outline" onClick={() => addPoints('home', pts)} disabled={saving} className="w-12">
                  +{pts}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => addPoints('home', -1)} disabled={saving || homeScore === 0} className="w-12 text-muted-foreground">
                −1
              </Button>
            </div>
          )}
        </div>

        <div className="text-5xl font-bold text-muted-foreground select-none">—</div>

        <div className="text-center space-y-5">
          <p className="text-lg font-bold leading-tight">{match.away_team?.name}</p>
          <p className="text-8xl font-bold tabular-nums">{awayScore}</p>
          {!isFinished && (
            <div className="flex justify-center flex-wrap gap-2">
              {[1, 2, 3].map(pts => (
                <Button key={pts} variant="outline" onClick={() => addPoints('away', pts)} disabled={saving} className="w-12">
                  +{pts}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => addPoints('away', -1)} disabled={saving || awayScore === 0} className="w-12 text-muted-foreground">
                −1
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-4 border-t">
        {isFinished ? (
          <Link href={`/admin/matches/${match.id}/stats`} className={cn(buttonVariants())}>
            Unesi statistiku →
          </Link>
        ) : (
          <Button onClick={finish} disabled={saving} variant="default" size="lg">
            Završi utakmicu
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Rezultat se ažurira u realnom vremenu za sve koji imaju otvorenu ovu stranicu.
        </p>
      </div>
    </div>
  )
}
