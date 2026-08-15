/** Retorna a data (YYYY-MM-DD) da segunda-feira da semana de `d`. */
export function getMondayISO(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 = domingo ... 6 = sábado
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return toISODate(date);
}

export function addWeeksISO(iso: string, weeks: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Ex.: "11/08 – 17/08" */
export function formatWeekLabel(iso: string): string {
  const start = new Date(iso + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function isCurrentWeek(iso: string): boolean {
  return iso === getMondayISO();
}
