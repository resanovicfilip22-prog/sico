export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C' | 'N/A'
export type MatchStatus = 'scheduled' | 'finished'

export interface Season {
  id: string
  name: string
  year_start: number
  year_end: number
  is_active: boolean
  playoff_teams_count: number
  created_at: string
}

export interface Team {
  id: string
  name: string
  short_name: string
  created_at: string
}

export interface SeasonTeam {
  id: string
  season_id: string
  team_id: string
  team?: Team
}

export interface Player {
  id: string
  first_name: string
  last_name: string
  birth_year: number | null
  position: Position | null
  created_at: string
}

export interface PlayerTeamSeason {
  id: string
  player_id: string
  team_id: string
  season_id: string
  jersey_number: number | null
  player?: Player
  team?: Team
  season?: Season
}

export interface Round {
  id: string
  season_id: string
  round_number: number
  name: string
  is_playoff: boolean
  playoff_round: number | null
  created_at: string
}

export interface PlayoffSeries {
  id: string
  season_id: string
  round: number
  position: number
  team1_id: string | null
  team2_id: string | null
  team1_wins: number
  team2_wins: number
  winner_id: string | null
  created_at: string
  team1?: Team
  team2?: Team
  winner?: Team
}

export interface Match {
  id: string
  season_id: string
  round_id: string
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
  match_date: string | null
  status: MatchStatus
  is_playoff: boolean
  playoff_series_id: string | null
  playoff_game_number: number | null
  created_at: string
  home_team?: Team
  away_team?: Team
  round?: Round
  playoff_series?: PlayoffSeries
}

export interface PlayerMatchStats {
  id: string
  match_id: string
  player_id: string
  team_id: string
  minutes: number
  two_pt_made: number
  two_pt_attempted: number
  three_pt_made: number
  three_pt_attempted: number
  ft_made: number
  ft_attempted: number
  off_rebounds: number
  def_rebounds: number
  assists: number
  turnovers: number
  steals: number
  blocks: number
  fouls: number
  plus_minus: number
  player?: Player
  team?: Team
}

export interface PlayerMatchStatsComputed extends PlayerMatchStats {
  points: number
  total_rebounds: number
  val: number
  two_pt_pct: number | null
  three_pt_pct: number | null
  ft_pct: number | null
  fg_pct: number | null
}

export interface PlayerSeasonAverages {
  player_id: string
  player?: Player
  team?: Team
  games: number
  avg_points: number
  avg_rebounds: number
  avg_assists: number
  avg_steals: number
  avg_blocks: number
  avg_turnovers: number
  avg_minutes: number
  avg_val: number
  fg_pct: number | null
  two_pt_pct: number | null
  three_pt_pct: number | null
  ft_pct: number | null
  total_points: number
  total_rebounds: number
  total_assists: number
}

export interface StandingsRow {
  team_id: string
  team: Team
  played: number
  wins: number
  losses: number
  points_for: number
  points_against: number
  point_diff: number
  win_pct: number
}
