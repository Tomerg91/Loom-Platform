export function formatCurrency(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions & { currency?: string; locale?: string },
): string {
  const resolvedValue = value ?? 0;
  const { currency = "USD", locale = "en-US", ...intlOptions } = options || {};

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...intlOptions,
  }).format(resolvedValue);
}

export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions & { locale?: string },
): string {
  const { locale = "en-US", ...intlOptions } = options || {};

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    ...intlOptions,
  }).format(value ?? 0);
}

export function formatPercentage(
  value: number | null | undefined,
  fractionDigits = 0,
): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toFixed(fractionDigits)}%`;
}

export function formatCompactNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions & { locale?: string },
): string {
  const { locale = "en-US", ...intlOptions } = options || {};

  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
    ...intlOptions,
  }).format(value ?? 0);
}
