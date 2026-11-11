/** Convert an ISO date-only value to the UTC DateTime Prisma requires. */
export function toPrismaDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  return date;
}
