import { type ReactNode } from "react";
import {
  ErrorBoundary as ReactErrorBoundary,
  type FallbackProps,
} from "react-error-boundary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: unknown) => void;
  resetKeys?: Array<string | number>;
}

const DefaultFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div className="flex min-h-screen items-center justify-center p-4">
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
            <p className="font-mono text-sm text-destructive">{error.message}</p>
          </div>
          <Button onClick={resetErrorBoundary} className="w-full">
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export function ErrorBoundary({
  children,
  fallback,
  onError,
  resetKeys,
}: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      onError={onError}
      resetKeys={resetKeys}
      fallbackRender={(props) =>
        fallback
          ? fallback(props.error, props.resetErrorBoundary)
          : DefaultFallback(props)
      }
    >
      {children}
    </ReactErrorBoundary>
  );
}
