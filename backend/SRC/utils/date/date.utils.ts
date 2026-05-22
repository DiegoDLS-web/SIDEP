/**
 * Formatea un objeto Date (o valor convertible a Date) al formato YYYY-MM-DD.
 * 
 * @param date - Objeto Date, string de fecha o timestamp numérico.
 * @returns Cadena de texto formateada como 'YYYY-MM-DD'.
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided to formatDate utility');
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la marca de tiempo actual del sistema.
 * 
 * @returns Cadena de texto que representa el momento actual en formato ISO 8601.
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
