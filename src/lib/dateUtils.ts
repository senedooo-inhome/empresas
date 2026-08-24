// Helper date formatting utilities for Sonax In Home
import { getTodaySaoPaulo } from './firebase';

/**
 * Formats a 'YYYY-MM-DD' or ISO string to Brazilian format 'DD/MM/AAAA'
 */
export function formatDataBr(dateStr: string): string {
  if (!dateStr) return '';
  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculates the dynamic status of a recado based on America/Sao_Paulo date:
 * - 'hoje': data_recado == hoje
 * - 'futuro': data_recado > hoje
 * - 'expirado': data_recado < hoje
 */
export type RecadoStatus = 'hoje' | 'futuro' | 'expirado';

export function getRecadoStatus(dataRecado: string, hoje: string = getTodaySaoPaulo()): RecadoStatus {
  if (dataRecado === hoje) return 'hoje';
  if (dataRecado > hoje) return 'futuro';
  return 'expirado';
}
