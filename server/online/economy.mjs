export function creditGems(wallet, amount) {
  const paidDebt = Math.min(wallet.debt ?? 0, amount);
  wallet.debt = (wallet.debt ?? 0) - paidDebt;
  wallet.gems = (wallet.gems ?? 0) + amount - paidDebt;
}
