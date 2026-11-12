export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num) + ' DT';
}

export function formatDateFR(dateStr) {
  if (!dateStr) return '—';
  const d = parseISODate(dateStr);
  if (!d) return dateStr;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatMonthYearFR(ymStr) {
  if (!ymStr) return '';
  const [y, m] = ymStr.split('-').map(Number);
  if (!y || !m) return ymStr;
  const d = new Date(y, m - 1, 1);
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function parseISODate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  const str = String(dateStr).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const frMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (frMatch) {
    const d = new Date(Number(frMatch[3]), Number(frMatch[2]) - 1, Number(frMatch[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function toISODate(dateInput) {
  const d = parseISODate(dateInput);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysUntil(dateStr) {
  const target = parseISODate(dateStr);
  if (!target) return null;
  const today = getTodayMidnight();
  const targetMid = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetMid - today) / (1000 * 60 * 60 * 24));
}

export function getNextAnniversaryInfo(startDateStr) {
  const start = parseISODate(startDateStr);
  if (!start) return null;
  const today = getTodayMidnight();
  let next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
  }
  const days = Math.round((next - today) / (1000 * 60 * 60 * 24));
  const years = next.getFullYear() - start.getFullYear();
  return {
    date: toISODate(next),
    days,
    years,
  };
}

export function getRenewalUrgency(days) {
  if (days === null) return { label: 'Non renseigné', level: 'none', badgeClass: 'bg-slate-100 text-slate-600' };
  if (days < 0) return { label: `Expiré (${Math.abs(days)}j)`, level: 'expired', badgeClass: 'bg-brand-700 text-white' };
  if (days <= 30) return { label: `Urgent · J-${days}`, level: 'urgent', badgeClass: 'bg-brand-600 text-white' };
  if (days <= 60) return { label: `À relancer · J-${days}`, level: 'warning', badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200' };
  if (days <= 90) return { label: `À anticiper · J-${days}`, level: 'info', badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200' };
  return { label: `Dans ${days}j`, level: 'ok', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
}

export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

