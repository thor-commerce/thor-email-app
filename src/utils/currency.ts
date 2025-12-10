/**
 * Converts cents to a formatted currency amount
 * @param cents - The amount in cents
 * @returns The amount with 2 decimal places
 * @example
 * centsToAmount(1234) // "12.34"
 * centsToAmount(100) // "1.00"
 * centsToAmount(5) // "0.05"
 */
export function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}
