import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Cloud,
  CloudOff,
  Fuel,
  Gauge,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  allocateCost,
  bounds,
  dateObj,
  defaultSettings,
  estimateTax,
  expenseCost,
  formatDate,
  gross,
  inside,
  iso,
  mileageRate,
  money,
  movePeriod,
  num,
  summarize,
  today,
  validateExpense,
  validateShift,
} from "./domain";
import type { Expense, Period, Settings, Shift } from "./domain";
import { configured, useTracker } from "./store";

type Page = "Overview" | "Shifts" | "Expenses" | "Taxes" | "Settings";
type Editor =
  | { kind: "shift"; value?: Shift }
  | { kind: "expense"; value?: Expense }
  | null;
const icons: Record<Page, LucideIcon> = {
  Overview: LayoutDashboard,
  Shifts: Clock3,
  Expenses: ReceiptText,
  Taxes: ShieldCheck,
  Settings: Settings2,
};
function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M8 14h24l9 10-9 10H19l6-7H10l7-7H8z" fill="currentColor" />
        </svg>
      </span>
      <span>
        Dash<span className="brand-light">Tracker</span>
        <small>YOUR SHIFT. YOUR NUMBERS.</small>
      </span>
    </div>
  );
}
function sampleData(anchor: string) {
  const start = bounds(anchor, "week").start;
  const shifts: Shift[] = [];
  for (let w = -3; w <= 0; w++)
    for (let j = 0; j < 6; j++) {
      const d = dateObj(start);
      d.setDate(d.getDate() + w * 7 + j);
      shifts.push({
        id: `demo-${w}-${j}`,
        date: iso(d),
        base_pay: [55.5, 64, 42.75, 76.25, 88, 109][j],
        tips: [38, 46.5, 29, 57.75, 68.5, 75][j],
        miles: [46, 53, 37, 62, 70, 78][j],
        minutes: [180, 225, 150, 240, 270, 300][j],
        notes: [
          "Lunch run",
          "Evening dash",
          "Quick lunch",
          "Dinner rush",
          "Friday dinner",
          "Weekend dash",
        ][j],
      });
    }
  const expenses: Expense[] = [
    {
      id: "demo-gas",
      date: start,
      category: "gas",
      amount: 48.75,
      business_percent: 80,
      notes: "Fuel up · 80% DoorDash",
    },
    {
      id: "demo-maintenance",
      date: shifts.at(-1)!.date,
      category: "maintenance",
      amount: 49.99,
      business_percent: 80,
      notes: "Oil change",
    },
  ];
  return { shifts, expenses };
}
function download(name: string, content: string, type: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
function ExportButton({
  shifts,
  expenses,
  label = "Export CSV",
}: {
  shifts: Shift[];
  expenses: Expense[];
  label?: string;
}) {
  return (
    <button
      className="button small quiet"
      onClick={() => {
        const rows: unknown[][] = [
          [
            "type",
            "date",
            "dash_pay",
            "tips",
            "gross",
            "stride_miles",
            "total_minutes",
            "expense_category",
            "expense_paid",
            "doordash_percent",
            "doordash_cost",
            "notes",
          ],
        ];
        shifts.forEach((s) =>
          rows.push([
            "shift",
            s.date,
            s.base_pay,
            s.tips,
            gross(s),
            s.miles,
            s.minutes,
            "",
            "",
            "",
            "",
            s.notes,
          ]),
        );
        expenses.forEach((e) =>
          rows.push([
            "expense",
            e.date,
            "",
            "",
            "",
            "",
            "",
            e.category,
            e.amount,
            e.business_percent,
            expenseCost(e),
            e.notes,
          ]),
        );
        download(
          `dashtracker-${today()}.csv`,
          rows.map((r) => r.map(csvCell).join(",")).join("\r\n"),
          "text/csv;charset=utf-8",
        );
      }}
    >
      <ArrowDownToLine size={15} />
      {label}
    </button>
  );
}
function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => {
      el?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <div>
          <span className="eyebrow">DASHTRACKER</span>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function EntryForm({
  editor,
  share,
  onClose,
  onSave,
}: {
  editor: NonNullable<Editor>;
  share: number;
  onClose: () => void;
  onSave: (
    kind: "shift" | "expense",
    v: Shift | Expense,
    existing: boolean,
  ) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [err, setErr] = useState(""),
    [date, setDate] = useState(editor.value?.date ?? today());
  const shift = editor.kind === "shift" ? editor.value : undefined,
    expense = editor.kind === "expense" ? editor.value : undefined;
  const [pay, setPay] = useState(String(shift?.base_pay ?? "")),
    [tips, setTips] = useState(String(shift?.tips ?? "")),
    [hours, setHours] = useState(
      shift ? String(Math.floor(shift.minutes / 60)) : "",
    ),
    [minutes, setMinutes] = useState(shift ? String(shift.minutes % 60) : ""),
    [miles, setMiles] = useState(String(shift?.miles ?? ""));
  const [amount, setAmount] = useState(String(expense?.amount ?? "")),
    [percent, setPercent] = useState(
      String(expense?.business_percent ?? share),
    ),
    [category, setCategory] = useState<"gas" | "maintenance">(
      expense?.category ?? "gas",
    ),
    [notes, setNotes] = useState(editor.value?.notes ?? "");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const id = editor.value?.id ?? crypto.randomUUID();
      if (editor.kind === "shift") {
        const s: Shift = {
          id,
          date,
          base_pay: Number(pay),
          tips: Number(tips),
          minutes: Number(hours) * 60 + Number(minutes),
          miles: Number(miles),
          notes: notes.trim(),
        };
        validateShift(s);
        if (!Number.isInteger(s.minutes))
          throw Error("Enter whole hours and minutes.");
        await onSave("shift", s, !!editor.value);
      } else {
        const v: Expense = {
          id,
          date,
          category,
          amount: Number(amount),
          business_percent: Number(percent),
          notes: notes.trim(),
        };
        validateExpense(v);
        await onSave("expense", v, !!editor.value);
      }
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const isShift = editor.kind === "shift";
  return (
    <Modal
      title={`${editor.value ? "Edit" : isShift ? "Log a" : "Add an"} ${isShift ? "shift" : "expense"}`}
      subtitle={
        isShift
          ? "A few numbers. A clearer picture."
          : "Keep track of what it costs to keep moving."
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <label>
          Date
          <input
            aria-label="Date"
            type="date"
            value={date}
            min="2026-01-01"
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        {isShift ? (
          <>
            <div className="form-grid">
              <label>
                Dash pay <span>before tips</span>
                <div className="input-affix">
                  <span>$</span>
                  <input
                    autoFocus
                    aria-label="Dash pay"
                    type="number"
                    min="0"
                    max="999999.99"
                    step=".01"
                    placeholder="0.00"
                    value={pay}
                    onChange={(e) => setPay(e.target.value)}
                    required
                  />
                </div>
              </label>
              <label>
                Customer tips
                <div className="input-affix">
                  <span>$</span>
                  <input
                    aria-label="Customer tips"
                    type="number"
                    min="0"
                    max="999999.99"
                    step=".01"
                    placeholder="0.00"
                    value={tips}
                    onChange={(e) => setTips(e.target.value)}
                    required
                  />
                </div>
              </label>
            </div>
            <div className="form-total">
              <span>Total shift earnings</span>
              <strong>{money(Number(pay) + Number(tips))}</strong>
            </div>
            <label>
              Total shift time <span>waiting, driving & drop-offs</span>
              <div className="form-grid">
                <div className="input-affix after">
                  <input
                    aria-label="Shift hours"
                    type="number"
                    min="0"
                    max="24"
                    step="1"
                    value={hours}
                    placeholder="0"
                    onChange={(e) => setHours(e.target.value)}
                  />
                  <span>hours</span>
                </div>
                <div className="input-affix after">
                  <input
                    aria-label="Shift minutes"
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    value={minutes}
                    placeholder="0"
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                  <span>minutes</span>
                </div>
              </div>
            </label>
            <label>
              Stride business miles
              <div className="input-affix after">
                <input
                  aria-label="Stride business miles"
                  type="number"
                  min="0"
                  max="99999.99"
                  step=".01"
                  placeholder="0.0"
                  value={miles}
                  onChange={(e) => setMiles(e.target.value)}
                  required
                />
                <span>mi</span>
              </div>
            </label>
            <p className="form-hint">
              <Route size={14} />
              {mileageRate(date) !== null
                ? `${num((mileageRate(date) ?? 0) * 100)}¢ per eligible mile · ${money(Number(miles) * (mileageRate(date) ?? 0))} tax deduction`
                : "Mileage saved. Tax rates for this year are not loaded yet."}
            </p>
          </>
        ) : (
          <>
            <div className="type-selector">
              <button
                className={category === "gas" ? "chosen" : ""}
                onClick={() => setCategory("gas")}
                type="button"
              >
                <Fuel size={20} />
                Gas
              </button>
              <button
                className={category === "maintenance" ? "chosen" : ""}
                onClick={() => setCategory("maintenance")}
                type="button"
              >
                <Wrench size={20} />
                Maintenance
              </button>
            </div>
            <div className="form-grid">
              <label>
                Total amount paid
                <div className="input-affix">
                  <span>$</span>
                  <input
                    autoFocus
                    aria-label="Total amount paid"
                    type="number"
                    min=".01"
                    max="999999.99"
                    step=".01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </label>
              <label>
                DoorDash share
                <div className="input-affix after">
                  <input
                    aria-label="DoorDash share"
                    type="number"
                    min="0"
                    max="100"
                    step=".01"
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    required
                  />
                  <span>%</span>
                </div>
              </label>
            </div>
            <div className="form-total">
              <span>Cost applied to your earnings</span>
              <strong>{money((Number(amount) * Number(percent)) / 100)}</strong>
            </div>
            <p className="form-hint">
              Use 100% to count the whole purchase. This affects your cash
              profit and hourly rate; your vehicle tax deduction uses Stride
              miles.
            </p>
          </>
        )}
        <label>
          Notes <span>optional</span>
          <textarea
            maxLength={2000}
            placeholder={
              isShift
                ? "Dinner rush, a great tip, anything worth remembering…"
                : "Gas station, oil change, new tires…"
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </label>
        {err && (
          <div className="inline-error" role="alert">
            {err}
          </div>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}{" "}
            {busy ? "Saving…" : `Save ${isShift ? "shift" : "expense"}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function StatCard({
  title,
  value,
  icon: Icon,
  sub,
  accent,
  children,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  sub: ReactNode;
  accent?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`stat-card ${accent ? "accent" : ""}`}>
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">
          <Icon size={17} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom">
        {sub}
        {children}
      </div>
    </div>
  );
}
function Chart({
  shifts,
  expenses,
  start,
  end,
  period,
}: {
  shifts: Shift[];
  expenses: Expense[];
  start: string;
  end: string;
  period: Period;
}) {
  const [metric, setMetric] = useState<"earnings" | "hourly">("earnings"),
    [hover, setHover] = useState<number | null>(null);
  const groups = useMemo(() => {
    const days = [];
    if (period === "year") {
      for (let m = 0; m < 12; m++) {
        const d = dateObj(start);
        d.setMonth(m, 1);
        const a = iso(d);
        d.setMonth(m + 1, 0);
        days.push({ a, b: iso(d), label: formatDate(a, { month: "short" }) });
      }
    } else {
      for (let d = dateObj(start); iso(d) <= end; d.setDate(d.getDate() + 1)) {
        const a = iso(d);
        days.push({
          a,
          b: a,
          label: formatDate(
            a,
            period === "week" ? { weekday: "short" } : { day: "numeric" },
          ),
        });
      }
    }
    return days.map((g) => ({
      ...g,
      ...summarize(
        shifts.filter((s) => inside(s.date, g.a, g.b)),
        expenses.filter((e) => inside(e.date, g.a, g.b)),
      ),
    }));
  }, [shifts, expenses, start, end, period]);
  const values = groups.map((g) =>
      metric === "earnings" ? g.revenue : g.grossHourly,
    ),
    nets = groups.map((g) => (metric === "earnings" ? g.profit : g.netHourly)),
    max = Math.max(40, ...values, ...nets) * 1.2,
    min = Math.min(0, ...nets),
    height = 190,
    width = 760;
  const point = (v: number, i: number) =>
    `${32 + (i * (width - 48)) / Math.max(1, groups.length - 1)},${12 + ((max - v) / (max - min)) * (height - 35)}`;
  const line = values.map(point).join(" "),
    net = nets.map(point).join(" "),
    base = 12 + (max / (max - min)) * (height - 35);
  const selected = hover === null ? null : groups[hover];
  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div>
          <h3>Earnings overview</h3>
          <p>See what you earn. Know what you keep.</p>
        </div>
        <div className="mini-tabs">
          <button
            className={metric === "earnings" ? "active" : ""}
            onClick={() => setMetric("earnings")}
          >
            Earnings
          </button>
          <button
            className={metric === "hourly" ? "active" : ""}
            onClick={() => setMetric("hourly")}
          >
            Hourly
          </button>
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i className="dot red" />
          Gross {metric === "hourly" ? " / hr" : ""}
        </span>
        <span>
          <i className="dot mint" />
          After expenses {metric === "hourly" ? " / hr" : ""}
        </span>
        <span className="chart-hover">
          {selected
            ? `${formatDate(selected.a)} · ${money(metric === "earnings" ? selected.revenue : selected.grossHourly)}`
            : ""}
        </span>
      </div>
      <div className="chart-wrap">
        <div className="chart-y">
          {[max, (max + min) / 2, min].map((v, i) => (
            <span key={i}>{money(v, 0)}</span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${metric} chart with ${groups.length} periods`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4b3e" stopOpacity=".2" />
              <stop offset="100%" stopColor="#ff4b3e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[12, (height - 35) / 2 + 12, height - 23].map((y, i) => (
            <line
              key={i}
              x1="25"
              x2={width - 10}
              y1={y}
              y2={y}
              stroke="#2b2c2f"
              strokeDasharray="3 5"
            />
          ))}
          {shifts.length > 0 && (
            <>
              <polygon
                points={`32,${base} ${line} ${width - 16},${base}`}
                fill="url(#area)"
              />
              <polyline
                points={line}
                fill="none"
                stroke="#ff5a4d"
                strokeWidth="2.6"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={net}
                fill="none"
                stroke="#8ed9bd"
                strokeWidth="2.1"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {groups.map((g, i) => (
                <g key={i} onMouseEnter={() => setHover(i)}>
                  <rect
                    x={
                      32 +
                      (i * (width - 48)) / Math.max(1, groups.length - 1) -
                      16
                    }
                    y="0"
                    width="32"
                    height={height}
                    fill="transparent"
                  />
                  <circle
                    cx={point(values[i], i).split(",")[0]}
                    cy={point(values[i], i).split(",")[1]}
                    r={hover === i ? 5 : 3}
                    fill="#ff5a4d"
                  />
                </g>
              ))}
            </>
          )}
        </svg>
        {!shifts.length && (
          <div className="chart-empty">
            <Activity size={22} />
            <span>Your next shift starts the story.</span>
            <small>Log a shift to bring your earnings to life.</small>
          </div>
        )}
      </div>
      <div className="chart-x">
        {groups.map((g, i) => (
          <span
            className={
              period === "month" && i % 5 !== 0 && i !== groups.length - 1
                ? "mobile-hide-label"
                : ""
            }
            key={i}
          >
            {period === "month" && i % 5 !== 0 && i !== groups.length - 1
              ? ""
              : g.label}
          </span>
        ))}
      </div>
    </section>
  );
}
function ShiftTable({
  shifts,
  cost,
  onEdit,
  onDelete,
  compact = false,
}: {
  shifts: Shift[];
  cost: number;
  onEdit: (s: Shift) => void;
  onDelete: (s: Shift) => void;
  compact?: boolean;
}) {
  const [search, setSearch] = useState(""),
    [sort, setSort] = useState("date-desc");
  const all = [...shifts]
    .filter((s) =>
      `${s.date} ${s.notes}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "gross"
        ? gross(b) - gross(a)
        : sort === "hourly"
          ? (gross(b) - allocateCost(b, shifts, cost)) / (b.minutes / 60) -
            (gross(a) - allocateCost(a, shifts, cost)) / (a.minutes / 60)
          : sort === "date-asc"
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date),
    );
  const rows = compact ? all.slice(0, 5) : all;
  return (
    <>
      <div className="table-tools">
        {!compact && (
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label="Search shifts"
              placeholder="Search dates or notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        <span className="muted">
          {shifts.length} {shifts.length === 1 ? "shift" : "shifts"} logged
        </span>
        {!compact && (
          <select
            aria-label="Sort shifts"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="gross">Highest earnings</option>
            <option value="hourly">Highest net / hr</option>
          </select>
        )}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>SHIFT</th>
              <th>TIME</th>
              <th>STRIDE MILES</th>
              <th>EARNINGS</th>
              <th>
                NET / HR{" "}
                <span title="Pre-tax. Period expenses allocated to each shift by miles, or by time when no miles are logged.">
                  ⓘ
                </span>
              </th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const hourly =
                (gross(s) - allocateCost(s, shifts, cost)) / (s.minutes / 60);
              return (
                <tr key={s.id}>
                  <td>
                    <div className="shift-cell">
                      <span className="shift-icon">
                        <Route size={17} />
                      </span>
                      <div>
                        <strong>
                          {formatDate(s.date, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </strong>
                        <small>{s.notes || "DoorDash shift"}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {Math.floor(s.minutes / 60)}h {s.minutes % 60}m
                  </td>
                  <td>
                    {num(s.miles)} <span className="muted">mi</span>
                  </td>
                  <td>
                    <strong>{money(gross(s))}</strong>
                    <small>{money(s.tips)} in tips</small>
                  </td>
                  <td>
                    <span className={hourly < 0 ? "rate negative" : "rate"}>
                      {money(hourly)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit shift ${s.date}`}
                        onClick={() => onEdit(s)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-button delete"
                        aria-label={`Delete shift ${s.date}`}
                        onClick={() => onDelete(s)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="empty-state">
          <Clock3 size={27} />
          <h4>
            {search ? "No matching shifts" : "Your first shift belongs here"}
          </h4>
          <p>
            {search
              ? "Try a different date or note."
              : "Log your earnings, total time, and Stride miles."}
          </p>
        </div>
      )}
      {shifts.length > 0 && (
        <p className="table-foot">
          Net / hr is before tax. Expenses in this period are shared across
          shifts by miles, or by time if no miles are logged.
        </p>
      )}
    </>
  );
}
function TaxDetails({
  tax,
  settings,
  onSettings,
}: {
  tax: ReturnType<typeof estimateTax>;
  settings: Settings;
  onSettings: () => void;
}) {
  return (
    <>
      <div className="tax-intro">
        <div className="tax-badge">
          <ShieldCheck size={25} />
        </div>
        <div>
          <span className="eyebrow">
            {settings.year} · SINGLE · ERIE COUNTY, NY
          </span>
          <h2>A clearer picture of tax time.</h2>
          <p>Estimated tax attributable to your recorded DoorDash earnings.</p>
        </div>
        <button className="button" onClick={onSettings}>
          <SlidersHorizontal size={16} />
          Tax settings
        </button>
      </div>
      {!tax.valid && (
        <div className="notice">
          {!tax.supported
            ? `You can track ${settings.year} shifts and expenses. Tax estimates are paused until verified rules for ${settings.year} are added.`
            : "This estimate supports annual adjusted gross income up to $50,000. Your recorded earnings plus other income exceed that range."}
        </div>
      )}
      <div className="tax-grid">
        <section className="panel tax-big">
          <div className="panel-head">
            <h3>Your tax reserve</h3>
            <span className="tag">{settings.year}</span>
          </div>
          <span className="muted">Estimated remaining to set aside</span>
          <div className="tax-total">
            {tax.valid ? money(tax.remaining) : "—"}
          </div>
          <p className="muted">After payments entered in settings.</p>
          <div className="tax-breakdown">
            <TaxRow
              label="Federal income tax"
              value={tax.federal}
              valid={tax.valid}
            />
            <TaxRow
              label="Self-employment tax"
              value={tax.se}
              valid={tax.valid}
            />
            <TaxRow
              label="New York State income tax"
              value={tax.state}
              valid={tax.valid}
            />
            <TaxRow
              label="Estimated tax before payments"
              value={tax.total}
              valid={tax.valid}
              bold
            />
            <TaxRow
              label="Payments toward DoorDash tax"
              value={settings.federal_paid + settings.state_paid}
              valid={tax.valid}
            />
          </div>
        </section>
        <section className="panel deduction-panel">
          <div className="panel-head">
            <h3>Working in your favor</h3>
            <span className="tiny-icon">
              <Sparkles size={17} />
            </span>
          </div>
          <div className="deduction">
            <span className="deduction-icon">
              <Route size={21} />
            </span>
            <div>
              <h4>Stride mileage deduction</h4>
              <p>Based on the date of each shift</p>
            </div>
            <strong>{tax.supported ? money(tax.mileage) : "—"}</strong>
          </div>
          <div className="deduction">
            <span className="deduction-icon">
              <CircleDollarSign size={21} />
            </span>
            <div>
              <h4>Qualified tips deduction</h4>
              <p>Federal + New York, within limits</p>
            </div>
            <strong>{tax.valid ? money(tax.tips) : "—"}</strong>
          </div>
          <div className="deduction">
            <span className="deduction-icon">
              <Wallet size={21} />
            </span>
            <div>
              <h4>Half of self-employment tax</h4>
              <p>Reduces income for income tax</p>
            </div>
            <strong>{tax.valid ? money(tax.halfSe) : "—"}</strong>
          </div>
          <div className="deduction">
            <span className="deduction-icon">
              <ReceiptText size={21} />
            </span>
            <div>
              <h4>QBI deduction</h4>
              <p>
                Federal only · {settings.qbi_enabled ? "enabled" : "disabled"}
              </p>
            </div>
            <strong>{tax.valid ? money(tax.qbi) : "—"}</strong>
          </div>
          <p className="form-hint">
            Deduction amounts reduce taxable income. They are not
            dollar-for-dollar tax savings.
          </p>
        </section>
      </div>
      <div className="tax-notes-grid">
        <section className="panel text-panel">
          <span className="eyebrow">NO TAX ON TIPS</span>
          <h3>Your tips deserve their own line.</h3>
          <p>
            For 2026, eligible voluntary customer tips can reduce federal and NY
            taxable income by up to $25,000, limited to net business income
            after allocable deductions. They still count for self-employment
            tax.
          </p>
          <p>
            Enter only tips that qualify and are properly reported. The estimate
            assumes a valid Social Security number and qualifying delivery work.
            Turn the deduction off in settings if you do not qualify.
          </p>
          <a
            href="https://www.irs.gov/newsroom/what-the-no-tax-on-tips-deduction-means-for-you"
            target="_blank"
            rel="noreferrer"
          >
            Read IRS guidance <ArrowUpRight size={14} />
          </a>
        </section>
        <section className="panel text-panel">
          <span className="eyebrow">HOW THIS ESTIMATE WORKS</span>
          <h3>Real costs. Separate tax math.</h3>
          <p>
            Cash profit uses the DoorDash share of dated gas and maintenance
            costs. Tax profit uses gross earnings minus eligible Stride mileage:
            72.5¢/mi Jan–Jun 2026 and 76¢/mi Jul–Dec 2026.
          </p>
          <p>
            This planning estimate uses recorded shifts, not projected future
            shifts. It assumes a single independent filer under 65, standard
            deductions, ordinary other income, and no tax credits, capital
            gains, loss carryforwards, health-insurance or retirement
            deductions. Credits may reduce your actual bill.
          </p>
          <a
            href="https://www.tax.ny.gov/pdf/current_forms/it/it2105i.pdf"
            target="_blank"
            rel="noreferrer"
          >
            New York estimated tax guidance <ArrowUpRight size={14} />
          </a>
        </section>
      </div>
      <p className="tax-disclaimer">
        Rules checked October 26, 2026. This is a planning estimate, not a tax
        return or a guaranteed balance due. No NYC, Yonkers, or MCTMT is
        included for local Erie County dashing. Federal tips relief currently
        runs through 2028; future-year rules must be verified before estimates
        are enabled.
      </p>
    </>
  );
}
function TaxRow({
  label,
  value,
  valid,
  bold,
}: {
  label: string;
  value: number;
  valid: boolean;
  bold?: boolean;
}) {
  return (
    <div className={bold ? "tax-row total" : "tax-row"}>
      <span>{label}</span>
      <strong>{valid ? money(value) : "—"}</strong>
    </div>
  );
}
function SettingsForm({
  value,
  onSave,
  onBackup,
}: {
  value: Settings;
  onSave: (s: Settings) => Promise<void>;
  onBackup: () => void;
}) {
  const [s, set] = useState(value),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const dirty = useRef(false);
  useEffect(() => {
    dirty.current = false;
    set(value);
    setSaved(false);
  }, [value.year]);
  useEffect(() => {
    if (!dirty.current) set(value);
  }, [value]);
  function field(k: keyof Settings, n: number | boolean) {
    dirty.current = true;
    set({ ...s, [k]: n });
    setSaved(false);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (
        ![
          s.other_income,
          s.federal_paid,
          s.state_paid,
          s.default_business_percent,
        ].every(Number.isFinite) ||
        s.other_income < 0 ||
        s.federal_paid < 0 ||
        s.state_paid < 0 ||
        s.default_business_percent < 0 ||
        s.default_business_percent > 100
      )
        throw Error("Check your amounts and DoorDash-use percentage.");
      await onSave(s);
      dirty.current = false;
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="panel-head">
          <div>
            <h3>Your {value.year} settings</h3>
            <p>Synced across your devices.</p>
          </div>
          <span className="tag">Single · Independent</span>
        </div>
        <form onSubmit={save}>
          <label>
            Other annual ordinary income
            <div className="input-affix">
              <span>$</span>
              <input
                aria-label="Other annual ordinary income"
                type="number"
                min="0"
                max="999999.99"
                step=".01"
                value={s.other_income}
                onChange={(e) => field("other_income", Number(e.target.value))}
              />
            </div>
          </label>
          <p className="form-hint">
            Wages and other ordinary income before the standard deduction.
            Default is $0. DoorDash tax is the additional income tax above this
            baseline, plus self-employment tax.
          </p>
          <div className="form-grid">
            <label>
              Federal payments for DoorDash
              <div className="input-affix">
                <span>$</span>
                <input
                  aria-label="Federal payments"
                  type="number"
                  min="0"
                  max="999999.99"
                  step=".01"
                  value={s.federal_paid}
                  onChange={(e) =>
                    field("federal_paid", Number(e.target.value))
                  }
                />
              </div>
            </label>
            <label>
              NY payments for DoorDash
              <div className="input-affix">
                <span>$</span>
                <input
                  aria-label="NY payments"
                  type="number"
                  min="0"
                  max="999999.99"
                  step=".01"
                  value={s.state_paid}
                  onChange={(e) => field("state_paid", Number(e.target.value))}
                />
              </div>
            </label>
          </div>
          <p className="form-hint">
            Enter payments allocated to your DoorDash taxes, not all withholding
            from another job. Payments reduce the remaining reserve, not
            after-tax earnings.
          </p>
          <label>
            Default DoorDash share of car expenses
            <div className="input-affix after">
              <input
                aria-label="Default DoorDash expense share"
                type="number"
                min="0"
                max="100"
                step=".01"
                value={s.default_business_percent}
                onChange={(e) =>
                  field("default_business_percent", Number(e.target.value))
                }
              />
              <span>%</span>
            </div>
          </label>
          <p className="form-hint">
            Starts at 100% so you can count the whole purchase. Adjust this for
            your personal driving; each expense can have its own share.
          </p>
          <label className="toggle-row">
            <div>
              <strong>Apply qualified tips deduction</strong>
              <p>Only for eligible, properly reported voluntary tips.</p>
            </div>
            <input
              type="checkbox"
              checked={s.tips_eligible}
              onChange={(e) => field("tips_eligible", e.target.checked)}
            />
          </label>
          <label className="toggle-row">
            <div>
              <strong>Include the QBI deduction</strong>
              <p>Assumes you qualify and actively participate in dashing.</p>
            </div>
            <input
              type="checkbox"
              checked={s.qbi_enabled}
              onChange={(e) => field("qbi_enabled", e.target.checked)}
            />
          </label>
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary" disabled={busy}>
            {saved ? <CheckCircle2 size={16} /> : <Check size={16} />}{" "}
            {busy ? "Saving…" : saved ? "Settings saved" : "Save settings"}
          </button>
        </form>
      </section>
      <div>
        <section className="panel text-panel">
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h3>Built around your dash.</h3>
          <dl className="workspace-details">
            <div>
              <dt>Home base</dt>
              <dd>Williamsville, NY</dd>
            </div>
            <div>
              <dt>County</dt>
              <dd>Erie County</dd>
            </div>
            <div>
              <dt>Week starts</dt>
              <dd>Monday</dd>
            </div>
            <div>
              <dt>Default date</dt>
              <dd>Today · Eastern Time</dd>
            </div>
            <div>
              <dt>Vehicle deduction</dt>
              <dd>Standard mileage</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>Public · No login</dd>
            </div>
          </dl>
        </section>
        <section className="panel text-panel backup-card">
          <Cloud size={22} />
          <h3>Your numbers, everywhere.</h3>
          <p>
            Records save directly to Supabase. Live updates, a 15-second
            refresh, and refresh on return keep your phone and PC in sync.
          </p>
          <button className="button" onClick={onBackup}>
            <ArrowDownToLine size={15} />
            Download full JSON backup
          </button>
        </section>
      </div>
    </div>
  );
}
export default function App() {
  const tracker = useTracker();
  const [page, setPage] = useState<Page>("Overview"),
    [period, setPeriod] = useState<Period>("month"),
    [anchor, setAnchor] = useState(today()),
    [editor, setEditor] = useState<Editor>(null),
    [deleting, setDeleting] = useState<{
      kind: "shift" | "expense";
      value: Shift | Expense;
    } | null>(null),
    [deleteBusy, setDeleteBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [demo, setDemo] = useState(false),
    [mobile, setMobile] = useState(false);
  const range = bounds(anchor, period),
    year = Number(anchor.slice(0, 4)),
    samples = useMemo(() => sampleData(anchor), [anchor]);
  const allShifts = demo ? samples.shifts : tracker.shifts,
    allExpenses = demo ? samples.expenses : tracker.expenses;
  const shifts = allShifts.filter((s) =>
      inside(s.date, range.start, range.end),
    ),
    expenses = allExpenses.filter((e) =>
      inside(e.date, range.start, range.end),
    ),
    sums = summarize(shifts, expenses);
  const settings =
      tracker.settings.find((s) => s.year === year) ?? defaultSettings(year),
    yearShifts = allShifts.filter((s) => Number(s.date.slice(0, 4)) === year),
    tax = estimateTax(yearShifts, settings),
    yearSums = summarize(
      yearShifts,
      allExpenses.filter((e) => Number(e.date.slice(0, 4)) === year),
    );
  const periodTaxValid =
    tax.valid && shifts.every((s) => s.date.startsWith(String(year)));
  const taxShare =
      periodTaxValid && yearSums.revenue > 0
        ? (tax.total * sums.revenue) / yearSums.revenue
        : 0,
    afterTax = sums.profit - taxShare;
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  const open = (e: Editor) => {
    if (demo) {
      setNotice("Leave sample preview to add or change your real records.");
      return;
    }
    setEditor(e);
  };
  const periodLabel =
    period === "year"
      ? String(year)
      : period === "month"
        ? formatDate(anchor, { month: "long", year: "numeric" })
        : `${formatDate(range.start)} – ${formatDate(range.end)}${range.start.slice(0, 4) !== range.end.slice(0, 4) ? "" : `, ${year}`}`;
  function navigate(p: Page) {
    setPage(p);
    setMobile(false);
  }
  async function save(
    kind: "shift" | "expense",
    value: Shift | Expense,
    existing: boolean,
  ) {
    if (kind === "shift") await tracker.saveShift(value as Shift, existing);
    else await tracker.saveExpense(value as Expense, existing);
    setAnchor(value.date);
    setNotice(
      `${kind === "shift" ? "Shift" : "Expense"} ${existing ? "updated" : "saved"} and synced.`,
    );
  }
  async function remove() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await tracker.remove(
        deleting.kind === "shift" ? "dash_shifts" : "dash_expenses",
        deleting.value.id,
      );
      setDeleting(null);
      setNotice("Record deleted.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  }
  const requestDelete = (kind: "shift" | "expense", value: Shift | Expense) => {
    if (demo) {
      setNotice("Sample records are read-only.");
      return;
    }
    setDeleting({ kind, value });
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Brand />
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="workspace">
          <span className="workspace-avatar">DT</span>
          <div>
            <strong>My dashboard</strong>
            <span>Personal workspace</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {(["Overview", "Shifts", "Expenses", "Taxes"] as Page[]).map((p) => {
            const Icon = icons[p];
            return (
              <button
                key={p}
                className={page === p ? "nav-item selected" : "nav-item"}
                onClick={() => navigate(p)}
              >
                <Icon size={19} />
                {p}
                {p === "Taxes" && <span className="nav-new">NY</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="mileage-card">
            <span className="mileage-symbol">
              <Route size={22} />
            </span>
            <span className="eyebrow">EVERY MILE MATTERS</span>
            <h4>
              Small shifts.
              <br />
              Bigger picture.
            </h4>
            <p>
              Your hard work adds up.
              <br />
              Keep a record of it.
            </p>
            <div className="mini-road">
              <span />
              <i />
              <span />
              <i />
              <span />
            </div>
          </div>
          <button
            className={page === "Settings" ? "nav-item selected" : "nav-item"}
            onClick={() => navigate("Settings")}
          >
            <Settings2 size={19} />
            Settings
          </button>
          <div className="sidebar-location">
            <MapPin size={14} />
            Williamsville, New York
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <button
              className={`sync-status ${tracker.error || !tracker.online ? "sync-error" : ""}`}
              onClick={() => void tracker.refresh()}
              title={
                tracker.lastSync
                  ? `Last synced ${tracker.lastSync.toLocaleTimeString()}. Click to refresh.`
                  : "Refresh data"
              }
            >
              {!tracker.online ? <CloudOff size={14} /> : <Cloud size={15} />}
              <span>
                {!configured
                  ? "Setup needed"
                  : !tracker.online
                    ? "Offline"
                    : tracker.loading
                      ? "Connecting…"
                      : tracker.error
                        ? "Sync error"
                        : "Synced to cloud"}
              </span>
              {configured && !tracker.error && tracker.online && <i />}
            </button>
            <span className="profile-avatar">DT</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                <span className="red-dash" />
                YOUR PERSONAL DASHBOARD
              </span>
              <h1>
                {page === "Overview"
                  ? "Every shift. Every dollar."
                  : page === "Shifts"
                    ? "Your shift history."
                    : page === "Expenses"
                      ? "The cost of the drive."
                      : page === "Taxes"
                        ? "Stay ahead of tax time."
                        : "Make it yours."}
              </h1>
              <p>
                {page === "Overview"
                  ? "A little clarity for all the miles you put in."
                  : page === "Shifts"
                    ? "Your time on the road, all in one place."
                    : page === "Expenses"
                      ? "Gas, upkeep, and a more honest hourly rate."
                      : page === "Taxes"
                        ? "Know what to set aside, and what you get to keep."
                        : "A few details to keep your numbers on track."}
              </p>
            </div>
            <div className="heading-actions">
              {page !== "Settings" && (
                <>
                  <button
                    className="button"
                    onClick={() => open({ kind: "expense" })}
                  >
                    <Plus size={16} />
                    Add expense
                  </button>
                  <button
                    className="button primary"
                    onClick={() => open({ kind: "shift" })}
                  >
                    <Plus size={17} />
                    Log a shift
                  </button>
                </>
              )}
            </div>
          </div>
          {!configured && (
            <div className="notice">
              <CloudOff size={18} />
              <span>
                Connect Supabase to start tracking. Add the two environment
                variables in the deployment guide, then rebuild. You can preview
                sample data below.
              </span>
            </div>
          )}
          {tracker.error && (
            <div className="notice error" role="alert">
              <CloudOff size={18} />
              <span>
                Sync failed: {tracker.error} Your form stays open if a save
                fails.
              </span>
              <button
                className="text-button"
                onClick={() => void tracker.refresh()}
              >
                Retry
              </button>
            </div>
          )}
          <div className="period-toolbar">
            <div className="period-tabs">
              {(["week", "month", "year"] as Period[]).map((p) => (
                <button
                  key={p}
                  className={period === p ? "active" : ""}
                  onClick={() => setPeriod(p)}
                >
                  {p === "week" ? "Week" : p === "month" ? "Month" : "Year"}
                </button>
              ))}
            </div>
            <div className="date-controls">
              <button
                className="icon-button"
                aria-label="Previous period"
                disabled={
                  bounds(movePeriod(anchor, period, -1), period).end <
                  "2026-01-01"
                }
                onClick={() => setAnchor(movePeriod(anchor, period, -1))}
              >
                <ChevronLeft size={17} />
              </button>
              <label className="date-picker">
                <CalendarDays size={16} />
                <span>{periodLabel}</span>
                <input
                  aria-label="Choose reporting date"
                  type="date"
                  min="2026-01-01"
                  value={anchor}
                  onChange={(e) => {
                    if (e.target.value) setAnchor(e.target.value);
                  }}
                />
              </label>
              <button
                className="icon-button"
                aria-label="Next period"
                onClick={() => setAnchor(movePeriod(anchor, period, 1))}
              >
                <ChevronRight size={17} />
              </button>
              <button
                className="text-button today-button"
                onClick={() => setAnchor(today())}
              >
                Today
              </button>
            </div>
            <ExportButton shifts={shifts} expenses={expenses} />
          </div>
          {demo && (
            <div className="demo-banner">
              <Sparkles size={16} />
              <span>
                <strong>Sample preview</strong> · These numbers are examples and
                are never saved.
              </span>
              <button onClick={() => setDemo(false)}>
                Back to my data <X size={14} />
              </button>
            </div>
          )}
          {page === "Overview" && (
            <>
              <div className="stats-grid">
                <StatCard
                  title="Gross earnings"
                  value={money(sums.revenue)}
                  icon={Wallet}
                  sub={
                    <>
                      <span className="metric-detail">
                        {money(sums.tips)} in tips
                      </span>
                      <span className="metric-fine">
                        {shifts.length} shifts
                      </span>
                    </>
                  }
                />
                <StatCard
                  title="After expenses"
                  value={money(sums.profit)}
                  icon={CircleDollarSign}
                  sub={
                    <>
                      <span className="metric-detail">
                        {money(sums.cost)} vehicle costs
                      </span>
                      <span className="metric-fine">Before tax</span>
                    </>
                  }
                />
                <StatCard
                  title="Your real hourly rate"
                  value={`${money(sums.netHourly)}`}
                  icon={Gauge}
                  accent
                  sub={
                    <>
                      <span className="metric-detail">
                        {num(sums.hours)} total shift hours
                      </span>
                      <span className="hour-unit">/ hr</span>
                    </>
                  }
                />
                <StatCard
                  title="Stride miles"
                  value={num(sums.miles)}
                  icon={Route}
                  sub={
                    <>
                      <span className="metric-detail">
                        {year === 2026
                          ? `${money(sums.mileage)} deduction`
                          : "Tax rate pending"}
                      </span>
                      <span className="metric-fine">mi</span>
                    </>
                  }
                />
              </div>
              <div className="overview-middle">
                <Chart
                  shifts={shifts}
                  expenses={expenses}
                  start={range.start}
                  end={range.end}
                  period={period}
                />
                <section className="panel tax-summary">
                  <div className="panel-head">
                    <h3>Tax set-aside</h3>
                    <span className="tag">{year}</span>
                  </div>
                  <span className="muted">Estimated remaining reserve</span>
                  <div className="reserve-value">
                    {tax.valid ? money(tax.remaining) : "—"}
                    <span className="reserve-icon">
                      <ArrowUpRight size={22} />
                    </span>
                  </div>
                  <div className="reserve-lines">
                    <TaxRow
                      label="Federal + self-employment"
                      value={tax.federalRemaining}
                      valid={tax.valid}
                    />
                    <TaxRow
                      label="New York State"
                      value={tax.stateRemaining}
                      valid={tax.valid}
                    />
                  </div>
                  <div className="tips-note">
                    <span className="tips-note-icon">
                      <ShieldCheck size={17} />
                    </span>
                    <div>
                      <strong>
                        {tax.valid
                          ? "Your tips deduction is included"
                          : !tax.supported
                            ? "Tax rules pending"
                            : "Review income settings"}
                      </strong>
                      <p>
                        {tax.valid
                          ? `${money(tax.tips)} of qualified tips deducted`
                          : "Earnings tracking is still available."}
                      </p>
                    </div>
                  </div>
                  <button
                    className="text-button tax-link"
                    onClick={() => navigate("Taxes")}
                  >
                    See tax breakdown <ArrowRight size={15} />
                  </button>
                  <span className="reserve-foot">
                    Full year · recorded earnings · before credits
                  </span>
                </section>
              </div>
              <div className="overview-bottom">
                <section className="panel shifts-panel">
                  <div className="panel-head">
                    <div>
                      <h3>
                        Recent shifts{" "}
                        <span className="count-badge">{shifts.length}</span>
                      </h3>
                      <p>A look at your latest miles.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("Shifts")}
                    >
                      View all <ArrowRight size={14} />
                    </button>
                  </div>
                  <ShiftTable
                    shifts={shifts}
                    cost={sums.cost}
                    compact
                    onEdit={(s) => open({ kind: "shift", value: s })}
                    onDelete={(s) => requestDelete("shift", s)}
                  />
                  {!shifts.length && (
                    <button
                      className="button empty-button"
                      onClick={() => open({ kind: "shift" })}
                    >
                      <Plus size={15} />
                      Log your first shift
                    </button>
                  )}
                </section>
                <section className="panel expense-summary">
                  <div className="panel-head">
                    <h3>Where it goes</h3>
                    <span className="tiny-icon">
                      <ReceiptText size={17} />
                    </span>
                  </div>
                  <div className="cost-row">
                    <span className="cost-icon gas">
                      <Fuel size={18} />
                    </span>
                    <div>
                      <strong>Gas</strong>
                      <span>
                        {expenses.filter((e) => e.category === "gas").length}{" "}
                        entries
                      </span>
                    </div>
                    <strong>{money(sums.gas)}</strong>
                  </div>
                  <div className="cost-row">
                    <span className="cost-icon maintenance">
                      <Wrench size={18} />
                    </span>
                    <div>
                      <strong>Maintenance</strong>
                      <span>
                        {
                          expenses.filter((e) => e.category === "maintenance")
                            .length
                        }{" "}
                        entries
                      </span>
                    </div>
                    <strong>{money(sums.maintenance)}</strong>
                  </div>
                  <div className="expense-total">
                    <span>Total DoorDash costs</span>
                    <strong>{money(sums.cost)}</strong>
                  </div>
                  <div className="after-tax-line">
                    <span>After-tax hourly estimate</span>
                    <strong>
                      {periodTaxValid
                        ? `${money(sums.hours ? afterTax / sums.hours : 0)}/hr`
                        : "—"}
                    </strong>
                  </div>
                  <p className="form-hint">
                    Tax allocated by your share of the year’s gross earnings.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => navigate("Expenses")}
                  >
                    Manage expenses <ArrowRight size={14} />
                  </button>
                </section>
              </div>
              {!allShifts.length && !demo && (
                <div className="onboarding-strip">
                  <div>
                    <span className="tiny-icon">
                      <Sparkles size={18} />
                    </span>
                    <span>
                      <strong>Curious how it all comes together?</strong> Take a
                      look with sample shifts.
                    </span>
                  </div>
                  <button className="text-button" onClick={() => setDemo(true)}>
                    Preview sample data <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
          {page === "Shifts" && (
            <>
              <div className="stats-grid three">
                <StatCard
                  title="Shifts logged"
                  value={String(shifts.length)}
                  icon={Clock3}
                  sub={`${num(sums.hours)} total hours`}
                />
                <StatCard
                  title="Gross earnings"
                  value={money(sums.revenue)}
                  icon={Wallet}
                  sub={`${money(sums.grossHourly)} / hr before expenses`}
                />
                <StatCard
                  title="After-expense hourly"
                  value={money(sums.netHourly)}
                  icon={Gauge}
                  accent
                  sub="Full shift time · before tax"
                />
              </div>
              <section className="panel full-table">
                <div className="panel-head">
                  <div>
                    <h3>All shifts</h3>
                    <p>{periodLabel} · Each shift tells part of the story.</p>
                  </div>
                </div>
                <ShiftTable
                  shifts={shifts}
                  cost={sums.cost}
                  onEdit={(s) => open({ kind: "shift", value: s })}
                  onDelete={(s) => requestDelete("shift", s)}
                />
              </section>
            </>
          )}
          {page === "Expenses" && (
            <>
              <div className="stats-grid three">
                <StatCard
                  title="Gas"
                  value={money(sums.gas)}
                  icon={Fuel}
                  sub="DoorDash share of fuel purchases"
                />
                <StatCard
                  title="Maintenance"
                  value={money(sums.maintenance)}
                  icon={Wrench}
                  sub="DoorDash share of repairs & upkeep"
                />
                <StatCard
                  title="Total vehicle costs"
                  value={money(sums.cost)}
                  icon={ReceiptText}
                  accent
                  sub="Subtracted from cash earnings"
                />
              </div>
              <section className="panel full-table">
                <div className="panel-head">
                  <div>
                    <h3>Expense history</h3>
                    <p>Independent of shifts. Counted on the date you paid.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => open({ kind: "expense" })}
                  >
                    <Plus size={15} />
                    Add expense
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>EXPENSE</th>
                        <th>DATE</th>
                        <th>PAID</th>
                        <th>DASH SHARE</th>
                        <th>DASH COST</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...expenses]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((e) => (
                          <tr key={e.id}>
                            <td>
                              <div className="shift-cell">
                                <span className={`cost-icon ${e.category}`}>
                                  {e.category === "gas" ? (
                                    <Fuel size={18} />
                                  ) : (
                                    <Wrench size={18} />
                                  )}
                                </span>
                                <div>
                                  <strong>
                                    {e.category === "gas"
                                      ? "Gas"
                                      : "Maintenance"}
                                  </strong>
                                  <small>{e.notes || "Vehicle expense"}</small>
                                </div>
                              </div>
                            </td>
                            <td>{formatDate(e.date)}</td>
                            <td>{money(e.amount)}</td>
                            <td>{num(e.business_percent)}%</td>
                            <td>
                              <strong>{money(expenseCost(e))}</strong>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  className="icon-button"
                                  aria-label={`Edit expense ${e.date}`}
                                  onClick={() =>
                                    open({ kind: "expense", value: e })
                                  }
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="icon-button delete"
                                  aria-label={`Delete expense ${e.date}`}
                                  onClick={() => requestDelete("expense", e)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!expenses.length && (
                  <div className="empty-state">
                    <Fuel size={28} />
                    <h4>A clear view of your costs</h4>
                    <p>Add gas or maintenance whenever you pay for it.</p>
                    <button
                      className="button"
                      onClick={() => open({ kind: "expense" })}
                    >
                      <Plus size={15} />
                      Add your first expense
                    </button>
                  </div>
                )}
                <p className="table-foot">
                  Vehicle costs affect cash profit and hourly earnings. Stride
                  mileage is used separately for tax estimates.
                </p>
              </section>
            </>
          )}
          {page === "Taxes" && (
            <TaxDetails
              tax={tax}
              settings={settings}
              onSettings={() => navigate("Settings")}
            />
          )}
          {page === "Settings" && (
            <SettingsForm
              value={settings}
              onSave={async (s) => {
                if (demo)
                  throw Error("Leave sample preview before changing settings.");
                await tracker.saveSettings(s);
                setNotice("Settings saved and synced.");
              }}
              onBackup={() =>
                download(
                  `dashtracker-backup-${today()}.json`,
                  JSON.stringify(
                    {
                      version: 1,
                      exported_at: new Date().toISOString(),
                      shifts: tracker.shifts,
                      expenses: tracker.expenses,
                      settings: tracker.settings,
                    },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            />
          )}
          <footer>
            <span>
              <span className="footer-dot" />
              Made for the miles ahead.
            </span>
            <span>
              DashTracker <span className="footer-divider">/</span> Independent
              personal tracker
            </span>
          </footer>
        </main>
      </div>
      {editor && (
        <EntryForm
          editor={editor}
          share={settings.default_business_percent}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}{" "}
      {deleting && (
        <Modal
          title="Delete this record?"
          subtitle={`${formatDate(deleting.value.date)} · This removes it from all your devices.`}
          onClose={() => {
            if (!deleteBusy) setDeleting(null);
          }}
        >
          <p className="delete-copy">
            This {deleting.kind} will be permanently removed. Your totals will
            update automatically.
          </p>
          <div className="modal-actions">
            <button
              className="button"
              disabled={deleteBusy}
              onClick={() => setDeleting(null)}
            >
              Keep record
            </button>
            <button
              className="button danger"
              disabled={deleteBusy}
              onClick={() => void remove()}
            >
              <Trash2 size={16} />
              {deleteBusy ? "Deleting…" : "Delete record"}
            </button>
          </div>
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
