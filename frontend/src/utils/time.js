export function pad(n) {
  return n.toString().padStart(2, '0');
}

export function zulu(d = new Date()) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function formatTimeAmPm(d = new Date()) {
  const date = typeof d === 'string' ? new Date(d) : d;
  let hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function initials(name = '') {
  if (!name) return 'EX';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
