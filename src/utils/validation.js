/**
 * Validates time format HH:mm or HH:mm:ss
 */
function isValidTime(timeStr) {
  if (!timeStr) return false;
  const regex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  return regex.test(timeStr);
}

/**
 * Validates date format YYYY-MM-DD
 */
function isValidDate(dateStr) {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Normalizes time string to HH:mm:ss
 */
function normalizeTime(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(':');
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  const s = parts[2] ? parts[2].padStart(2, '0') : '00';
  return `${h}:${m}:${s}`;
}

/**
 * Checks if start_time is strictly before end_time
 */
function isTimeOrderValid(start, end) {
  const normStart = normalizeTime(start);
  const normEnd = normalizeTime(end);
  return normStart < normEnd;
}

/**
 * Validates email format
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

module.exports = {
  isValidTime,
  isValidDate,
  normalizeTime,
  isTimeOrderValid,
  isValidEmail,
};

