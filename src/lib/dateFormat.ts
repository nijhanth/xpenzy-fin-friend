/** Format a date for display as DD-MM-YYYY without shifting date-only values. */
export const formatDisplayDate = (value: string | Date): string => {
  const date = value instanceof Date
    ? value
    : /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
};

/** Format a date for compact chart labels as DD-MM. */
export const formatCompactDisplayDate = (value: string | Date): string => {
  const formatted = formatDisplayDate(value);
  return formatted ? formatted.slice(0, 5) : '';
};
