import { teamLabel } from './draftEngine'
import type { Draft, DraftPick } from '../types'

export interface PickCallout {
  label: string
  tone: 'hype' | 'run' | 'warning'
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
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

const FIRST_GENERIC = [
  'FIRST {pos} OFF THE BOARD',
  'THE {pos} WAIT IS OVER',
  'AND THE {pos} POSITION IS OFFICIALLY LIVE',
  'SOMEONE FINALLY BLINKED — FIRST {pos} TAKEN',
]

const FIRST_BY_POSITION: Record<string, string[]> = {
  QB: [
    'FIRST QB OFF THE BOARD — THE QUARTERBACK CARNIVAL BEGINS',
    'QB1 COMES OFF THE BOARD',
    "SOMEONE'S BUILDING AROUND AN ARM — FIRST QB TAKEN",
  ],
  RB: [
    'FIRST RB OFF THE BOARD — THE SCRAMBLE STARTS NOW',
    'RUNNING BACKS ARE OFFICIALLY ENDANGERED — FIRST ONE GONE',
    'FIRST RB TAKEN — HANDCUFFS EVERYWHERE JUST GOT NERVOUS',
  ],
  WR: [
    'FIRST WR OFF THE BOARD — WIDE OPEN FOR BUSINESS',
    'WR1 IS OFF THE BOARD',
    'FIRST RECEIVER TAKEN — ROUTE TREES START SPROUTING',
  ],
  TE: [
    'FIRST TE OFF THE BOARD — THE TIGHT END PREMIUM CROWD CHEERS',
    'SOMEBODY TOOK A TIGHT END EARLY. BOLD.',
    'FIRST TE TAKEN — MISMATCH HUNTERS REJOICE',
  ],
  K: [
    'A KICKER?! FIRST ONE OFF THE BOARD ALREADY',
    'FIRST KICKER TAKEN — SOMEONE REALLY TRUSTS THAT LEG',
    'FIRST K SELECTED — BOLDEST PICK OF THE DRAFT SO FAR',
  ],
  DEF: [
    'FIRST DEFENSE COMES OFF THE BOARD',
    'A DEFENSE, THIS EARLY? FIRST ONE IS GONE',
    'FIRST DEF TAKEN — STREAMING TRUTHERS ARE FURIOUS',
  ],
}

const SECOND_TEMPLATES = [
  '2ND {pos} OFF THE BOARD',
  'BACK-TO-BACK {pos} ENERGY — THAT’S NUMBER TWO',
  'THE {pos} TRAIN HAS A SECOND PASSENGER',
  '{pos} NUMBER TWO IS OFF THE BOARD',
]

const THIRD_TEMPLATES = [
  '3RD {pos} TAKEN — NOW IT’S A TREND',
  "THAT'S THREE {pos}s GONE",
  '{pos} NUMBER THREE COMES OFF THE BOARD',
]

const RUN_TEMPLATES = [
  '{pos} RUN!',
  'IT’S A {pos} STAMPEDE',
  '{pos} RUN IN PROGRESS — HOLD ONTO YOUR RANKINGS',
  'THE {pos} DOMINOES ARE FALLING',
  'THREE STRAIGHT {pos}s — SOMEBODY START PANICKING',
]

const MILESTONE_TEMPLATES = [
  '{count} {pos} OFF THE BOARD — SOMEBODY IS SWEATING',
  '{count} {pos} SELECTED. AT THIS POINT IT’S A LIFESTYLE',
  '{count} {pos} GONE — IS THERE ANY LEFT?',
  '{count} {pos} TAKEN — THE RUN NEVER ENDS',
  '{count} {pos} OFF THE BOARD — SOMEONE NEEDS AN INTERVENTION',
  '{count} {pos} DRAFTED. BOLD STRATEGY — LET’S SEE IF IT PAYS OFF',
  '{count} {pos} GONE — THE DEPTH CHART IS GETTING THIN',
  '{count} {pos} OFF THE BOARD. THIS LEAGUE HAS COMMITMENT ISSUES',
]

// One team, drafting nothing but a single position with every pick they've made.
const TEAM_STACK_3 = [
  '{team} HAS GONE {pos}-{pos}-{pos} TO START. WE SEE YOU',
  '{team} IS THREE FOR THREE ON {pos}s',
  '{team} IS COMMITTING HARD TO {pos} EARLY',
]

const TEAM_STACK_4 = [
  '{team} MAKES IT FOUR STRAIGHT {pos}s. THIS IS A STRATEGY NOW',
  '{team} HAS NOT DRAFTED ANYTHING BUT {pos} YET',
  '{team} IS FOUR DEEP AT {pos} AND SHOWS NO SIGNS OF STOPPING',
]

const TEAM_STACK_5_RB = [
  '{team} GOES ALL IN ON THE ROBUST RB STRATEGY — FIVE STRAIGHT',
  '{team} HAS DRAFTED FIVE RUNNING BACKS AND NOTHING ELSE. RESPECT THE COMMITMENT',
  "{team}'S ENTIRE ROSTER IS RUNNING BACKS. THE ZERO-RB CROWD IS SCREAMING",
]

const TEAM_STACK_5_GENERIC = [
  '{team} HAS TAKEN {count} STRAIGHT {pos}s. ZERO REGRETS, APPARENTLY',
  '{team} IS BUILDING A {pos} MONOPOLY',
  "{team}'S DRAFT BOARD ONLY HAS ONE POSITION ON IT: {pos}",
  '{count} {pos}s IN A ROW FOR {team}. COMMITMENT LEVEL: MAXIMUM',
]

const TEAM_STACK_ESCALATING = [
  '{count} STRAIGHT {pos}s FOR {team}. THIS IS BEYOND A STRATEGY NOW',
  '{team} HAS NOW TAKEN {count} {pos}s WITH NO SIGNS OF STOPPING',
  '{count} {pos}s DEEP FOR {team} — SOMEONE CHECK ON THEM',
  '{team} REFUSES TO DRAFT ANYTHING BUT {pos}. RESPECT THE STUBBORNNESS',
]

function getTeamStackCallout(draft: Draft, pick: DraftPick): PickCallout | null {
  if (!pick.position) return null
  const teamPicks = draft.picks
    .filter((p) => p.slot === pick.slot && p.playerId && p.overallPick <= pick.overallPick)
    .sort((a, b) => a.overallPick - b.overallPick)

  if (teamPicks.length < 3) return null
  if (!teamPicks.every((p) => p.position === pick.position)) return null

  const count = teamPicks.length
  const pos = pick.position
  const team = teamLabel(draft, pick.slot)
  const vars = { team, pos, count: ordinal(count) }

  if (count === 3) return { label: fill(variant(TEAM_STACK_3, pick.overallPick), vars), tone: 'run' }
  if (count === 4) return { label: fill(variant(TEAM_STACK_4, pick.overallPick), vars), tone: 'run' }
  if (count === 5 && pos === 'RB') {
    return { label: fill(variant(TEAM_STACK_5_RB, pick.overallPick), vars), tone: 'warning' }
  }
  if (count === 5) return { label: fill(variant(TEAM_STACK_5_GENERIC, pick.overallPick), vars), tone: 'warning' }
  return { label: fill(variant(TEAM_STACK_ESCALATING, pick.overallPick), vars), tone: 'warning' }
}

export function getPickCallout(draft: Draft, pick: DraftPick): PickCallout | null {
  if (!pick.position) return null
  const pos = pick.position

  const teamStack = getTeamStackCallout(draft, pick)
  if (teamStack) return teamStack

  const filledSorted = draft.picks.filter((p) => p.playerId).sort((a, b) => a.overallPick - b.overallPick)
  const rankAtPosition = filledSorted.filter((p) => p.position === pos && p.overallPick <= pick.overallPick).length

  const pickIdx = filledSorted.findIndex((p) => p.overallPick === pick.overallPick)
  const lastThree = filledSorted.slice(Math.max(0, pickIdx - 2), pickIdx + 1)
  const isRun = lastThree.length === 3 && lastThree.every((p) => p.position === pos)

  if (isRun) {
    return { label: fill(variant(RUN_TEMPLATES, pick.overallPick), { pos }), tone: 'run' }
  }
  if (rankAtPosition === 1) {
    const pool = FIRST_BY_POSITION[pos] ?? FIRST_GENERIC
    return { label: fill(variant(pool, pick.overallPick), { pos }), tone: 'hype' }
  }
  if (rankAtPosition === 2) {
    return { label: fill(variant(SECOND_TEMPLATES, pick.overallPick), { pos }), tone: 'hype' }
  }
  if (rankAtPosition === 3) {
    return { label: fill(variant(THIRD_TEMPLATES, pick.overallPick), { pos }), tone: 'hype' }
  }
  if (rankAtPosition > 0 && rankAtPosition % 5 === 0) {
    const template = variant(MILESTONE_TEMPLATES, pick.overallPick)
    return { label: fill(template, { pos, count: ordinal(rankAtPosition) }), tone: 'warning' }
  }
  return null
}
