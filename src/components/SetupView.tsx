import { useState } from 'react'
import { ArrowLeftIcon, BroadcastIcon, PlugsConnectedIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { buildEmptyPicks } from '../lib/draftEngine'
import { resolveSleeperDraft } from '../lib/resolveSleeperDraft'
import type { Draft, DraftSettings, DraftSource, DraftType, ScoringFormat } from '../types'

interface Props {
  onCancel: () => void
  onCreate: (input: {
    name: string
    source: DraftSource
    sleeperDraftId: string | null
    sleeperLeagueId: string | null
    settings: DraftSettings
    picks: Draft['picks']
  }) => Promise<void>
}

function defaultSettings(): DraftSettings {
  return {
    teamCount: 10,
    teamNames: Array.from({ length: 10 }, (_, i) => `Team ${i + 1}`),
    draftType: 'snake',
    scoring: 'ppr',
    rounds: 15,
    timerSeconds: 60,
    season: String(new Date().getFullYear()),
  }
}

export function SetupView({ onCancel, onCreate }: Props) {
  const [source, setSource] = useState<DraftSource>('sleeper')
  const [name, setName] = useState('')
  const [sleeperInput, setSleeperInput] = useState('')
  const [settings, setSettings] = useState<DraftSettings>(defaultSettings())
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<{ draftId: string; leagueId: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateTeamCount(count: number) {
    setSettings((s) => {
      const names = Array.from({ length: count }, (_, i) => s.teamNames[i] || `Team ${i + 1}`)
      return { ...s, teamCount: count, teamNames: names }
    })
  }

  async function connectToSleeper() {
    const input = sleeperInput.trim()
    if (!input) {
      setConnectError('Enter a Sleeper draft ID or league ID first.')
      return
    }
    setConnecting(true)
    setConnectError(null)
    setResolved(null)
    try {
      const { draftId, leagueId, name: finalName, settings: finalSettings } = await resolveSleeperDraft(input, settings)
      const finalResolved = { draftId, leagueId }

      setSettings(finalSettings)
      setResolved(finalResolved)
      setName(finalName)

      // On a TV, typing the ID is the whole interaction — go straight to the
      // board the moment the connection succeeds instead of requiring a
      // second "Start draft" press.
      await createDraft(finalName, finalSettings, finalResolved)
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Could not read that Sleeper draft.')
    } finally {
      setConnecting(false)
    }
  }

  async function createDraft(
    finalName: string,
    finalSettings: DraftSettings,
    finalResolved: { draftId: string; leagueId: string | null } | null,
  ) {
    setSubmitting(true)
    try {
      const picks = buildEmptyPicks(finalSettings)
      await onCreate({
        name: finalName.trim() || 'Untitled draft',
        source,
        sleeperDraftId: source === 'sleeper' ? finalResolved?.draftId ?? null : null,
        sleeperLeagueId: source === 'sleeper' ? finalResolved?.leagueId ?? null : null,
        settings: finalSettings,
        picks,
      })
    } finally {
      setSubmitting(false)
    }
  }

  function submit() {
    return createDraft(name, settings, resolved)
  }

  const canSubmit = source === 'manual' || resolved !== null

  return (
    <div className="setup">
      <header className="setup__header">
        <button className="btn btn--text" onClick={onCancel}>
          <ArrowLeftIcon size={18} weight="bold" />
          Library
        </button>
        <h1 className="shell-title" style={{ fontSize: '2rem' }}>
          New draft
        </h1>
      </header>

      <div className="setup__source">
        <button
          className={`source-card ${source === 'sleeper' ? 'source-card--active' : ''}`}
          onClick={() => setSource('sleeper')}
        >
          <PlugsConnectedIcon className="source-card__icon" size={26} weight="duotone" />
          <div>
            <div className="source-card__title">Sync with Sleeper</div>
            <div className="source-card__desc">Live picks, polled every few seconds</div>
          </div>
        </button>
        <button
          className={`source-card ${source === 'manual' ? 'source-card--active' : ''}`}
          onClick={() => setSource('manual')}
        >
          <UsersThreeIcon className="source-card__icon" size={26} weight="duotone" />
          <div>
            <div className="source-card__title">Manual mock draft</div>
            <div className="source-card__desc">Run it entirely offline, by hand</div>
          </div>
        </button>
      </div>

      {source === 'sleeper' && (
        <section className="setup__section">
          <div className="setup__section-title">Connect</div>
          <label className="field">
            <span>Sleeper league ID or draft ID</span>
            <div className="field__row">
              <input
                value={sleeperInput}
                onChange={(e) => setSleeperInput(e.target.value)}
                placeholder="e.g. 987654321012345678"
                inputMode="numeric"
                onKeyDown={(e) => e.key === 'Enter' && connectToSleeper()}
              />
              <button className="btn btn--primary" onClick={connectToSleeper} disabled={connecting}>
                <BroadcastIcon size={17} weight="bold" />
                {connecting ? 'Contacting Sleeper…' : 'Connect'}
              </button>
            </div>
          </label>
          {connectError && <p className="error-text">{connectError}</p>}
          {resolved && <p className="success-text">Connected to Sleeper draft {resolved.draftId}.</p>}
        </section>
      )}

      <section className="setup__section">
        <div className="setup__section-title">Details</div>
        <label className="field">
          <span>Draft name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled draft" />
        </label>

        <div className="field-grid">
          <label className="field">
            <span>Teams</span>
            <input
              type="number"
              min={2}
              max={32}
              value={settings.teamCount}
              onChange={(e) => updateTeamCount(Number(e.target.value) || 2)}
              disabled={source === 'sleeper' && resolved !== null}
            />
          </label>
          <label className="field">
            <span>Rounds</span>
            <input
              type="number"
              min={1}
              max={40}
              value={settings.rounds}
              onChange={(e) => setSettings((s) => ({ ...s, rounds: Number(e.target.value) || 1 }))}
            />
          </label>
          <label className="field">
            <span>Draft type</span>
            <select
              value={settings.draftType}
              onChange={(e) => setSettings((s) => ({ ...s, draftType: e.target.value as DraftType }))}
            >
              <option value="snake">Snake</option>
              <option value="linear">Linear</option>
            </select>
          </label>
          <label className="field">
            <span>Scoring</span>
            <select
              value={settings.scoring}
              onChange={(e) => setSettings((s) => ({ ...s, scoring: e.target.value as ScoringFormat }))}
            >
              <option value="standard">Standard</option>
              <option value="half_ppr">Half-PPR</option>
              <option value="ppr">PPR</option>
            </select>
          </label>
          <label className="field">
            <span>Pick timer (seconds)</span>
            <input
              type="number"
              min={0}
              max={600}
              value={settings.timerSeconds}
              onChange={(e) => setSettings((s) => ({ ...s, timerSeconds: Number(e.target.value) || 0 }))}
            />
          </label>
          <label className="field">
            <span>Season</span>
            <input value={settings.season} onChange={(e) => setSettings((s) => ({ ...s, season: e.target.value }))} />
          </label>
        </div>

        <div className="field" style={{ marginTop: '1.1rem' }}>
          <span>Team names</span>
          <div className="team-name-grid">
            {settings.teamNames.map((teamName, i) => (
              <input
                key={i}
                value={teamName}
                onChange={(e) =>
                  setSettings((s) => {
                    const names = [...s.teamNames]
                    names[i] = e.target.value
                    return { ...s, teamNames: names }
                  })
                }
              />
            ))}
          </div>
        </div>
      </section>

      <footer className="setup__footer">
        <button className="btn btn--primary btn--large" onClick={submit} disabled={!canSubmit || submitting}>
          {submitting ? 'Starting…' : 'Start draft →'}
        </button>
      </footer>
    </div>
  )
}
