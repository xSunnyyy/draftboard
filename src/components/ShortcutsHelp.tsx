interface Props {
  onClose: () => void
}

const SHORTCUTS: [string, string][] = [
  ['/', 'Focus the player search'],
  ['↑ / ↓', 'Move highlighted player'],
  ['Enter', 'Draft the highlighted player'],
  ['Esc', 'Clear search or close a dialog'],
  ['T', 'Toggle TV mode'],
  ['F', 'Toggle browser fullscreen'],
  ['Ctrl/Cmd + Z', 'Undo last pick'],
  ['?', 'Toggle this help'],
]

export function ShortcutsHelp({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard shortcuts</h2>
        <table className="shortcuts-table">
          <tbody>
            {SHORTCUTS.map(([key, desc]) => (
              <tr key={key}>
                <td>
                  <kbd>{key}</kbd>
                </td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
