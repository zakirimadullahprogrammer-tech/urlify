function formatCompactNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en",
    {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1
    }
  ).format(number);
}

module.exports = {
  formatCompactNumber
};