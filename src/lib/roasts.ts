export interface TeamHistory {
  record: { wins: number; losses: number; ties: number } | null
  lastYearFirstPick: { playerName: string; position: string | null } | null
  avatarUrl: string | null
}

function variant<T>(pool: T[], seed: number): T {
  const idx = ((seed % pool.length) + pool.length) % pool.length
  return pool[idx]
}

function fill(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value)
  }
  return out
}

const RECORD_LOSING = [
  '{team} finished last season {w} and {l}. Confidence is not exactly high.',
  '{team} posted a {w} and {l} record last year. Hope springs eternal.',
  'Reminder, {team} went {w} and {l} last season. This is a bit of a redemption tour.',
  '{team} limped to a {w} and {l} finish last year. Let us see if drafting was ever really the problem.',
]

const RECORD_WINNING = [
  '{team} went {w} and {l} last season. Let us see if they remember how to win.',
  '{team} finished {w} and {l} last year. The pressure is on to repeat.',
  '{team} was actually good last season at {w} and {l}. No excuses this time.',
]

const RECORD_EVEN = [
  '{team} finished {w} and {l} last season. Perfectly, aggressively mediocre.',
  '{team} went {w} and {l} last year. Right down the middle, as always.',
]

const DRAFT_HISTORY = [
  'Last year, {team} opened the draft with {player}. Let us see if lightning strikes twice.',
  'Fun fact, {team} started last season with {player}.',
  '{team} took {player} with their very first pick last year. History may or may not repeat itself.',
  'For context, {player} was {team}\'s first pick a year ago.',
]

export function getRoastLine(teamName: string, history: TeamHistory | undefined, seed: number): string | null {
  if (!history) return null
  const candidates: string[] = []

  if (history.record) {
    const { wins, losses } = history.record
    const pool = wins > losses ? RECORD_WINNING : wins < losses ? RECORD_LOSING : RECORD_EVEN
    candidates.push(fill(variant(pool, seed), { team: teamName, w: String(wins), l: String(losses) }))
  }

  if (history.lastYearFirstPick) {
    candidates.push(
      fill(variant(DRAFT_HISTORY, seed + 1), { team: teamName, player: history.lastYearFirstPick.playerName }),
    )
  }

  if (candidates.length === 0) return null
  return variant(candidates, seed)
}
