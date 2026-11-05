/* ------------------------------------------------------------------
 * Gym Tracker — shared helpers, constants and formatting (Bahasa ID)
 * ------------------------------------------------------------------ */

export const STORAGE_KEY = "gymtracker:db:v1";
export const SESSION_KEY = "gymtracker:session";
export const SESSION_TEMP_KEY = "gymtracker:session:temp";
export const REST_KEY = "gymtracker:rest-timer";

export const SPLITS = {
  push: { key: "push", label: "Push", short: "Push", hex: "#465fff", soft: "rgba(70,95,255,.12)", icon: "push" },
  pull: { key: "pull", label: "Pull", short: "Pull", hex: "#7c3aed", soft: "rgba(124,58,237,.12)", icon: "pull" },
  legs: { key: "legs", label: "Legs", short: "Legs", hex: "#f79009", soft: "rgba(247,144,9,.14)", icon: "legs" },
  upper: { key: "upper", label: "Upper", short: "Upper", hex: "#06b6d4", soft: "rgba(6,182,212,.14)", icon: "upper" },
  lower: { key: "lower", label: "Lower", short: "Lower", hex: "#ec4899", soft: "rgba(236,72,153,.13)", icon: "lower" },
  full: { key: "full", label: "Full Body", short: "Full", hex: "#10b981", soft: "rgba(16,185,129,.13)", icon: "full" },
  rest: { key: "rest", label: "Rest Day", short: "Rest", hex: "#667085", soft: "rgba(102,112,133,.12)", icon: "rest" },
  custom: { key: "custom", label: "Lainnya", short: "Lain", hex: "#64748b", soft: "rgba(100,116,139,.12)", icon: "custom" },
};

export const SPLIT_KEYS = ["push", "pull", "legs", "upper", "lower", "full", "rest", "custom"];

export const SESSION_STATUS = {
  scheduled: { label: "Terjadwal", className: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" },
  in_progress: { label: "Sedang Berlangsung", className: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400" },
  completed: { label: "Selesai", className: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400" },
  missed: { label: "Terlewat", className: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" },
  rest: { label: "Rest Day", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
};

export const MUSCLES = ["Dada", "Punggung", "Kaki", "Bahu", "Lengan", "Core", "Cardio", "Full Body"];

export const EXERCISE_TYPES = {
  weighted: "Beban",
  bodyweight: "Bodyweight",
  cardio: "Cardio",
};

export const WEEKDAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const WEEKDAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

/* ---------------------------- IDs & dates ---------------------------- */

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key) {
  if (!key) return new Date();
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(input, amount) {
  const d = input instanceof Date ? new Date(input) : parseDateKey(input);
  d.setDate(d.getDate() + amount);
  return d;
}

export function addMonths(input, amount) {
  const d = input instanceof Date ? new Date(input) : parseDateKey(input);
  d.setMonth(d.getMonth() + amount);
  return d;
}

export function startOfWeek(input = new Date(), mondayStart = true) {
  const d = input instanceof Date ? new Date(input) : parseDateKey(input);
  const day = d.getDay();
  const diff = mondayStart ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysBetween(a, b) {
  const d1 = typeof a === "string" ? parseDateKey(a) : new Date(a);
  const d2 = typeof b === "string" ? parseDateKey(b) : new Date(b);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2 - d1) / 86400000);
}

export function formatDateID(input, opts = {}) {
  const d = typeof input === "string" ? parseDateKey(input) : input;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: opts.weekday || undefined,
    day: "numeric",
    month: opts.month || "long",
    year: opts.year || undefined,
  }).format(d);
}

export function formatShortDate(input) {
  const d = typeof input === "string" ? parseDateKey(input) : input;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);
}

export function formatDateTimeID(input) {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function isoAt(date, time = "18:30") {
  const d = typeof date === "string" ? parseDateKey(date) : new Date(date);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/* ---------------------------- math & format ---------------------------- */

export function round(value, decimals = 1) {
  const f = 10 ** decimals;
  return Math.round((Number(value) || 0) * f) / f;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function epley(weight, reps) {
  if (!weight || !reps) return 0;
  return round(Number(weight) * (1 + Number(reps) / 30), 1);
}

export function toDisplayWeight(kg, unit = "kg") {
  const n = Number(kg) || 0;
  return unit === "lb" ? round(n * 2.20462, 1) : round(n, 1);
}

export function fromDisplayWeight(value, unit = "kg") {
  const n = Number(value) || 0;
  return unit === "lb" ? round(n / 2.20462, 2) : round(n, 2);
}

export function formatWeight(kg, unit = "kg", withUnit = true) {
  const v = toDisplayWeight(kg, unit);
  const formatted = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
  return withUnit ? `${formatted} ${unit}` : formatted;
}

export function formatNumber(n, decimals = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: decimals }).format(Number(n) || 0);
}

export function formatDuration(minutes) {
  const m = Math.round(Number(minutes) || 0);
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}j ${rest}m` : `${h} jam`;
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatVolume(kg, unit = "kg") {
  const v = toDisplayWeight(kg, unit);
  if (v >= 1000) return `${formatNumber(v / 1000, 1)} rb ${unit}`;
  return `${formatNumber(v)} ${unit}`;
}

/* ---------------------------- misc ---------------------------- */

export function hashPassword(password) {
  // Demo-only obfuscation. Production auth is delegated to Supabase Auth.
  try {
    return btoa(unescape(encodeURIComponent(`gt::${password}`)));
  } catch {
    return `gt::${password}`;
  }
}

export function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function deltaLabel(current, previous) {
  if (!previous) return null;
  const diff = current - previous;
  const percentage = Math.round((diff / previous) * 100);
  return { diff, percentage, up: diff >= 0 };
}

export function sessionVolume(session) {
  if (!session?.exercises) return 0;
  return session.exercises.reduce((sum, ex) => {
    return sum + (ex.sets || []).reduce((s, set) => {
      if (set.isCompleted === false) return s;
      return s + (Number(set.reps) || 0) * (Number(set.weight) || 0);
    }, 0);
  }, 0);
}

export function exerciseVolume(exercise) {
  return (exercise.sets || []).reduce((sum, set) => {
    if (set.isCompleted === false) return sum;
    return sum + (Number(set.reps) || 0) * (Number(set.weight) || 0);
  }, 0);
}

export function sessionCompletedSets(session) {
  return (session?.exercises || []).reduce(
    (n, ex) => n + (ex.sets || []).filter((s) => s.isCompleted !== false).length,
    0,
  );
}

export function sessionExerciseCount(session) {
  return (session?.exercises || []).length;
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const el = document.createElement("textarea");
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  el.remove();
  return Promise.resolve();
}

export function go(url) {
  window.location.href = url;
}

export function queryParam(name, fallback = null) {
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

/* ---------------------------- default exercises ---------------------------- */

const EX = [
  ["bench-press", "Bench Press", "Dada", "weighted"],
  ["incline-dumbbell-press", "Incline Dumbbell Press", "Dada", "weighted"],
  ["chest-fly", "Cable Fly", "Dada", "weighted"],
  ["push-up", "Push Up", "Dada", "bodyweight"],
  ["dips", "Dips", "Dada", "bodyweight"],
  ["overhead-press", "Overhead Press", "Bahu", "weighted"],
  ["dumbbell-shoulder-press", "Dumbbell Shoulder Press", "Bahu", "weighted"],
  ["lateral-raise", "Lateral Raise", "Bahu", "weighted"],
  ["face-pull", "Face Pull", "Bahu", "weighted"],
  ["arnold-press", "Arnold Press", "Bahu", "weighted"],
  ["deadlift", "Deadlift", "Punggung", "weighted"],
  ["barbell-row", "Barbell Row", "Punggung", "weighted"],
  ["lat-pulldown", "Lat Pulldown", "Punggung", "weighted"],
  ["seated-cable-row", "Seated Cable Row", "Punggung", "weighted"],
  ["pull-up", "Pull Up", "Punggung", "bodyweight"],
  ["chin-up", "Chin Up", "Punggung", "bodyweight"],
  ["shrug", "Barbell Shrug", "Punggung", "weighted"],
  ["barbell-curl", "Barbell Curl", "Lengan", "weighted"],
  ["dumbbell-curl", "Dumbbell Curl", "Lengan", "weighted"],
  ["hammer-curl", "Hammer Curl", "Lengan", "weighted"],
  ["preacher-curl", "Preacher Curl", "Lengan", "weighted"],
  ["triceps-pushdown", "Triceps Pushdown", "Lengan", "weighted"],
  ["skull-crusher", "Skull Crusher", "Lengan", "weighted"],
  ["close-grip-bench", "Close Grip Bench Press", "Lengan", "weighted"],
  ["overhead-triceps-extension", "Overhead Triceps Extension", "Lengan", "weighted"],
  ["squat", "Back Squat", "Kaki", "weighted"],
  ["front-squat", "Front Squat", "Kaki", "weighted"],
  ["romanian-deadlift", "Romanian Deadlift", "Kaki", "weighted"],
  ["leg-press", "Leg Press", "Kaki", "weighted"],
  ["leg-extension", "Leg Extension", "Kaki", "weighted"],
  ["leg-curl", "Leg Curl", "Kaki", "weighted"],
  ["walking-lunges", "Walking Lunges", "Kaki", "weighted"],
  ["calf-raise", "Calf Raise", "Kaki", "weighted"],
  ["hip-thrust", "Hip Thrust", "Kaki", "weighted"],
  ["glute-bridge", "Glute Bridge", "Kaki", "bodyweight"],
  ["sumo-deadlift", "Sumo Deadlift", "Kaki", "weighted"],
  ["plank", "Plank", "Core", "bodyweight"],
  ["hanging-leg-raise", "Hanging Leg Raise", "Core", "bodyweight"],
  ["cable-crunch", "Cable Crunch", "Core", "weighted"],
  ["russian-twist", "Russian Twist", "Core", "bodyweight"],
  ["ab-wheel", "Ab Wheel", "Core", "bodyweight"],
  ["treadmill", "Treadmill", "Cardio", "cardio"],
  ["cycling", "Sepeda Statis", "Cardio", "cardio"],
  ["jump-rope", "Jump Rope", "Cardio", "cardio"],
  ["rowing-machine", "Rowing Machine", "Cardio", "cardio"],
  ["burpee", "Burpee", "Cardio", "bodyweight"],
];

export const DEFAULT_EXERCISES = EX.map(([id, name, muscle, type]) => ({
  id,
  name,
  muscle,
  type,
  isCustom: false,
}));

export const EXERCISE_BY_ID = Object.fromEntries(DEFAULT_EXERCISES.map((e) => [e.id, e]));

export function getSplit(key) {
  return SPLITS[key] || SPLITS.custom;
}

export function splitStyle(key) {
  const split = getSplit(key);
  return `background-color:${split.soft};color:${split.hex}`;
}
