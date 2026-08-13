function formatAge(seconds: number, useMinutes: boolean, withSuffix: boolean): string {
  let text: string;
  if (useMinutes) {
    const minutes = seconds / 60;

    text = minutes < 10 ? `${Math.round(minutes * 10) / 10}m` : `${Math.round(minutes)}m`;
  } else {
    text = `${seconds}s`;
  }
  return withSuffix ? `${text} ago` : text;
}

export function ageAxisLabels(sampleCount: number, intervalMs: number): string[] {
  const seconds = Math.round((sampleCount * intervalMs) / 1000);
  const useMinutes = seconds >= 90;
  return [
    formatAge(seconds, useMinutes, true),
    formatAge(Math.round(seconds / 2), useMinutes, false),
    'now',
  ];
}
