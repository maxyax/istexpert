/**
 * Форматирует число с разделением тысяч
 */
export const formatNumber = (num: number | string | undefined | null): string => {
  if (num === null || num === undefined || num === '') return '0';
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(parsed)) return '0';
  return parsed.toLocaleString('ru-RU');
};

/**
 * Форматирует денежное значение
 */
export const formatMoney = (num: number | string | undefined | null): string => {
  if (num === null || num === undefined || num === '') return '0 ₽';
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(parsed)) return '0 ₽';
  return parsed.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
};

/**
 * Форматирует дату из ISO/строки в формат dd.mm.yyyy
 */
export const formatDate = (date: string | number | Date | undefined | null): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

/**
 * Форматирует дату и время из ISO/строки в формат dd.mm.yyyy HH:MM
 */
export const formatDateTime = (date: string | number | Date | undefined | null): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
};
