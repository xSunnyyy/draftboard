import { useState } from 'react'
import { positionRgb } from '../lib/position'

interface Props {
  playerId: string | null
  position: string | null
  name: string | null
  size: number
  thumb?: boolean
}

export function PlayerAvatar({ playerId, position, name, size, thumb }: Props) {
  const [errored, setErrored] = useState(false)

  const initials = (name ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const style = {
    '--pc': positionRgb(position),
    width: size,
    height: size,
    fontSize: Math.round(size * 0.34),
  } as React.CSSProperties

  if (!playerId || errored) {
    return (
      <div className="player-avatar player-avatar--fallback" style={style}>
        {initials || position || '?'}
      </div>
    )
  }

  const src = `https://sleepercdn.com/content/nfl/players/${thumb ? 'thumb/' : ''}${playerId}.jpg`

  return (
    <img
      className="player-avatar"
      style={{ width: size, height: size }}
      src={src}
      alt={name ?? 'Player'}
      onError={() => setErrored(true)}
    />
  )
}
