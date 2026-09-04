export type ScoringFormat = 'standard' | 'half_ppr' | 'ppr'
export type DraftType = 'snake' | 'linear'
export type DraftSource = 'sleeper' | 'manual'
export type DraftStatus = 'setup' | 'active' | 'paused' | 'complete'

export interface DraftSettings {
  teamCount: number
  teamNames: string[]
  draftType: DraftType
  scoring: ScoringFormat
  rounds: number
  timerSeconds: number
  season: string
  /** 1-based slot index this device/user occupies, purely informational */
  mySlot?: number
}

export interface DraftPick {
  overallPick: number
  round: number
  pickInRound: number
  /** 1-based team slot in draft order */
  slot: number
  playerId: string | null
  playerName: string | null
  position: string | null
  nflTeam: string | null
  pickedAt: number | null
  isManualEdit: boolean
}

export interface ClockState {
  status: 'stopped' | 'running' | 'paused'
  /** epoch ms the current pick's timer would expire, when running */
  deadline: number | null
  /** seconds remaining, captured when paused */
  remainingWhenPaused: number | null
}

export interface Draft {
  id: string
  name: string
  source: DraftSource
  sleeperDraftId: string | null
  sleeperLeagueId: string | null
  status: DraftStatus
  archived: boolean
  allowEditsWhenComplete: boolean
  settings: DraftSettings
  picks: DraftPick[]
  clock: ClockState
  createdAt: number
  updatedAt: number
}

export interface SleeperPlayer {
  player_id: string
  first_name: string
  last_name: string
  position: string | null
  team: string | null
  search_rank: number | null
  status: string | null
  fantasy_positions: string[] | null
}

export interface SleeperUser {
  user_id: string
  display_name: string
  metadata?: { team_name?: string }
}

export interface SleeperDraftPick {
  pick_no: number
  round: number
  draft_slot: number
  roster_id: number | null
  player_id: string
  picked_by: string
  is_keeper: boolean | null
  metadata?: {
    first_name?: string
    last_name?: string
    position?: string
    team?: string
  }
}

export interface SleeperDraft {
  draft_id: string
  status: 'pre_draft' | 'drafting' | 'paused' | 'complete'
  type: string
  season: string
  sport: string
  league_id: string | null
  start_time: number | null
  settings: {
    teams: number
    rounds: number
    pick_timer: number
  }
  draft_order: Record<string, number> | null
  slot_to_roster_id: Record<string, number> | null
  metadata?: { name?: string }
}

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  total_rosters: number
  draft_id: string | null
}
