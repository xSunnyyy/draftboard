import { useEffect, useState } from 'react'
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  CopyIcon,
  PencilSimpleIcon,
  PlusIcon,
  TelevisionSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react'
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
  const [notice, setNotice] = useState<string | null>(null)

  const visible = drafts.filter((d) => d.archived === showArchived)
  const activeCount = drafts.filter((d) => !d.archived).length

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(id)
  }, [notice])

  function subtitle(): string {
    if (loading) return 'Loading your saved drafts…'
    if (showArchived) return visible.length === 0 ? 'Nothing archived.' : `${visible.length} archived draft${visible.length === 1 ? '' : 's'}.`
    if (activeCount === 0) return 'Your draft library is empty. Connect a Sleeper draft or start a manual mock.'
    return `${activeCount} draft${activeCount === 1 ? '' : 's'} in your library.`
  }

  return (
    <div className="library">
      <header className="library__header">
        <div>
          <h1 className="shell-title">Draft Night</h1>
          <p className="shell-subtitle">{subtitle()}</p>
        </div>
        <button className="btn btn--primary btn--large" onClick={onNew}>
          <PlusIcon weight="bold" size={18} />
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
          <button
            className="btn btn--danger-text"
            onClick={() => {
              onDeleteAllArchived()
              setNotice('Archived drafts deleted.')
            }}
            style={{ marginLeft: 'auto' }}
          >
            <TrashIcon weight="bold" size={16} />
            Delete all archived
          </button>
        )}
      </div>

      {notice && (
        <div className="notice">
          <span>{notice}</span>
          <button className="btn btn--text notice__dismiss" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <TelevisionSimpleIcon className="empty-state__icon" size={36} weight="thin" />
          <p className="muted">
            {showArchived ? 'No archived drafts.' : 'No drafts yet. Press New draft to connect Sleeper or start a manual mock.'}
          </p>
        </div>
      )}

      {loading && <p className="muted">Loading drafts…</p>}

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
                <span className={`tag tag--${draft.source}`}>
                  {draft.source === 'sleeper' ? 'Sleeper synced' : 'Manual'}
                </span>
                <span className="tag">{statusLabel(draft)}</span>
                <span className="muted">
                  {draft.settings.teamCount} teams · {draft.settings.rounds} rounds
                </span>
              </div>
            </div>
            <div className="draft-card__actions">
              <button
                className="btn btn--text"
                title="Rename"
                onClick={() => {
                  setRenamingId(draft.id)
                  setRenameValue(draft.name)
                }}
              >
                <PencilSimpleIcon size={17} />
              </button>
              <button
                className="btn btn--text"
                title="Duplicate"
                onClick={() => {
                  onDuplicate(draft.id)
                  setNotice(`"${draft.name}" duplicated.`)
                }}
              >
                <CopyIcon size={17} />
              </button>
              <button
                className="btn btn--text"
                title={draft.archived ? 'Unarchive' : 'Archive'}
                onClick={() => {
                  onArchive(draft.id, !draft.archived)
                  setNotice(draft.archived ? `"${draft.name}" restored to active.` : `"${draft.name}" archived.`)
                }}
              >
                {draft.archived ? <ArrowCounterClockwiseIcon size={17} /> : <ArchiveIcon size={17} />}
              </button>
              <button
                className="btn btn--danger-text"
                title="Delete"
                onClick={() => {
                  if (confirm(`Delete "${draft.name}" permanently?`)) {
                    onDelete(draft.id)
                    setNotice('Draft deleted from this browser.')
                  }
                }}
              >
                <TrashIcon size={17} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <footer className="library__footer">
        Drafts are saved in this browser only. Clearing your site data will remove them.
      </footer>
    </div>
  )
}
