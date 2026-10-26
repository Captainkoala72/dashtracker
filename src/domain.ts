export type Shift = {
  id: string;
  date: string;
  base_pay: number;
  tips: number;
  miles: number;
  minutes: number;
  notes: string;
  updated_at?: string;
};
export type Expense = {
  id: string;
  date: string;
  category: "gas" | "maintenance";
  amount: number;
  business_percent: number;
  notes: string;
  updated_at?: string;
};
export type Settings = {
  year: number;
  other_income: number;
  federal_paid: number;
  state_paid: number;
  default_business_percent: number;
  tips_eligible: boolean;
  qbi_enabled: boolean;
  updated_at?: string;
};
export type Period = "week" | "month" | "year";
export const defaultSettings = (year: number): Settings => ({
  year,
  other_income: 0,
  federal_paid: 0,
  state_paid: 0,
  default_business_percent: 100,
  tips_eligible: true,
  qbi_enabled: true,
});
export const money = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
export const num = (n: number, digits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n);
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export const dateObj = (date: string) => new Date(`${date}T12:00:00`);
export function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const formatDate = (
  date: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) => dateObj(date).toLocaleDateString("en-US", options);
export function bounds(anchor: string, period: Period) {
  const a = dateObj(anchor),
    b = dateObj(anchor);
  if (period === "week") {
    a.setDate(a.getDate() - ((a.getDay() + 6) % 7));
    b.setTime(a.getTime());
    b.setDate(b.getDate() + 6);
  }
  if (period === "month") {
    a.setDate(1);
    b.setMonth(b.getMonth() + 1, 0);
  }
  if (period === "year") {
    a.setMonth(0, 1);
    b.setMonth(11, 31);
  }
  return { start: iso(a), end: iso(b) };
}
export function movePeriod(anchor: string, period: Period, direction: number) {
  const d = dateObj(anchor);
  if (period === "week") d.setDate(d.getDate() + 7 * direction);
  if (period === "month") {
    d.setDate(1);
    d.setMonth(d.getMonth() + direction);
  }
  if (period === "year") d.setFullYear(d.getFullYear() + direction);
  return iso(d);
}
export const inside = (date: string, start: string, end: string) =>
  date >= start && date <= end;
export const expenseCost = (e: Expense) =>
  (e.amount * e.business_percent) / 100;
export const gross = (s: Shift) => s.base_pay + s.tips;
export function mileageRate(date: string): number | null {
  if (date.startsWith("2026")) return date < "2026-07-01" ? 0.725 : 0.76;
  return null;
}
export function summarize(shifts: Shift[], expenses: Expense[]) {
  const revenue = shifts.reduce((a, s) => a + gross(s), 0),
    tips = shifts.reduce((a, s) => a + s.tips, 0),
    miles = shifts.reduce((a, s) => a + s.miles, 0),
    hours = shifts.reduce((a, s) => a + s.minutes / 60, 0);
  const gas = expenses
      .filter((e) => e.category === "gas")
      .reduce((a, e) => a + expenseCost(e), 0),
    maintenance = expenses
      .filter((e) => e.category === "maintenance")
      .reduce((a, e) => a + expenseCost(e), 0);
  const cost = gas + maintenance,
    profit = revenue - cost;
  const mileage = shifts.reduce(
    (a, s) => a + s.miles * (mileageRate(s.date) ?? 0),
    0,
  );
  return {
    revenue,
    tips,
    miles,
    hours,
    gas,
    maintenance,
    cost,
    profit,
    mileage,
    grossHourly: hours ? revenue / hours : 0,
    netHourly: hours ? profit / hours : 0,
  };
}
export function allocateCost(s: Shift, shifts: Shift[], cost: number) {
  const totalMiles = shifts.reduce((a, r) => a + r.miles, 0),
    totalMinutes = shifts.reduce((a, r) => a + r.minutes, 0);
  return totalMiles
    ? (cost * s.miles) / totalMiles
    : totalMinutes
      ? (cost * s.minutes) / totalMinutes
      : 0;
}
function progressive(income: number, brackets: [number, number][]) {
  let tax = 0,
    last = 0;
  for (const [top, rate] of brackets) {
    tax += Math.max(0, Math.min(income, top) - last) * rate;
    last = top;
  }
  return tax;
}
export const federalTax2026 = (taxable: number) =>
  progressive(Math.max(0, taxable), [
    [12400, 0.1],
    [50400, 0.12],
    [105700, 0.22],
    [201775, 0.24],
    [256225, 0.32],
    [640600, 0.35],
    [Infinity, 0.37],
  ]);
export const nyTax2026 = (taxable: number) =>
  progressive(Math.max(0, taxable), [
    [8500, 0.039],
    [11700, 0.044],
    [13900, 0.0515],
    [80650, 0.054],
    [215400, 0.059],
    [1077550, 0.0685],
    [5000000, 0.0965],
    [25000000, 0.103],
    [Infinity, 0.109],
  ]);
export function estimateTax(shifts: Shift[], settings: Settings) {
  const sums = summarize(shifts, []),
    supported = settings.year === 2026;
  // Planning model: one sole proprietorship, single independent filer, ordinary other income.
  const profit = Math.max(0, sums.revenue - sums.mileage),
    seBase = profit * 0.9235;
  const se = seBase >= 400 ? seBase * 0.153 : 0,
    halfSe = se / 2,
    netIncome = Math.max(0, profit - halfSe);
  const tips = settings.tips_eligible
    ? Math.min(sums.tips, 25000, netIncome)
    : 0;
  const agi = settings.other_income + netIncome;
  const taxableBeforeQbi = Math.max(0, agi - 16100 - tips);
  const qualifiedBusinessIncome = Math.max(0, netIncome - tips);
  const regularQbi = Math.min(
    qualifiedBusinessIncome * 0.2,
    taxableBeforeQbi * 0.2,
  );
  const qbi = settings.qbi_enabled
    ? Math.min(
        taxableBeforeQbi,
        Math.max(regularQbi, qualifiedBusinessIncome >= 1000 ? 400 : 0),
      )
    : 0;
  const federalFull = federalTax2026(taxableBeforeQbi - qbi),
    federalBaseline = federalTax2026(
      Math.max(0, settings.other_income - 16100),
    );
  const stateFull = nyTax2026(Math.max(0, agi - tips - 8000)),
    stateBaseline = nyTax2026(Math.max(0, settings.other_income - 8000));
  const federal = Math.max(0, federalFull - federalBaseline),
    state = Math.max(0, stateFull - stateBaseline);
  const total = se + federal + state,
    remaining =
      Math.max(0, se + federal - settings.federal_paid) +
      Math.max(0, state - settings.state_paid);
  const valid = supported && agi <= 50000;
  return {
    supported,
    valid,
    profit,
    se,
    halfSe,
    tips,
    qbi,
    agi,
    federal,
    state,
    total,
    remaining,
    federalRemaining: Math.max(0, se + federal - settings.federal_paid),
    stateRemaining: Math.max(0, state - settings.state_paid),
    mileage: sums.mileage,
  };
}
export function validateShift(s: Shift) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s.date) ||
    Number.isNaN(dateObj(s.date).getTime()) ||
    iso(dateObj(s.date)) !== s.date ||
    s.date < "2026-01-01"
  )
    throw Error("Choose a valid date in 2026 or later.");
  if (
    ![s.base_pay, s.tips, s.miles, s.minutes].every(Number.isFinite) ||
    s.base_pay < 0 ||
    s.tips < 0 ||
    s.miles < 0 ||
    s.minutes <= 0 ||
    s.minutes > 1440
  )
    throw Error(
      "Enter positive shift time (up to 24 hours) and non-negative earnings and miles.",
    );
  if (s.notes.length > 2000)
    throw Error("Notes must be 2,000 characters or fewer.");
}
export function validateExpense(e: Expense) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
    Number.isNaN(dateObj(e.date).getTime()) ||
    iso(dateObj(e.date)) !== e.date ||
    e.date < "2026-01-01"
  )
    throw Error("Choose a valid date in 2026 or later.");
  if (
    ![e.amount, e.business_percent].every(Number.isFinite) ||
    e.amount <= 0 ||
    e.business_percent < 0 ||
    e.business_percent > 100
  )
    throw Error("Enter a positive cost and a DoorDash share from 0 to 100%.");
  if (!["gas", "maintenance"].includes(e.category))
    throw Error("Choose gas or maintenance.");
  if (e.notes.length > 2000)
    throw Error("Notes must be 2,000 characters or fewer.");
}
