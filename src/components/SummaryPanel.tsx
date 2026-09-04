import { rosterShapeByTeam } from '../lib/draftEngine'
import type { Draft } from '../types'

interface Props {
  draft: Draft
  onClose: () => void
  onExportCsv: () => void
}

export function SummaryPanel({ draft, onClose, onExportCsv }: Props) {
  const rows = rosterShapeByTeam(draft)
  const positions = Array.from(new Set(rows.flatMap((r) => Object.keys(r.counts)))).sort()
  const totalPicks = draft.picks.filter((p) => p.playerId !== null).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h2>Draft summary</h2>
        <p className="muted">
          {totalPicks} of {draft.picks.length} picks made
        </p>

        <div className="table-scroll">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Team</th>
                {positions.map((pos) => (
                  <th key={pos}>{pos}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slot}>
                  <td>{row.teamName}</td>
                  {positions.map((pos) => (
                    <td key={pos}>{row.counts[pos] || 0}</td>
                  ))}
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onExportCsv}>
            Download results as CSV
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
