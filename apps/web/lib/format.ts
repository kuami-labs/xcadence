/** Ancienneté lisible : « 5 h », « 3 j 4 h ». */
export function formatAge(hours: number): string {
  const whole = Math.floor(hours);
  if (whole < 24) return `${whole} h`;
  const days = Math.floor(whole / 24);
  const rest = whole % 24;
  return rest ? `${days} j ${rest} h` : `${days} j`;
}

/** Taille d'une PR : « 1 ligne », « 14 lignes ». */
export function formatLines(lines: number): string {
  return `${lines} ligne${lines > 1 ? 's' : ''}`;
}
