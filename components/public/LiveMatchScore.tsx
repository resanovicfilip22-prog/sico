'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Match } from '@/lib/supabase/types'

export default function LiveMatchScore({ initialMatch }: { initialMatch: Match }) {
  const [match, setMatch] = useState(initialMatch)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`public-match-${match.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
        (payload) => {
          const wasLive = match.status !== 'finished'
          setMatch(prev => ({ ...prev, ...payload.new }))
          if (payload.new.status === 'finished' && wasLive) {
            router.refresh()
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [match.id])

  const isLive = match.status !== 'finished' && match.home_score != null

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <Link href={`/teams/${match.home_team_id}`} className="text-2xl font-bold hover:underline">
        {match.home_team?.name}
      </Link>

      {match.status === 'finished' ? (
        <span className="text-4xl font-bold tabular-nums">
          {match.home_score} – {match.away_score}
        </span>
      ) : isLive ? (
        <div className="flex items-center gap-3">
          <span className="text-4xl font-bold tabular-nums">
            {match.home_score} – {match.away_score}
          </span>
          <Badge className="bg-red-500 text-white animate-pulse text-sm px-2">● UŽIVO</Badge>
        </div>
      ) : (
        <Badge variant="outline" className="text-lg px-3 py-1">Zakazano</Badge>
      )}

      <Link href={`/teams/${match.away_team_id}`} className="text-2xl font-bold hover:underline">
        {match.away_team?.name}
      </Link>
    </div>
  )
}
