export const formatMoney = (amount) => {
  const value = Number(amount) || 0;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1e9) {
    return `${sign}€${(abs / 1e9).toFixed(1).replace('.', ',')}Md`;
  }

  if (abs >= 1e6) {
    return `${sign}€${(abs / 1e6).toFixed(1).replace('.', ',')}M`;
  }

  return `${sign}€${Math.round(abs).toLocaleString('fr-FR')}`;
};
