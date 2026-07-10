// Facebook-style relative timestamps ("il y a 23h", "il y a 2 jours", "il y a 1 mois")
// for post/realization creation dates across the site.
export function formatRelativeTime(value: any): string {
  if (!value) return '';

  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else if (typeof value.toDate === 'function') {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (isNaN(date.getTime())) return '';

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return "à l'instant";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} jour${days > 1 ? 's' : ''}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;

  const years = Math.floor(days / 365);
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
}
