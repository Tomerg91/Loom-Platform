/**
 * Used purely to help compiler check for exhaustiveness in switch statements,
 * will never execute. See https://stackoverflow.com/a/39419171.
 */
export function assertUnreachable(_: never): never {
  throw Error("This code should be unreachable");
}

/**
 * Allows for throttling a function call while still allowing the last invocation to be executed after the throttle delay ends.
 */
export type AnyFunction = (...args: unknown[]) => void;

export function throttleWithTrailingInvocation<TFn extends AnyFunction>(
  fn: TFn,
  delayInMilliseconds: number,
): TFn & { cancel: () => void } {
  let fnLastCallTime: number | null = null;
  let trailingInvocationTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let isTrailingInvocationPending = false;

  const callFn = (...args: Parameters<TFn>) => {
    fnLastCallTime = Date.now();
    fn(...args);
  };

  const throttledFn = (...args: Parameters<TFn>) => {
    const currentTime = Date.now();
    const timeSinceLastExecution = fnLastCallTime
      ? currentTime - fnLastCallTime
      : 0;

    const shouldCallImmediately =
      fnLastCallTime === null || timeSinceLastExecution >= delayInMilliseconds;

    if (shouldCallImmediately) {
      callFn(...args);
      return;
    }

    if (!isTrailingInvocationPending) {
      isTrailingInvocationPending = true;
      const remainingDelayTime = Math.max(
        delayInMilliseconds - timeSinceLastExecution,
        0,
      );

      trailingInvocationTimeoutId = setTimeout(() => {
        callFn(...args);
        isTrailingInvocationPending = false;
      }, remainingDelayTime);
    }
  };

  throttledFn.cancel = () => {
    if (trailingInvocationTimeoutId) {
      clearTimeout(trailingInvocationTimeoutId);
      trailingInvocationTimeoutId = null;
    }
    isTrailingInvocationPending = false;
  };
  return throttledFn as TFn & { cancel: () => void };
}
