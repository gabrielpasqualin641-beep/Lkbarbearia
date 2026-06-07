/**
 * Sanitiza strings para evitar XSS (Cross-Site Scripting)
 */
function sanitizeText(text) {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') return String(text);
  
  return text
    .trim()
    .replace(/<[^>]*>/g, '') // Remove tags HTML simples
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valida se um valor é um número válido e finito
 */
function isValidNumber(val) {
  if (val === undefined || val === null) return false;
  const num = Number(val);
  return !isNaN(num) && isFinite(num);
}

module.exports = {
  sanitizeText,
  isValidNumber
};
