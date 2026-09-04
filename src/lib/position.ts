const POSITION_RGB: Record<string, string> = {
  QB: '224 120 90',
  RB: '116 178 90',
  WR: '79 159 217',
  TE: '185 139 224',
  K: '156 145 127',
  DEF: '79 179 160',
}

const FALLBACK_RGB = '168 157 141'

export function positionRgb(position: string | null | undefined): string {
  if (!position) return FALLBACK_RGB
  return POSITION_RGB[position] ?? FALLBACK_RGB
}

const POSITION_SPOKEN: Record<string, string> = {
  QB: 'quarterback',
  RB: 'running back',
  WR: 'wide receiver',
  TE: 'tight end',
  K: 'kicker',
  DEF: 'defense',
}

export function positionSpokenName(position: string | null | undefined): string {
  if (!position) return ''
  return POSITION_SPOKEN[position] ?? position
}
