import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button, GlassCard } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background flex items-center justify-center p-4">
          <GlassCard className="max-w-2xl w-full p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-danger/10 mb-6">
                <AlertCircle className="w-12 h-12 text-danger" />
              </div>

              <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                Something went wrong
              </h1>
              
              <p className="text-muted-foreground mb-6">
                An unexpected error occurred. Don't worry, your wallet and funds are safe.
              </p>

              {this.state.error && (
                <div className="mb-6 p-4 bg-surface rounded-lg text-left">
                  <p className="text-sm font-mono text-danger mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Error details
                      </summary>
                      <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={this.handleReset}
                  leadingIcon={<RefreshCw className="w-4 h-4" />}
                >
                  Try Again
                </Button>
                <Button
                  variant="primary"
                  onClick={() => window.location.href = '/'}
                  leadingIcon={<Home className="w-4 h-4" />}
                >
                  Go Home
                </Button>
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                If this problem persists, please{' '}
                <a href="/help" className="text-primary hover:underline">
                  contact support
                </a>
              </p>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// Page-level error boundary with custom message
export const PageErrorBoundary: React.FC<{ children: ReactNode; pageName?: string }> = ({ 
  children, 
  pageName 
}) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background flex items-center justify-center p-4">
          <GlassCard className="max-w-lg w-full p-8 text-center">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              {pageName ? `Error loading ${pageName}` : 'Page Error'}
            </h2>
            <p className="text-muted-foreground mb-6">
              This page encountered an error. Please try refreshing.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
              <Button variant="primary" onClick={() => window.location.href = '/'}>
                Go Home
              </Button>
            </div>
          </GlassCard>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};
