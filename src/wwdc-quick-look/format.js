export function sanitizeFilename(value, fallback = 'untitled') {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  return text.replace(/[<>:"/\\|?*]/g, '_').slice(0, 128) || fallback;
}

export function sessionCodeFromId(sessionId) {
  const text = String(sessionId ?? '');
  return text.includes('-') ? text.split('-').pop() : text;
}

export function formatTimestamp(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (part) => String(part).padStart(2, '0');
  return hours > 0
    ? `${two(hours)}:${two(minutes)}:${two(seconds)}`
    : `${two(minutes)}:${two(seconds)}`;
}

export function parseTimestamp(value) {
  const text = String(value ?? '').trim();
  if (!text) return 0;
  if (!text.includes(':')) return Math.max(0, Math.floor(Number(text) || 0));
  const parts = text.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return 0;
}

export function formatDuration(value) {
  const total = Math.floor(Number(value));
  if (!Number.isFinite(total) || total < 0) return '';
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const parts = [];
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0) parts.push(`${seconds} s`);
  return parts.length > 0 ? parts.join(' ') : '0 s';
}
