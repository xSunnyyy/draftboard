import { useState } from 'react'
import type { Draft } from '../types'

interface Props {
  drafts: Draft[]
  loading: boolean
  onOpen: (id: string) => void
  onNew: () => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
  onDeleteAllArchived: () => void
}

function statusLabel(draft: Draft): string {
  if (draft.status === 'complete') return 'Complete'
  if (draft.status === 'paused') return 'Paused'
  if (draft.status === 'active') return 'In progress'
  return 'Setup'
}

export function LibraryView({
  drafts,
  loading,
  onOpen,
  onNew,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
  onDeleteAllArchived,
}: Props) {
  const [showArchived, setShowArchived] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const visible = drafts.filter((d) => d.archived === showArchived)

  return (
    <div className="library">
      <header className="library__header">
        <h1>Draft Library</h1>
        <button className="btn btn--primary" onClick={onNew}>
          New draft
        </button>
      </header>

      <div className="library__tabs">
        <button
          className={`tab ${!showArchived ? 'tab--active' : ''}`}
          onClick={() => setShowArchived(false)}
        >
          Active
        </button>
        <button
          className={`tab ${showArchived ? 'tab--active' : ''}`}
          onClick={() => setShowArchived(true)}
        >
          Archived
        </button>
        {showArchived && visible.length > 0 && (
          <button className="btn btn--ghost btn--danger" onClick={onDeleteAllArchived}>
            Delete all archived
          </button>
        )}
      </div>

      {loading && <p className="muted">Loading drafts…</p>}

      {!loading && visible.length === 0 && (
        <p className="muted">
          {showArchived ? 'No archived drafts.' : 'No drafts yet. Create one to get started.'}
        </p>
      )}

      <ul className="draft-list">
        {visible.map((draft) => (
          <li key={draft.id} className="draft-card">
            <div className="draft-card__main" onClick={() => onOpen(draft.id)}>
              {renamingId === draft.id ? (
                <input
                  autoFocus
                  className="draft-card__rename"
                  value={renameValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRename(draft.id, renameValue.trim() || draft.name)
                      setRenamingId(null)
                    }
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onBlur={() => setRenamingId(null)}
                />
              ) : (
                <div className="draft-card__title">{draft.name}</div>
              )}
              <div className="draft-card__meta">
                <span className={`badge badge--${draft.source}`}>
                  {draft.source === 'sleeper' ? 'Sleeper synced' : 'Manual'}
                </span>
                <span className="badge">{statusLabel(draft)}</span>
                <span className="muted">
                  {draft.settings.teamCount} teams · {draft.settings.rounds} rounds
                </span>
              </div>
            </div>
            <div className="draft-card__actions">
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setRenamingId(draft.id)
                  setRenameValue(draft.name)
                }}
              >
                Rename
              </button>
              <button className="btn btn--ghost" onClick={() => onDuplicate(draft.id)}>
                Duplicate
              </button>
              <button className="btn btn--ghost" onClick={() => onArchive(draft.id, !draft.archived)}>
                {draft.archived ? 'Unarchive' : 'Archive'}
              </button>
              <button
                className="btn btn--ghost btn--danger"
                onClick={() => {
                  if (confirm(`Delete "${draft.name}" permanently?`)) onDelete(draft.id)
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
