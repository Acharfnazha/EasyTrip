// Writes an amount of money for a message: "$560" for a whole amount, "$1,000.50" with cents.
// The amount can be MySQL's text ("560.00") or a number.
export function money(amount) {
  const value = Number(amount);
  const digits = Number.isInteger(value) ? 0 : 2;
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
