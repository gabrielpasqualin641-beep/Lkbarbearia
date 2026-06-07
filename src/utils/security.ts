/**
 * Utilidades de Segurança para o LK Barbearia
 */

/**
 * Sanitiza strings para evitar XSS (Cross-Site Scripting) e injeções de HTML
 */
export function sanitizeText(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') return String(text);
  
  return text
    .trim()
    .replace(/<[^>]*>/g, '') // Remove qualquer tag HTML <...>
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valida se um número é válido e positivo
 */
export function isValidNumber(val: any): boolean {
  if (val === undefined || val === null) return false;
  const num = Number(val);
  return !isNaN(num) && isFinite(num);
}
