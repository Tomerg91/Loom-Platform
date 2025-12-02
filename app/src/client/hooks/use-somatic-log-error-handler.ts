import { useCallback } from "react";

export interface ErrorDetail {
  code: string;
  message: string;
  userMessage: string;
  isDraft: boolean; // Whether form draft was saved
  isRetryable: boolean; // Whether error might resolve on retry
}

/**
 * Map server error codes and messages to user-friendly explanations
 * Helps users understand what went wrong and what to do next
 */
export function useSomaticLogErrorHandler() {
  /**
   * Parse and enhance error messages
   * Returns structured error details for better UX
   */
  const parseError = useCallback((error: any): ErrorDetail => {
    // Extract error information
    const statusCode = error.statusCode || error.status;
    const message = error.message || String(error);

    // Determine if it's a network/transient error
    const isNetworkError =
      error.name === "NetworkError" ||
      message.includes("Network") ||
      message.includes("Failed to fetch") ||
      message.includes("timeout");

    // Determine if it's an auth error
    const isAuthError =
      statusCode === 401 ||
      statusCode === 403 ||
      message.includes("Unauthorized") ||
      message.includes("unauthorized") ||
      message.includes("permission") ||
      message.includes("logged in");

    // Determine if it's a validation error
    const isValidationError =
      statusCode === 400 ||
      message.includes("required") ||
      message.includes("invalid") ||
      message.includes("must be");

    // Determine if it's a not found error (profile not found)
    const isProfileError =
      statusCode === 404 ||
      message.includes("profile") ||
      message.includes("not found");

    // Determine if it's a server error
    const isServerError = statusCode === 500 || statusCode >= 500;

    // Map to user-friendly message
    let userMessage = "";
    let errorCode = "UNKNOWN_ERROR";
    let isRetryable = false;

    if (isNetworkError) {
      userMessage =
        "Network connection failed. Please check your internet connection and try again.";
      errorCode = "NETWORK_ERROR";
      isRetryable = true;
    } else if (isAuthError) {
      userMessage =
        "Your session has expired or you don't have permission to perform this action. Please log in again.";
      errorCode = "AUTH_ERROR";
      isRetryable = false;
    } else if (isValidationError) {
      userMessage = message || "Please check your input and try again.";
      errorCode = "VALIDATION_ERROR";
      isRetryable = false;
    } else if (isProfileError) {
      userMessage =
        "Your client profile could not be found. Please contact support if this problem persists.";
      errorCode = "PROFILE_ERROR";
      isRetryable = false;
    } else if (isServerError) {
      userMessage =
        "The server encountered an error. Please try again in a few moments.";
      errorCode = "SERVER_ERROR";
      isRetryable = true;
    } else {
      userMessage = message || "An error occurred while logging your sensation.";
      errorCode = "UNKNOWN_ERROR";
      isRetryable = isNetworkError || isServerError;
    }

    return {
      code: errorCode,
      message, // Original error message for debugging
      userMessage, // User-friendly message
      isDraft: true, // Form data is always saved to draft on error
      isRetryable,
    };
  }, []);

  /**
   * Get recovery action message based on error type
   */
  const getRecoveryAction = useCallback((error: ErrorDetail): string => {
    switch (error.code) {
      case "NETWORK_ERROR":
        return "Check your connection and retry, or save your draft and try again later.";
      case "AUTH_ERROR":
        return "Please log in and then resubmit your sensation.";
      case "VALIDATION_ERROR":
        return "Fix the errors shown above and try again.";
      case "PROFILE_ERROR":
        return "Contact your coach or support team for assistance.";
      case "SERVER_ERROR":
        return "The server is having issues. Your draft is saved. Try again in a moment.";
      default:
        return "Your draft is saved. Please try again or contact support.";
    }
  }, []);

  /**
   * Determine if error message should trigger a retry button
   */
  const shouldShowRetryButton = useCallback((error: ErrorDetail): boolean => {
    return error.isRetryable && error.code !== "VALIDATION_ERROR";
  }, []);

  /**
   * Determine if error message should suggest contacting support
   */
  const shouldShowSupportLink = useCallback((error: ErrorDetail): boolean => {
    return error.code === "PROFILE_ERROR" || error.code === "SERVER_ERROR";
  }, []);

  return {
    parseError,
    getRecoveryAction,
    shouldShowRetryButton,
    shouldShowSupportLink,
  };
}
