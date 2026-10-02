export function getCurrentMonth(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getCurrentDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMonthYear(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatShortMonthYear(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function getAvailableMonths(range = 6): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -range; i <= range; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    months.push({ value, label });
  }
  return months;
}
