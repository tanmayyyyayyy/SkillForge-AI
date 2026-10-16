import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  title?: string;
  message?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            gap: '0.85rem',
            padding: '2rem'
          }}
        >
          <AlertTriangle size={30} color="var(--danger)" />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {this.props.title || 'Something went wrong'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: 0, lineHeight: 1.5 }}>
            {this.props.message || 'An unexpected error interrupted this view. You can try again, or reload the page if the problem persists.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={this.handleReset}>
              Try again
            </button>
            <button type="button" className="btn btn-secondary" onClick={this.handleReload}>
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
