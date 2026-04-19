import React from 'react';

/**
 * ErrorBoundary — wraps the entire app to catch uncaught React errors.
 * Shows a friendly recovery screen instead of a blank white page.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AgentFoot] Uncaught error:', error, errorInfo?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      // Optionally preserve save if we can't determine the cause
      this.setState({ hasError: false, error: null });
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const errMsg = this.state.error
      ? (this.state.error.message ?? String(this.state.error))
      : 'Erreur inconnue';

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg,#f7f9fb,#eef2f5)',
        padding: '24px 20px',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        color: '#172026',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16, textAlign: 'center' }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px', textAlign: 'center', lineHeight: 1.2 }}>
          Oups, quelque chose a planté
        </h1>
        <p style={{ fontSize: 14, color: '#64727d', textAlign: 'center', lineHeight: 1.6, maxWidth: 340, margin: '0 0 24px' }}>
          Ton agence est sauvegardée automatiquement. Recharge la page pour reprendre exactement où tu en étais.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            background: 'linear-gradient(135deg,#00a676,#0dba8a)',
            color: '#ffffff',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: '.08em',
            cursor: 'pointer',
            marginBottom: 12,
            width: '100%',
            maxWidth: 300,
          }}
        >
          🔄 Recharger le jeu
        </button>
        <button
          onClick={this.handleReset}
          style={{
            background: '#f7f9fb',
            color: '#64727d',
            border: '1px solid #d6dde3',
            padding: '10px 24px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            width: '100%',
            maxWidth: 300,
          }}
        >
          Essayer de continuer sans recharger
        </button>
        <details style={{ marginTop: 20, maxWidth: 340, width: '100%' }}>
          <summary style={{ fontSize: 11, color: '#9aa7b2', cursor: 'pointer' }}>Détails techniques</summary>
          <pre style={{
            marginTop: 8,
            padding: '10px 12px',
            background: '#f0f4f7',
            borderRadius: 6,
            fontSize: 10,
            color: '#64727d',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: 160,
            overflow: 'auto',
          }}>
            {errMsg}
          </pre>
        </details>
      </div>
    );
  }
}
