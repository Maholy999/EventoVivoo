/**
 * R1: Verifica si hay cupo disponible.
 */
export function hasCapacity(capacity: number, confirmedCount: number): boolean {
  return confirmedCount < capacity;
}

/**
 * R1: Verifica que el cupo no sea negativo ni fraccionario.
 */
export function isValidCapacity(capacity: number): boolean {
  return Number.isInteger(capacity) && capacity >= 0;
}
