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
