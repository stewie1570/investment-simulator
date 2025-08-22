export function isOutsideOfMarketHours(dateString: string) {
  const date = new Date(dateString);
  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();
  const estHour = utcHour - 5;
  const estMinute = utcMinute;
  const minutes = estHour * 60 + estMinute;
  return minutes < 510 || minutes >= 900;
}
