const FUSO_HORARIO = "America/Sao_Paulo";

/**
 * Data de hoje (YYYY-MM-DD) no horário de Brasília. Não depende do fuso
 * da máquina: a Vercel roda em UTC, e sem isso o servidor "virava" a
 * semana às 21h de domingo.
 */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Retorna a data (YYYY-MM-DD) da segunda-feira da semana de `d` (padrão: hoje, em Brasília). */
export function getMondayISO(d?: Date): string {
  const date = d ? new Date(d) : new Date(todayISO() + "T00:00:00");
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

/** Confere se é uma data real no formato YYYY-MM-DD (recusa 2026-02-31, por exemplo). */
export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export function isMondayISO(iso: string): boolean {
  return isValidISODate(iso) && new Date(iso + "T00:00:00Z").getUTCDay() === 1;
}

export function isCurrentWeek(iso: string): boolean {
  return iso === getMondayISO();
}

/** Ex.: "26/08/2026" a partir de "2026-08-26" */
export function formatDateBR(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
