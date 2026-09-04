import type { SleeperConnectionStatus } from '../hooks/useSleeperSync'
import type { Draft } from '../types'

interface Props {
  draft: Draft
  connectionStatus: SleeperConnectionStatus | null
  syncError: string | null
  sleeperDraftStatus: string | null
}

function connectionLabel(status: SleeperConnectionStatus | null, error: string | null): string {
  switch (status) {
    case 'connecting':
      return 'Contacting Sleeper…'
    case 'connected':
      return 'Connected to Sleeper'
    case 'offline':
      return error || 'Sleeper sync offline'
    case 'error':
      return error || 'Sleeper request failed'
    default:
      return ''
  }
}

function draftStatusLabel(status: string | null): string {
  switch (status) {
    case 'pre_draft':
      return 'Draft has not started on Sleeper yet'
    case 'drafting':
      return 'Draft in progress on Sleeper'
    case 'paused':
      return 'Draft paused on Sleeper'
    case 'complete':
      return 'Draft complete on Sleeper'
    default:
      return ''
  }
}

export function StatusBar({ draft, connectionStatus, syncError, sleeperDraftStatus }: Props) {
  return (
    <div className="status-bar">
      <span className="status-bar__name">{draft.name}</span>
      {draft.source === 'sleeper' ? (
        <>
          <span className={`status-dot status-dot--${connectionStatus ?? 'idle'}`} />
          <span className="muted">{connectionLabel(connectionStatus, syncError)}</span>
          {sleeperDraftStatus && <span className="muted">· {draftStatusLabel(sleeperDraftStatus)}</span>}
        </>
      ) : (
        <span className="muted">Manual draft</span>
      )}
    </div>
  )
}
