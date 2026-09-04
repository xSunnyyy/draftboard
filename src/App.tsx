import { useState } from 'react'
import { useDrafts } from './hooks/useDrafts'
import { usePlayers } from './hooks/usePlayers'
import { LibraryView } from './components/LibraryView'
import { SetupView } from './components/SetupView'
import { BoardView } from './components/BoardView'
import type { Draft } from './types'

type View = { name: 'library' } | { name: 'setup' } | { name: 'board'; draftId: string }

export default function App() {
  const { drafts, loading, create, update, duplicate, setArchived, rename, remove, removeAllArchived } = useDrafts()
  const playerPool = usePlayers()
  const [view, setView] = useState<View>({ name: 'library' })

  const activeDraft = view.name === 'board' ? drafts.find((d) => d.id === view.draftId) ?? null : null

  function handleUpdate(next: Draft) {
    void update(next)
  }

  return (
    <div className="app">
      {view.name === 'library' && (
        <LibraryView
          drafts={drafts}
          loading={loading}
          onOpen={(id) => setView({ name: 'board', draftId: id })}
          onNew={() => setView({ name: 'setup' })}
          onRename={(id, name) => void rename(id, name)}
          onDuplicate={(id) => void duplicate(id)}
          onArchive={(id, archived) => void setArchived(id, archived)}
          onDelete={(id) => void remove(id)}
          onDeleteAllArchived={() => void removeAllArchived()}
        />
      )}

      {view.name === 'setup' && (
        <SetupView
          onCancel={() => setView({ name: 'library' })}
          onCreate={async (input) => {
            const draft = await create(input)
            setView({ name: 'board', draftId: draft.id })
          }}
        />
      )}

      {view.name === 'board' && activeDraft && (
        <BoardView
          draft={activeDraft}
          players={playerPool.players}
          onUpdate={handleUpdate}
          onBack={() => setView({ name: 'library' })}
        />
      )}

      {view.name === 'board' && !activeDraft && !loading && (
        <div className="app__missing">
          <p>That draft could not be found.</p>
          <button className="btn btn--primary" onClick={() => setView({ name: 'library' })}>
            Back to library
          </button>
        </div>
      )}

      {playerPool.error && (
        <div className="toast toast--error">
          {playerPool.error}
          <button className="btn btn--ghost" onClick={() => void playerPool.refresh()}>
            Refresh Sleeper players
          </button>
        </div>
      )}
    </div>
  )
}
