import { format, formatDistanceToNow } from "date-fns";
import type { FormatDistanceToNowOptions } from "date-fns";

export type DateInput = Date | string | number;

const toDate = (value: DateInput): Date =>
  value instanceof Date ? value : new Date(value);

export const DEFAULT_DATE_FORMAT = "MMM d, yyyy";
export const DEFAULT_DATE_TIME_FORMAT = "MMM d, yyyy h:mm a";

export function formatDateTime(
  value: DateInput,
  pattern: string = DEFAULT_DATE_TIME_FORMAT,
): string {
  return format(toDate(value), pattern);
}

export function formatDate(
  value: DateInput,
  pattern: string = DEFAULT_DATE_FORMAT,
): string {
  return format(toDate(value), pattern);
}

export function formatClockTime(value: DateInput): string {
  return formatDateTime(value, "h:mm a");
}

export function formatRelativeTime(
  value: DateInput,
  options?: FormatDistanceToNowOptions,
): string {
  return formatDistanceToNow(toDate(value), {
    addSuffix: true,
    ...options,
  });
}

export function formatLocaleDate(
  value: DateInput,
  locale: string = "en-US",
  options?: Intl.DateTimeFormatOptions,
): string {
  return toDate(value).toLocaleDateString(locale, options);
}

export function isPastDate(value: DateInput): boolean {
  return toDate(value).getTime() < Date.now();
}

export function isFutureDate(value: DateInput): boolean {
  return toDate(value).getTime() > Date.now();
}
