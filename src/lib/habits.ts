export type Habit = {
  id: string;
  titulo: string;
  descricao: string;
  cor: string;
  inicio: string;
  arquivado: boolean;
};
export type HabitCheck = { habito_id: string; data: string };
export const HABIT_COLORS = [
  { value: "#C51E72", label: "Rosa" },
  { value: "#21805C", label: "Verde" },
  { value: "#7A5AF8", label: "Lavanda" },
  { value: "#C45B26", label: "Laranja" },
  { value: "#247CB0", label: "Azul" },
  { value: "#AB8230", label: "Dourado" },
];
export const habitUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function habitDay(day: string, offset: number) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export const habitDateLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date + "T12:00:00Z"));
export function habitMonth(month: string, offset = 0) {
  return new Date(
    Date.UTC(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)) - 1 + offset,
      1,
    ),
  )
    .toISOString()
    .slice(0, 7);
}
export function habitMonthDays(month: string) {
  const start = month + "-01";
  const first = new Date(start + "T12:00:00Z").getUTCDay();
  const count = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  return {
    first,
    days: Array.from({ length: count }, (_, i) => habitDay(start, i)),
  };
}
export function habitStats(
  habit: Habit,
  checks: HabitCheck[],
  today: string,
  month = today.slice(0, 7),
) {
  const days = Array.from(
    new Set(
      checks
        .filter(
          (c) =>
            c.habito_id === habit.id &&
            c.data >= habit.inicio &&
            c.data <= today,
        )
        .map((c) => c.data),
    ),
  ).sort();
  const marked = new Set(days);
  let current = 0;
  let cursor = marked.has(today) ? today : habitDay(today, -1);
  while (cursor >= habit.inicio && marked.has(cursor)) {
    current++;
    cursor = habitDay(cursor, -1);
  }
  let best = 0,
    run = 0,
    previous = "";
  for (const day of days) {
    run = previous && habitDay(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  const eligible = habitMonthDays(month).days.filter(
    (d) => d >= habit.inicio && d <= today,
  );
  const completed = eligible.filter((d) => marked.has(d)).length;
  return {
    marked,
    total: days.length,
    current,
    best,
    doneToday: marked.has(today),
    monthDone: completed,
    monthPossible: eligible.length,
    percent: eligible.length
      ? Math.round((completed / eligible.length) * 100)
      : 0,
  };
}
export function habitGrowth(total: number) {
  if (total >= 66) return { name: "Raízes fortes", next: null };
  if (total >= 21) return { name: "Florescendo", next: 66 };
  if (total >= 7) return { name: "Crescendo", next: 21 };
  if (total >= 1) return { name: "Broto", next: 7 };
  return { name: "Semente", next: 1 };
}
