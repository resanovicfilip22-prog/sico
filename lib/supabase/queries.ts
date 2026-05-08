import { SupabaseClient } from '@supabase/supabase-js'
import { PlayerSeasonAverages, StandingsRow } from './types'

export async function getSeasons(supabase: SupabaseClient) {
  return supabase
    .from('seasons')
    .select('*')
    .order('year_start', { ascending: false })
}

export async function getActiveSeason(supabase: SupabaseClient) {
  return supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true)
    .single()
}

export async function getSeasonTeams(supabase: SupabaseClient, seasonId: string) {
  return supabase
    .from('season_teams')
    .select('*, team:teams(*)')
    .eq('season_id', seasonId)
}

export async function getTeams(supabase: SupabaseClient) {
  return supabase.from('teams').select('*').order('name')
}

export async function getPlayers(supabase: SupabaseClient) {
  return supabase
    .from('players')
    .select('*')
    .order('last_name')
}

export async function getSeasonRoster(supabase: SupabaseClient, seasonId: string) {
  return supabase
    .from('player_team_seasons')
    .select('*, player:players(*), team:teams(*)')
    .eq('season_id', seasonId)
}

export async function getRounds(supabase: SupabaseClient, seasonId: string) {
  return supabase
    .from('rounds')
    .select('*')
    .eq('season_id', seasonId)
    .order('round_number')
}

export async function getMatches(supabase: SupabaseClient, seasonId: string) {
  return supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), round:rounds(*)')
    .eq('season_id', seasonId)
    .order('match_date', { ascending: true, nullsFirst: false })
}

export async function getMatchWithStats(supabase: SupabaseClient, matchId: string) {
  const [match, stats] = await Promise.all([
    supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), round:rounds(*)')
      .eq('id', matchId)
      .single(),
    supabase
      .from('player_match_stats_computed')
      .select('*, player:players(*), team:teams(*)')
      .eq('match_id', matchId),
  ])
  return { match, stats }
}

export async function getPlayoffSeries(supabase: SupabaseClient, seasonId: string) {
  return supabase
    .from('playoff_series')
    .select('*, team1:teams!team1_id(*), team2:teams!team2_id(*), winner:teams!winner_id(*)')
    .eq('season_id', seasonId)
    .order('round')
    .order('position')
}

export async function computeStandings(supabase: SupabaseClient, seasonId: string): Promise<StandingsRow[]> {
  const { data: matches } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
    .eq('season_id', seasonId)
    .eq('status', 'finished')
    .eq('is_playoff', false)

  if (!matches) return []

  const map = new Map<string, StandingsRow>()

  const ensure = (team: { id: string; name: string; short_name: string; created_at: string }) => {
    if (!map.has(team.id)) {
      map.set(team.id, {
        team_id: team.id,
        team,
        played: 0,
        wins: 0,
        losses: 0,
        points_for: 0,
        points_against: 0,
        point_diff: 0,
        win_pct: 0,
      })
    }
    return map.get(team.id)!
  }

  for (const m of matches) {
    if (m.home_score == null || m.away_score == null) continue
    if (!m.home_team || !m.away_team) continue
    const home = ensure(m.home_team)
    const away = ensure(m.away_team)

    home.played++
    away.played++
    home.points_for += m.home_score
    home.points_against += m.away_score
    away.points_for += m.away_score
    away.points_against += m.home_score

    if (m.home_score > m.away_score) {
      home.wins++
      away.losses++
    } else {
      away.wins++
      home.losses++
    }
  }

  const rows = Array.from(map.values()).map(r => ({
    ...r,
    point_diff: r.points_for - r.points_against,
    win_pct: r.played > 0 ? r.wins / r.played : 0,
  }))

  rows.sort((a, b) => b.wins - a.wins || b.point_diff - a.point_diff)
  return rows
}

export async function computePlayerAverages(
  supabase: SupabaseClient,
  seasonId: string,
  isPlayoff = false
): Promise<PlayerSeasonAverages[]> {
  const { data: matches } = await supabase
    .from('matches')
    .select('id')
    .eq('season_id', seasonId)
    .eq('status', 'finished')
    .eq('is_playoff', isPlayoff)

  if (!matches || matches.length === 0) return []

  const matchIds = matches.map(m => m.id)

  const { data: stats } = await supabase
    .from('player_match_stats_computed')
    .select('*, player:players(*), team:teams(*)')
    .in('match_id', matchIds)

  if (!stats) return []

  const map = new Map<string, {
    player: PlayerSeasonAverages['player']
    team: PlayerSeasonAverages['team']
    games: number
    pts: number
    reb: number
    ast: number
    stl: number
    blk: number
    tov: number
    min: number
    val: number
    fgm: number; fga: number
    twom: number; twoa: number
    threem: number; threea: number
    ftm: number; fta: number
  }>()

  for (const s of stats) {
    const pid = s.player_id
    if (!map.has(pid)) {
      map.set(pid, {
        player: s.player,
        team: s.team,
        games: 0,
        pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, min: 0, val: 0,
        fgm: 0, fga: 0, twom: 0, twoa: 0, threem: 0, threea: 0, ftm: 0, fta: 0,
      })
    }
    const r = map.get(pid)!
    r.games++
    r.pts += s.points ?? 0
    r.reb += s.total_rebounds ?? 0
    r.ast += s.assists
    r.stl += s.steals
    r.blk += s.blocks
    r.tov += s.turnovers
    r.min += s.minutes
    r.val += s.val ?? 0
    r.fgm += s.two_pt_made + s.three_pt_made
    r.fga += s.two_pt_attempted + s.three_pt_attempted
    r.twom += s.two_pt_made
    r.twoa += s.two_pt_attempted
    r.threem += s.three_pt_made
    r.threea += s.three_pt_attempted
    r.ftm += s.ft_made
    r.fta += s.ft_attempted
  }

  const avg = (total: number, games: number) => Math.round((total / games) * 10) / 10
  const pct = (made: number, att: number) => att > 0 ? Math.round(made / att * 1000) / 10 : null

  return Array.from(map.entries()).map(([player_id, r]) => ({
    player_id,
    player: r.player,
    team: r.team,
    games: r.games,
    avg_points: avg(r.pts, r.games),
    avg_rebounds: avg(r.reb, r.games),
    avg_assists: avg(r.ast, r.games),
    avg_steals: avg(r.stl, r.games),
    avg_blocks: avg(r.blk, r.games),
    avg_turnovers: avg(r.tov, r.games),
    avg_minutes: avg(r.min, r.games),
    avg_val: avg(r.val, r.games),
    fg_pct: pct(r.fgm, r.fga),
    two_pt_pct: pct(r.twom, r.twoa),
    three_pt_pct: pct(r.threem, r.threea),
    ft_pct: pct(r.ftm, r.fta),
    total_points: r.pts,
    total_rebounds: r.reb,
    total_assists: r.ast,
  }))
}
