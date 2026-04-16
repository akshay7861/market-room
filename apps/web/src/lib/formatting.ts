export function formatDisplayNumberText(value: string): string {
  return value.replace(/(?<![A-Z])(-?\d+\.\d{3,})(?![A-Z])/g, (match) => {
    const parsed = Number(match);
    if (!Number.isFinite(parsed)) {
      return match;
    }

    return parsed.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
  });
}
