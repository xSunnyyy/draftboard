import { ArrowLeftIcon } from '@phosphor-icons/react'
import type { SleeperConnectionStatus } from '../hooks/useSleeperSync'
import type { Draft } from '../types'

interface Props {
  draft: Draft
  connectionStatus: SleeperConnectionStatus
  connectionError: string | null
  onBack: () => void
}

function connectionLabel(status: SleeperConnectionStatus, error: string | null): string {
  switch (status) {
    case 'connecting':
      return 'Contacting Sleeper…'
    case 'connected':
      return 'Connected — waiting for the commissioner to start the draft'
    case 'offline':
    case 'error':
      return error || 'Sleeper sync offline'
    default:
      return 'Connecting…'
  }
}

export function WaitingForDraft({ draft, connectionStatus, connectionError, onBack }: Props) {
  return (
    <div className="waiting">
      <button className="btn btn--text waiting__back" onClick={onBack}>
        <ArrowLeftIcon size={16} weight="bold" />
        Library
      </button>
      <div className="waiting__body">
        <span className={`status-dot status-dot--${connectionStatus}`} />
        <div className="waiting__eyebrow">Draft Night</div>
        <h1 className="waiting__title">{draft.name}</h1>
        <p className="waiting__sub">{connectionLabel(connectionStatus, connectionError)}</p>
        <div className="waiting__meta">
          {draft.settings.teamCount} teams · {draft.settings.rounds} rounds ·{' '}
          {draft.settings.draftType === 'snake' ? 'Snake' : 'Linear'}
        </div>
        <div className="waiting__hint">This screen will switch to the live board automatically.</div>
      </div>
    </div>
  )
}
