export function formatTime(ms: number | undefined) {
  if (!ms) return 'Never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);
}
