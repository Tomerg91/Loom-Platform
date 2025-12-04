import type { ReactNode } from "react";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
  onError?: (error: Error, errorInfo: unknown) => void;
}

/**
 * PageErrorBoundary - Error boundary specifically for page-level components
 * Provides route-level error handling with navigation recovery options
 */
export function PageErrorBoundary({
  children,
  pageName = "Page",
  onError,
}: PageErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: unknown) => {
    console.error(`Error in ${pageName}:`, error, errorInfo);
    onError?.(error, errorInfo);
  };

  const handleReset = () => {
    // Optionally navigate to home or refresh
    window.location.href = "/";
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={(error, reset) => (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription>
                We encountered an error loading {pageName.toLowerCase()}. Please
                try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-sm font-mono text-destructive line-clamp-3">
                    {error.message}
                  </p>
                  {typeof import.meta !== "undefined" &&
                    import.meta.env?.DEV && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          Stack trace
                        </summary>
                        <pre className="mt-2 text-xs overflow-auto bg-background p-2 rounded border border-border">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={reset} variant="outline" className="flex-1">
                    Try again
                  </Button>
                  <Button onClick={handleReset} className="flex-1">
                    Go home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
