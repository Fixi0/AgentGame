export const formatMoney = (amount) => {
  if (Math.abs(amount) >= 1e6) {
    return `${amount < 0 ? '-' : ''}€${(Math.abs(amount) / 1e6).toFixed(1)}M`;
  }

  if (Math.abs(amount) >= 1000) {
    return `${amount < 0 ? '-' : ''}€${(Math.abs(amount) / 1000).toFixed(0)}k`;
  }

  return `€${amount}`;
};
