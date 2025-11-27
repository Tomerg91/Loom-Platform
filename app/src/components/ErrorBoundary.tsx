import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "wasp/client/auth";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ErrorBoundary component that catches JavaScript errors anywhere in the child component tree
 * and displays a user-friendly fallback UI.
 *
 * Usage:
 * <ErrorBoundary>
 *   <SomeComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Fallback component displayed when an error is caught
 */
function ErrorBoundaryFallback({
  error,
  resetError,
}: {
  error: Error | null;
  resetError: () => void;
}) {
  const navigate = useNavigate();
  const { data: user } = useAuth();
  const { t } = useTranslation();

  const handleGoHome = () => {
    resetError();
    // Navigate to appropriate dashboard based on user role
    if (user?.role === "CLIENT") {
      navigate("/client");
    } else if (user?.role === "COACH") {
      navigate("/coach");
    } else if (user?.isAdmin) {
      navigate("/admin");
    } else {
      navigate("/");
    }
  };

  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Alert className="bg-red-50 border-red-200 mb-6">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            <div className="font-semibold text-lg mb-2">
              {t("errors.errorBoundary.title", "Oops! Something went wrong")}
            </div>
            <p className="text-sm mb-4">
              {t(
                "errors.errorBoundary.message",
                "We encountered an unexpected error. Please try going back to the dashboard."
              )}
            </p>

            {isDevelopment && error && (
              <div className="bg-red-100 border border-red-300 rounded p-3 mt-4 text-xs font-mono overflow-auto max-h-40">
                <p className="font-bold mb-1">Error Details:</p>
                <p className="text-red-700">{error.message}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Home className="h-4 w-4" />
            {t("errors.errorBoundary.goHome", "Go to Dashboard")}
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            {t("common.back", "Go Back")}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          {t(
            "errors.errorBoundary.contact",
            "If the problem persists, please contact support."
          )}
        </p>
      </div>
    </div>
  );
}
