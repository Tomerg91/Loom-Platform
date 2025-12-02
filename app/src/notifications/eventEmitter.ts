/**
 * Notification Event Emitter (Singleton)
 *
 * Central event bus for all notification events. Uses observer pattern to allow
 * handlers to subscribe to notification events without tight coupling.
 *
 * Usage:
 *   notificationEmitter.emit('SESSION_REMINDER', { clientId: '123' });
 *   notificationEmitter.subscribe('SESSION_REMINDER', handler);
 */

// ============================================
// EVENT TYPES & PAYLOADS
// ============================================

export enum NotificationEventType {
  SESSION_REMINDER = "SESSION_REMINDER",
  SESSION_SUMMARY_POSTED = "SESSION_SUMMARY_POSTED",
  RESOURCE_SHARED = "RESOURCE_SHARED",
}

export interface NotificationEventPayload {
  [NotificationEventType.SESSION_REMINDER]: {
    clientId: string;
    sessionDate: Date;
    coachName?: string;
  };
  [NotificationEventType.SESSION_SUMMARY_POSTED]: {
    clientId: string;
    sessionId: string;
    topic?: string;
    sharedSummary: string;
  };
  [NotificationEventType.RESOURCE_SHARED]: {
    clientId: string;
    resourceId: string;
    resourceName: string;
    coachName?: string;
  };
}

// ============================================
// EVENT HANDLER TYPE
// ============================================

export type EventHandler<T extends NotificationEventType> = (
  payload: NotificationEventPayload[T],
) => Promise<void>;

// ============================================
// NOTIFICATION EVENT EMITTER (SINGLETON)
// ============================================

class NotificationEventEmitterClass {
  private handlers: Map<NotificationEventType, EventHandler<any>[]> = new Map();

  constructor() {
    // Initialize empty handler arrays for each event type
    Object.values(NotificationEventType).forEach((eventType) => {
      this.handlers.set(eventType, []);
    });
  }

  /**
   * Subscribe to a notification event
   * @param eventType The type of event to listen for
   * @param handler The async function to execute when event is emitted
   */
  subscribe<T extends NotificationEventType>(
    eventType: T,
    handler: EventHandler<T>,
  ): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Unsubscribe from a notification event
   * @param eventType The type of event to stop listening for
   * @param handler The handler function to remove
   */
  unsubscribe<T extends NotificationEventType>(
    eventType: T,
    handler: EventHandler<T>,
  ): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.handlers.set(eventType, handlers);
    }
  }

  /**
   * Emit a notification event to all subscribed handlers
   * Executes all handlers in parallel
   * @param eventType The type of event to emit
   * @param payload The event payload
   */
  async emit<T extends NotificationEventType>(
    eventType: T,
    payload: NotificationEventPayload[T],
  ): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];

    // Execute all handlers in parallel, but don't fail if one throws
    try {
      await Promise.all(
        handlers.map((handler) =>
          handler(payload).catch((error) => {
            console.error(
              `Error in notification handler for ${eventType}:`,
              error,
            );
            // Don't re-throw - let other handlers execute
          }),
        ),
      );
    } catch (error) {
      console.error(`Fatal error emitting ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    Object.values(NotificationEventType).forEach((eventType) => {
      this.handlers.set(eventType, []);
    });
  }

  /**
   * Get the number of handlers for a specific event type
   */
  getHandlerCount(eventType: NotificationEventType): number {
    return (this.handlers.get(eventType) || []).length;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const notificationEmitter = new NotificationEventEmitterClass();

export default notificationEmitter;
