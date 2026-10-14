// Utilitário de data usado pelo portal.
// (O nome do arquivo foi mantido para não alterar os imports existentes;
// o projeto não usa mais Firebase.)

// Helper to obtain the current date string in America/Sao_Paulo (YYYY-MM-DD)
export function getTodaySaoPaulo(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Returns 'YYYY-MM-DD'
}
