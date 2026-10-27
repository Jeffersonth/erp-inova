import assert from "node:assert/strict";
import {
  habitDay,
  habitMonth,
  habitMonthDays,
  habitStats,
  habitGrowth,
  type Habit,
} from "../src/lib/habits";

const habit: Habit = {
  id: "a",
  titulo: "Ler",
  descricao: "",
  cor: "#21805C",
  inicio: "2026-10-01",
  arquivado: false,
};
const checks = (...days: string[]) =>
  days.map((data) => ({ habito_id: "a", data }));
assert.equal(habitDay("2024-02-28", 1), "2024-02-29");
assert.equal(habitDay("2026-12-31", 1), "2027-01-01");
assert.equal(habitMonth("2026-01", -1), "2025-12");
assert.equal(habitMonthDays("2024-02").days.length, 29);
assert.equal(habitMonthDays("2026-02").days.length, 28);
assert.equal(habitMonthDays("2026-10").first, 4);

const current = habitStats(
  habit,
  checks("2026-10-25", "2026-10-26"),
  "2026-10-27",
);
assert.equal(
  current.current,
  2,
  "today is still available; yesterday's streak stays alive",
);
assert.equal(current.doneToday, false);
assert.equal(current.monthPossible, 27);
assert.equal(current.percent, 7);
const unique = habitStats(
  habit,
  [
    ...checks(
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-27",
      "2026-10-28",
      "2026-09-30",
    ),
    { habito_id: "other", data: "2026-10-24" },
  ],
  "2026-10-27",
);
assert.equal(unique.total, 3);
assert.equal(unique.current, 3);
assert.equal(unique.best, 3);
assert.equal(unique.doneToday, true);
const gap = habitStats(
  habit,
  checks("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-25", "2026-10-27"),
  "2026-10-27",
);
assert.equal(gap.current, 1);
assert.equal(gap.best, 3);
assert.equal(habitStats(habit, checks("2026-10-25"), "2026-10-27").current, 0);
assert.equal(habitStats(habit, [], "2026-10-27", "2026-11").percent, 0);
assert.equal(
  habitStats(
    { ...habit, inicio: "2026-10-27" },
    checks("2026-10-27"),
    "2026-10-27",
  ).percent,
  100,
);
assert.equal(
  habitStats(habit, checks("2026-10-01"), "2026-10-27", "2026-09")
    .monthPossible,
  0,
);
assert.equal(habitGrowth(0).name, "Semente");
assert.equal(habitGrowth(7).next, 21);
assert.equal(habitGrowth(66).next, null);
console.log(
  "Habit date, streak, deduplication, progress and growth checks passed.",
);
