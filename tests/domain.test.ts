import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateCost,
  bounds,
  defaultSettings,
  estimateTax,
  expenseCost,
  federalTax2026,
  mileageRate,
  movePeriod,
  nyTax2026,
  summarize,
  validateExpense,
  validateShift,
} from "../src/domain.ts";
import type { Shift, Expense } from "../src/domain.ts";
const shift = (v: Partial<Shift> = {}): Shift => ({
  id: "test",
  date: "2026-10-26",
  base_pay: 120,
  tips: 80,
  miles: 100,
  minutes: 300,
  notes: "",
  ...v,
});
const expense = (v: Partial<Expense> = {}): Expense => ({
  id: "expense",
  date: "2026-10-26",
  category: "gas",
  amount: 50,
  business_percent: 60,
  notes: "",
  ...v,
});
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 0.00001, `${a} ≠ ${b}`);
test("cash earnings use full shift time and DoorDash expense share", () => {
  const s = summarize([shift()], [expense()]);
  assert.equal(s.revenue, 200);
  assert.equal(s.hours, 5);
  assert.equal(s.profit, 170);
  assert.equal(s.netHourly, 34);
  assert.equal(s.grossHourly, 40);
});
test("mileage deduction is not subtracted from cash profit", () => {
  const s = summarize([shift()], []);
  assert.equal(s.profit, 200);
  assert.equal(s.mileage, 76);
});
test("2026 mileage uses the actual shift date across the midyear change", () => {
  assert.equal(mileageRate("2026-06-30"), 0.725);
  assert.equal(mileageRate("2026-07-01"), 0.76);
  close(
    summarize(
      [shift({ date: "2026-06-30" }), shift({ date: "2026-07-01" })],
      [],
    ).mileage,
    148.5,
  );
  assert.equal(mileageRate("2027-01-01"), null);
});
test("a gas purchase outside a shift remains a valid expense", () => {
  const e = expense({ date: "2026-10-20" });
  validateExpense(e);
  assert.equal(expenseCost(e), 30);
});
test("losses show as negative real hourly earnings", () => {
  assert.equal(
    summarize([shift()], [expense({ amount: 500, business_percent: 100 })])
      .netHourly,
    -60,
  );
});
test("zero-hour reporting periods do not divide by zero", () => {
  assert.equal(summarize([], [expense()]).netHourly, 0);
});
test("cost allocation reconciles across shifts by miles", () => {
  const a = shift({ miles: 25 }),
    b = shift({ id: "b", miles: 75 });
  close(allocateCost(a, [a, b], 80), 20);
  close(allocateCost(b, [a, b], 80), 60);
});
test("no-mile shift costs fall back to total time", () => {
  const a = shift({ miles: 0, minutes: 60 }),
    b = shift({ id: "b", miles: 0, minutes: 180 });
  close(allocateCost(a, [a, b], 80), 20);
  close(allocateCost(b, [a, b], 80), 60);
});
test("weeks start Monday and include a full cross-year week", () => {
  assert.deepEqual(bounds("2026-11-01", "week"), {
    start: "2026-10-26",
    end: "2026-11-01",
  });
  assert.deepEqual(bounds("2026-12-31", "week"), {
    start: "2026-12-28",
    end: "2027-01-03",
  });
});
test("month navigation clamps rather than skipping February", () => {
  assert.equal(movePeriod("2026-01-31", "month", 1), "2026-02-01");
  assert.deepEqual(bounds("2028-02-15", "month"), {
    start: "2028-02-01",
    end: "2028-02-29",
  });
});
test("tax profit uses mileage and SE tax remains due when tips cover profit", () => {
  const s = shift({ base_pay: 100, tips: 900, miles: 100 });
  const r = estimateTax([s], defaultSettings(2026));
  close(r.profit, 924);
  close(r.se, 924 * 0.9235 * 0.153);
  assert.equal(r.federal, 0);
  assert.equal(r.state, 0);
  close(r.tips, 924 - r.se / 2);
  assert.ok(r.se > 0);
});
test("SE tax applies only at the $400 net-earnings threshold", () => {
  assert.equal(
    estimateTax(
      [shift({ base_pay: 400, tips: 0, miles: 0 })],
      defaultSettings(2026),
    ).se,
    0,
  );
  assert.ok(
    estimateTax(
      [shift({ base_pay: 434, tips: 0, miles: 0 })],
      defaultSettings(2026),
    ).se > 0,
  );
});
test("qualified tip deduction caps at $25,000", () => {
  const r = estimateTax(
    [shift({ base_pay: 10000, tips: 30000, miles: 0 })],
    defaultSettings(2026),
  );
  assert.equal(r.tips, 25000);
});
test("tips and QBI can be disabled independently", () => {
  const r = estimateTax([shift({ base_pay: 20000, tips: 10000, miles: 0 })], {
    ...defaultSettings(2026),
    tips_eligible: false,
    qbi_enabled: false,
  });
  assert.equal(r.tips, 0);
  assert.equal(r.qbi, 0);
  assert.ok(r.federal > 0);
});
test("QBI excludes deducted tips and applies the 2026 active-business minimum", () => {
  const r = estimateTax([shift({ base_pay: 1500, tips: 0, miles: 0 })], {
    ...defaultSettings(2026),
    other_income: 25000,
  });
  assert.equal(r.qbi, 400);
  const t = estimateTax([shift({ base_pay: 5000, tips: 20000, miles: 0 })], {
    ...defaultSettings(2026),
    other_income: 20000,
  });
  close(t.qbi, Math.max(400, (t.profit - t.halfSe - t.tips) * 0.2));
});
test("other income baseline is not charged again to DoorDash", () => {
  const r = estimateTax([], { ...defaultSettings(2026), other_income: 40000 });
  assert.equal(r.federal, 0);
  assert.equal(r.state, 0);
  assert.equal(r.total, 0);
});
test("payments reduce the reserve but never the estimated tax itself", () => {
  const s = [shift({ base_pay: 30000, tips: 5000, miles: 5000 })],
    a = estimateTax(s, defaultSettings(2026)),
    b = estimateTax(s, {
      ...defaultSettings(2026),
      federal_paid: 500,
      state_paid: 100,
    });
  close(a.total, b.total);
  close(a.remaining - b.remaining, 600);
  assert.equal(
    estimateTax(s, {
      ...defaultSettings(2026),
      federal_paid: 100000,
      state_paid: 100000,
    }).remaining,
    0,
  );
});
test("an empty year does not create a tax bill or negative cash values", () => {
  const r = estimateTax([], defaultSettings(2026));
  assert.equal(r.total, 0);
  assert.equal(r.remaining, 0);
  assert.equal(r.tips, 0);
});
test("future or out-of-scope taxes are explicitly invalid", () => {
  assert.equal(
    estimateTax([shift({ date: "2027-01-01" })], defaultSettings(2027)).valid,
    false,
  );
  assert.equal(
    estimateTax([shift({ base_pay: 80000 })], defaultSettings(2026)).valid,
    false,
  );
});
test("published first brackets and progressive boundaries reconcile", () => {
  close(federalTax2026(12400), 1240);
  close(federalTax2026(20000), 2152);
  close(nyTax2026(8500), 331.5);
  close(nyTax2026(13900), 585.6);
  close(nyTax2026(20000), 915);
});
test("invalid dates, hours and nonfinite values are rejected", () => {
  assert.throws(() => validateShift(shift({ date: "2026-02-30" })));
  assert.throws(() => validateShift(shift({ date: "2025-12-31" })));
  assert.throws(() => validateShift(shift({ minutes: 0 })));
  assert.throws(() => validateShift(shift({ tips: NaN })));
  assert.throws(() => validateExpense(expense({ business_percent: 101 })));
  assert.throws(() => validateExpense(expense({ amount: 0 })));
});
