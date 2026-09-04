import { useCallback, useEffect, useState } from 'react'
import * as db from '../lib/db'
import { newId } from '../lib/id'
import type { Draft, DraftSettings } from '../types'

function emptyClock(): Draft['clock'] {
  return { status: 'stopped', deadline: null, remainingWhenPaused: null }
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const all = await db.listDrafts()
    setDrafts(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const create = useCallback(
    async (input: {
      name: string
      source: Draft['source']
      sleeperDraftId: string | null
      sleeperLeagueId: string | null
      settings: DraftSettings
      picks: Draft['picks']
    }): Promise<Draft> => {
      const now = Date.now()
      const draft: Draft = {
        id: newId(),
        name: input.name,
        source: input.source,
        sleeperDraftId: input.sleeperDraftId,
        sleeperLeagueId: input.sleeperLeagueId,
        status: 'active',
        archived: false,
        allowEditsWhenComplete: false,
        settings: input.settings,
        picks: input.picks,
        clock: emptyClock(),
        createdAt: now,
        updatedAt: now,
      }
      await db.saveDraft(draft)
      await reload()
      return draft
    },
    [reload],
  )

  const update = useCallback(async (draft: Draft) => {
    const next = { ...draft, updatedAt: Date.now() }
    await db.saveDraft(next)
    setDrafts((prev) => {
      const others = prev.filter((d) => d.id !== next.id)
      return [next, ...others].sort((a, b) => b.updatedAt - a.updatedAt)
    })
    return next
  }, [])

  const duplicate = useCallback(
    async (id: string) => {
      const source = await db.getDraft(id)
      if (!source) return
      const now = Date.now()
      const copy: Draft = {
        ...source,
        id: newId(),
        name: `${source.name} (copy)`,
        createdAt: now,
        updatedAt: now,
      }
      await db.saveDraft(copy)
      await reload()
      return copy
    },
    [reload],
  )

  const setArchived = useCallback(
    async (id: string, archived: boolean) => {
      const draft = await db.getDraft(id)
      if (!draft) return
      await db.saveDraft({ ...draft, archived, updatedAt: Date.now() })
      await reload()
    },
    [reload],
  )

  const rename = useCallback(
    async (id: string, name: string) => {
      const draft = await db.getDraft(id)
      if (!draft) return
      await db.saveDraft({ ...draft, name, updatedAt: Date.now() })
      await reload()
    },
    [reload],
  )

  const remove = useCallback(
    async (id: string) => {
      await db.deleteDraft(id)
      await reload()
    },
    [reload],
  )

  const removeAllArchived = useCallback(async () => {
    const archived = drafts.filter((d) => d.archived)
    await Promise.all(archived.map((d) => db.deleteDraft(d.id)))
    await reload()
  }, [drafts, reload])

  return { drafts, loading, create, update, duplicate, setArchived, rename, remove, removeAllArchived, reload }
}
