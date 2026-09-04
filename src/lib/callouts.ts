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

export function getPickCallout(draft: Draft, pick: DraftPick): PickCallout | null {
  if (!pick.position) return null

  const filledSorted = draft.picks.filter((p) => p.playerId).sort((a, b) => a.overallPick - b.overallPick)
  const rankAtPosition = filledSorted.filter((p) => p.position === pick.position && p.overallPick <= pick.overallPick).length

  const pickIdx = filledSorted.findIndex((p) => p.overallPick === pick.overallPick)
  const lastThree = filledSorted.slice(Math.max(0, pickIdx - 2), pickIdx + 1)
  const isRun = lastThree.length === 3 && lastThree.every((p) => p.position === pick.position)

  if (isRun) return { label: `${pick.position} RUN`, tone: 'run' }
  if (rankAtPosition === 1) return { label: `FIRST ${pick.position} OFF THE BOARD`, tone: 'hype' }
  if (rankAtPosition === 2) return { label: `2ND ${pick.position} COMES OFF THE BOARD`, tone: 'hype' }
  if (rankAtPosition === 3) return { label: `3RD ${pick.position} TAKEN`, tone: 'hype' }
  if (rankAtPosition > 0 && rankAtPosition % 5 === 0) {
    return { label: `OH NO — ${ordinal(rankAtPosition)} ${pick.position} SELECTED`, tone: 'warning' }
  }
  return null
}
