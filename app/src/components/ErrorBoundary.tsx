import React, { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Generic error boundary component for catching React errors
 * Wraps components to gracefully handle errors and display fallback UI
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

    if (isDev) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error boundary if resetKeys change
    if (this.state.hasError && this.props.resetKeys !== prevProps.resetKeys) {
      this.resetError();
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-sm font-mono text-destructive">
                    {this.state.error.message}
                  </p>
                </div>
                <Button onClick={this.resetError} className="w-full">
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
