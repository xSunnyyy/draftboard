import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in draft board:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <div className="crash__body">
            <div className="crash__eyebrow">Draft Night</div>
            <h1 className="crash__title">Something went wrong</h1>
            <p className="crash__sub">
              The board hit an unexpected error. Reloading usually fixes it — your draft data is saved
              locally and won&apos;t be lost.
            </p>
            <button className="btn btn--primary btn--large" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
