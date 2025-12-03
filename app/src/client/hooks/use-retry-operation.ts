import { useCallback, useState } from "react";

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError?: Error;
  nextRetryIn?: number; // milliseconds
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Custom hook for implementing retry logic with exponential backoff
 * Useful for handling transient network failures
 */
export function useRetryOperation(config: RetryConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
  });

  /**
   * Calculate delay for next retry using exponential backoff
   * Formula: min(initialDelay * (multiplier ^ retryCount), maxDelay)
   */
  const calculateDelay = useCallback(
    (retryCount: number): number => {
      const delay = Math.min(
        finalConfig.initialDelayMs! *
          Math.pow(finalConfig.backoffMultiplier!, retryCount),
        finalConfig.maxDelayMs!,
      );
      return delay;
    },
    [finalConfig],
  );

  /**
   * Execute operation with automatic retries on failure
   * Returns true if operation succeeded, false if all retries exhausted
   */
  const executeWithRetry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      onRetry?: (
        attemptNumber: number,
        error: Error,
        nextRetryIn: number,
      ) => void,
    ): Promise<{ success: boolean; result?: T; error?: Error }> => {
      let lastError: Error | undefined;
      let currentRetryCount = 0;

      while (currentRetryCount <= finalConfig.maxRetries!) {
        try {
          const result = await operation();

          // Success
          setRetryState({
            isRetrying: false,
            retryCount: 0,
          });

          return { success: true, result };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          currentRetryCount++;

          // Check if we should retry
          if (currentRetryCount <= finalConfig.maxRetries!) {
            const delay = calculateDelay(currentRetryCount - 1);

            setRetryState({
              isRetrying: true,
              retryCount: currentRetryCount,
              lastError,
              nextRetryIn: delay,
            });

            // Call onRetry callback if provided
            if (onRetry) {
              onRetry(currentRetryCount, lastError, delay);
            }

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // All retries exhausted
      setRetryState({
        isRetrying: false,
        retryCount: currentRetryCount,
        lastError,
      });

      return { success: false, error: lastError };
    },
    [finalConfig, calculateDelay],
  );

  /**
   * Reset retry state
   */
  const resetRetryState = useCallback(() => {
    setRetryState({
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  return {
    executeWithRetry,
    retryState,
    resetRetryState,
  };
}
