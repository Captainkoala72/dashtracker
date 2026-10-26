import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Expense, Settings, Shift } from "./domain";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(
  url && key && key !== "YOUR_SUPABASE_PUBLISHABLE_KEY",
);
const db = configured
  ? createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
export function useTracker() {
  const [shifts, setShifts] = useState<Shift[]>([]),
    [expenses, setExpenses] = useState<Expense[]>([]),
    [settings, setSettings] = useState<Settings[]>([]);
  const [loading, setLoading] = useState(configured),
    [error, setError] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [lastSync, setLastSync] = useState<Date | null>(null);
  const mounted = useRef(true),
    fetching = useRef(false),
    activeWrites = useRef(0),
    generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!db || fetching.current || activeWrites.current) return;
    fetching.current = true;
    const version = generation.current;
    try {
      // Explicit pagination avoids Supabase's default 1,000-row response limit.
      async function all(table: string) {
        let rows: unknown[] = [];
        for (let start = 0; ; start += 1000) {
          const r = await db!
            .from(table)
            .select("*")
            .order(table === "dash_settings" ? "year" : "id")
            .range(start, start + 999);
          if (r.error) throw r.error;
          rows = rows.concat(r.data);
          if (r.data.length < 1000) break;
        }
        return rows;
      }
      const [s, e, p] = await Promise.all([
        all("dash_shifts"),
        all("dash_expenses"),
        all("dash_settings"),
      ]);
      if (
        mounted.current &&
        !activeWrites.current &&
        version === generation.current
      ) {
        setShifts(s as Shift[]);
        setExpenses(e as Expense[]);
        setSettings(p as Settings[]);
        setLastSync(new Date());
        setError("");
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : (e as { message?: string }).message ||
                "Could not sync with Supabase. Try again.",
        );
    } finally {
      fetching.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onOnline = () => {
        setOnline(true);
        void refresh();
      },
      onOffline = () => setOnline(false),
      onFocus = () => void refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    const channel = db
      ?.channel("dashtracker-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dash_shifts" },
        onFocus,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dash_expenses" },
        onFocus,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dash_settings" },
        onFocus,
      )
      .subscribe();
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onFocus);
      if (channel) void db?.removeChannel(channel);
    };
  }, [refresh]);
  async function write(
    table: string,
    value: Shift | Expense | Settings,
    existing: boolean,
  ) {
    if (!db)
      throw Error(
        "Add your Supabase environment variables and redeploy to save records.",
      );
    if (!navigator.onLine)
      throw Error(
        "You are offline. Keep this form open and reconnect to save.",
      );
    activeWrites.current++;
    generation.current++;
    try {
      const payload: Record<string, unknown> = {
        ...value,
        updated_at: new Date().toISOString(),
      };
      // Updating only one row keeps an edit on one device from overwriting other records.
      let query;
      if (table === "dash_settings")
        query = db.from(table).upsert(payload, { onConflict: "year" });
      else
        query = existing
          ? db
              .from(table)
              .update(payload)
              .eq("id", (value as Shift | Expense).id)
          : db.from(table).insert(payload);
      const { error, data } = await query.select();
      if (error) throw Error(error.message);
      if (!data?.length)
        throw Error("Record no longer exists. Refresh and try again.");
      if (table === "dash_shifts")
        setShifts((prev) => [
          ...prev.filter((v) => v.id !== (value as Shift).id),
          data[0] as Shift,
        ]);
      if (table === "dash_expenses")
        setExpenses((prev) => [
          ...prev.filter((v) => v.id !== (value as Expense).id),
          data[0] as Expense,
        ]);
      if (table === "dash_settings")
        setSettings((prev) => [
          ...prev.filter((v) => v.year !== (value as Settings).year),
          data[0] as Settings,
        ]);
      setLastSync(new Date());
      setError("");
    } finally {
      activeWrites.current--;
    }
    await refresh();
  }
  async function remove(table: string, id: string) {
    if (!db) throw Error("Supabase is not configured.");
    activeWrites.current++;
    generation.current++;
    try {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw Error(error.message);
      if (table === "dash_shifts")
        setShifts((prev) => prev.filter((s) => s.id !== id));
      if (table === "dash_expenses")
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      setLastSync(new Date());
      setError("");
    } finally {
      activeWrites.current--;
    }
    await refresh();
  }
  return {
    shifts,
    expenses,
    settings,
    loading,
    error,
    online,
    lastSync,
    refresh,
    saveShift: (s: Shift, existing: boolean) =>
      write("dash_shifts", s, existing),
    saveExpense: (e: Expense, existing: boolean) =>
      write("dash_expenses", e, existing),
    saveSettings: (s: Settings) => write("dash_settings", s, true),
    remove,
  };
}
