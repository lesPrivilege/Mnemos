import { Component } from 'react'
import { S } from '../lib/strings'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: 32, textAlign: 'center',
          background: 'var(--bg)', color: 'var(--ink)',
          fontFamily: 'var(--font-zh)',
        }}>
          <div style={{ fontSize: 48, opacity: 0.3 }}>⚠</div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{S.error.boundaryTitle}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            {this.state.error.message}
          </div>
          <button onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 8, fontSize: 14,
              background: 'var(--ink)', color: 'var(--bg)', border: 0, cursor: 'pointer',
            }}>
            {S.error.reload}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
