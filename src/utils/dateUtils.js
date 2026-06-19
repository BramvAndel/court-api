/**
 * Convert an ISO 8601 datetime string (e.g. "2026-06-19T09:45:00.000Z")
 * into the MySQL DATETIME format "YYYY-MM-DD HH:MM:SS" in UTC.
 *
 * MySQL DATETIME columns do not accept the "T", fractional seconds, or
 * trailing "Z" of an ISO string, so values coming from the frontend must be
 * normalized before they are inserted.
 *
 * @param {string|Date|null|undefined} value - ISO string or Date
 * @returns {string|null} MySQL-formatted datetime, or null if no value given
 */
const toMySQLDateTime = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime value: ${value}`);
  }

  // "2026-06-19T09:45:00.000Z" -> "2026-06-19 09:45:00"
  return date.toISOString().slice(0, 19).replace("T", " ");
};

module.exports = { toMySQLDateTime };
