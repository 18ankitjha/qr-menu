/** ₹ with two decimals, e.g. ₹831.60 */
const formatMoney = (n: number) => `₹${n.toFixed(2)}`;

export { formatMoney };
