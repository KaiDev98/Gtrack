import {
  DEFAULT_EXERCISES,
  addDays,
  dateKey,
  daysBetween,
  hashPassword,
  isoAt,
  round,
  uid,
  WEEKDAYS_ID,
} from "./lib.js";

const WEIGHT_BASE = {
  "bench-press": 60,
  "incline-dumbbell-press": 22.5,
  "dumbbell-shoulder-press": 20,
  "overhead-press": 32.5,
  "lateral-raise": 8,
  "triceps-pushdown": 25,
  "deadlift": 100,
  "lat-pulldown": 50,
  "barbell-row": 50,
  "face-pull": 20,
  "barbell-curl": 12.5,
  "hammer-curl": 12.5,
  "squat": 80,
  "romanian-deadlift": 60,
  "leg-press": 120,
  "leg-extension": 35,
  "leg-curl": 30,
  "walking-lunges": 16,
  "calf-raise": 40,
};

const TEMPLATE_DEFS = [
  {
    id: "tpl-push",
    name: "Push Day",
    splitType: "push",
    exercises: [
      ["bench-press", 4, 6, 10, 120],
      ["incline-dumbbell-press", 3, 8, 12, 90],
      ["dumbbell-shoulder-press", 3, 8, 12, 90],
      ["lateral-raise", 3, 12, 15, 60],
      ["triceps-pushdown", 3, 10, 15, 60],
    ],
  },
  {
    id: "tpl-pull",
    name: "Pull Day",
    splitType: "pull",
    exercises: [
      ["deadlift", 3, 5, 8, 150],
      ["lat-pulldown", 3, 8, 12, 90],
      ["barbell-row", 3, 8, 12, 90],
      ["face-pull", 3, 12, 15, 60],
      ["barbell-curl", 3, 10, 12, 60],
    ],
  },
  {
    id: "tpl-legs",
    name: "Leg Day",
    splitType: "legs",
    exercises: [
      ["squat", 4, 6, 10, 150],
      ["romanian-deadlift", 3, 8, 12, 120],
      ["leg-press", 3, 10, 15, 90],
      ["leg-extension", 3, 12, 15, 60],
      ["calf-raise", 4, 12, 20, 60],
    ],
  },
  {
    id: "tpl-upper",
    name: "Upper Body",
    splitType: "upper",
    exercises: [
      ["bench-press", 3, 8, 10, 120],
      ["barbell-row", 3, 8, 12, 90],
      ["overhead-press", 3, 8, 10, 90],
      ["lat-pulldown", 3, 10, 12, 60],
      ["hammer-curl", 2, 10, 12, 60],
    ],
  },
  {
    id: "tpl-lower",
    name: "Lower Body",
    splitType: "lower",
    exercises: [
      ["squat", 3, 8, 10, 120],
      ["romanian-deadlift", 3, 8, 12, 90],
      ["walking-lunges", 3, 10, 12, 60],
      ["leg-curl", 3, 12, 15, 60],
      ["calf-raise", 3, 15, 20, 60],
    ],
  },
];

function makeExercises() {
  return DEFAULT_EXERCISES.map((e) => ({ ...e }));
}

function makeTemplates() {
  return TEMPLATE_DEFS.map((t) => ({
    ...t,
    exercises: t.exercises.map(([exerciseId, targetSets, targetRepsMin, targetRepsMax, restSeconds]) => ({
      exerciseId,
      targetSets,
      targetRepsMin,
      targetRepsMax,
      restSeconds,
    })),
    createdAt: new Date().toISOString(),
  }));
}

function buildSets(exerciseId, targetSets, repsMin, repsMax, restSeconds, weekProgress, isCompleted) {
  const base = WEIGHT_BASE[exerciseId] ?? 20;
  const isCompound = ["bench-press", "deadlift", "squat", "barbell-row", "overhead-press", "romanian-deadlift", "leg-press"].includes(exerciseId);
  const weight = round(base + weekProgress * (isCompound ? 2.5 : 1.25), 2);
  const sets = [];
  for (let i = 0; i < targetSets; i++) {
    const reps = Math.max(repsMin, repsMax - (i > 1 ? 1 : 0) - (i % 2));
    sets.push({
      id: uid("set"),
      order: i + 1,
      reps,
      weight,
      isCompleted,
      restSeconds,
    });
  }
  return sets;
}

function buildSession({ date, splitType, template, weekProgress, status = "completed", journal = null }) {
  const exercises = template.exercises.map((t, index) => ({
    id: uid("sex"),
    exerciseId: t.exerciseId,
    order: index + 1,
    durationMinutes: null,
    note: "",
    sets: buildSets(t.exerciseId, t.targetSets, t.targetRepsMin, t.targetRepsMax, t.restSeconds, weekProgress, status === "completed"),
  }));
  const duration = status === "completed" ? 48 + ((date.getDate() + date.getMonth()) % 18) : 0;
  return {
    id: uid("ses"),
    date: dateKey(date),
    splitType,
    status,
    templateId: template.id,
    startedAt: status === "completed" ? isoAt(date, "18:30") : null,
    endedAt: status === "completed" ? isoAt(date, `${18 + Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`) : null,
    durationMinutes: duration,
    notes: "",
    journal,
    exercises,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const JOURNALS = [
  { notes: "Bench terasa ringan hari ini. Fokus kontrol tempo turun.", fatigue: 3, sleep: 4, mood: 4, tags: ["progres baik"] },
  { notes: "Deadlift grip agak licin, perlu chalk next time.", fatigue: 4, sleep: 3, mood: 3, tags: ["grip lemah"] },
  { notes: "Squat dalam, lutut aman. Leg press lanjut naik beban minggu depan.", fatigue: 4, sleep: 5, mood: 5, tags: ["leg day"] },
  { notes: "Bahu kanan sedikit nyeri saat lateral raise. Turunkan volume.", fatigue: 3, sleep: 3, mood: 3, tags: ["nyeri bahu", "kurang tidur"] },
  { notes: "Sesi singkat tapi padat. Energi bagus setelah makan cukup.", fatigue: 2, sleep: 4, mood: 5, tags: ["energi bagus"] },
];

function buildDemoSessions(templates) {
  const sessions = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plan = {
    0: { split: "rest" },
    1: { split: "push", tpl: "tpl-push" },
    2: { split: "pull", tpl: "tpl-pull" },
    3: { split: "legs", tpl: "tpl-legs" },
    4: { split: "rest" },
    5: { split: "upper", tpl: "tpl-upper" },
    6: { split: "lower", tpl: "tpl-lower" },
  };
  const templateById = Object.fromEntries(templates.map((t) => [t.id, t]));
  let completedIndex = 0;

  for (let offset = 56; offset >= 1; offset--) {
    const date = addDays(today, -offset);
    const entry = plan[date.getDay()];
    if (!entry || entry.split === "rest") continue;
    const weeksAgo = Math.max(1, Math.ceil(offset / 7));
    const weekProgress = Math.max(0, 8 - weeksAgo);
    const isMissed = offset === 45 || offset === 24 || offset === 10;
    const template = templateById[entry.tpl];
    const journal = !isMissed && completedIndex % 6 === 0 ? JOURNALS[completedIndex % JOURNALS.length] : null;
    sessions.push(
      buildSession({
        date,
        splitType: entry.split,
        template,
        weekProgress,
        status: isMissed ? "missed" : "completed",
        journal,
      }),
    );
    if (!isMissed) completedIndex++;
  }

  // Today: a ready-to-start Push session so the core flow can be tried instantly.
  const push = templateById["tpl-push"];
  const todaySession = buildSession({
    date: today,
    splitType: "push",
    template: push,
    weekProgress: 8,
    status: "scheduled",
  });
  todaySession.exercises.forEach((ex) => {
    ex.sets.forEach((set) => {
      set.isCompleted = false;
    });
  });
  sessions.push(todaySession);

  return sessions;
}

function buildBodyMetrics() {
  const today = new Date();
  const entries = [];
  const weights = [74.8, 74.2, 73.9, 73.4, 73.0, 72.6, 72.1, 71.8, 71.4, 71.2];
  const fats = [20.4, 20.0, 19.6, 19.1, 18.7, 18.2, 17.8, 17.5, 17.2, 17.1];
  const arms = [34.0, 34.2, 34.3, 34.5, 34.6, 34.8, 34.9, 35.0, 35.1, 35.2];
  const chests = [98.0, 98.2, 98.4, 98.6, 98.7, 98.9, 99.0, 99.2, 99.4, 99.5];
  const waists = [84.0, 83.6, 83.1, 82.7, 82.2, 81.8, 81.4, 81.0, 80.7, 80.5];
  for (let i = 0; i < weights.length; i++) {
    entries.push({
      id: uid("body"),
      date: dateKey(addDays(today, -7 * (weights.length - 1 - i))),
      weightKg: weights[i],
      bodyFatPct: fats[i],
      armCm: arms[i],
      chestCm: chests[i],
      waistCm: waists[i],
      thighCm: null,
      shoulderCm: null,
      hipCm: null,
      note: i === weights.length - 1 ? "Timbang pagi, perut kosong." : "",
    });
  }
  return entries;
}

function buildNotifications(todaySession) {
  const now = new Date();
  const ago = (mins) => new Date(now.getTime() - mins * 60000).toISOString();
  return [
    {
      id: uid("ntf"),
      type: "reminder",
      title: "Hari ini Push Day 💪",
      body: "Sesi terjadwal jam 18:30. Siap angkat?",
      date: ago(35),
      read: false,
      href: `workout.html?id=${todaySession.id}`,
    },
    {
      id: uid("ntf"),
      type: "pr",
      title: "PR Baru! Bench Press",
      body: "80 kg × 8 — estimasi 1RM 101,3 kg 🏆",
      date: ago(60 * 26),
      read: false,
      href: "progress.html",
    },
    {
      id: uid("ntf"),
      type: "milestone",
      title: "Milestone tercapai 🎉",
      body: "Total volume latihanmu melewati 10.000 kg.",
      date: ago(60 * 24 * 3),
      read: true,
      href: "progress.html",
    },
    {
      id: uid("ntf"),
      type: "body",
      title: "Waktunya timbang & ukur",
      body: "Catat progres tubuh minggu ini agar tetap terpantau.",
      date: ago(60 * 24 * 6),
      read: true,
      href: "body.html",
    },
  ];
}

export function createEmptyUserData() {
  return {
    exercises: makeExercises(),
    sessions: [],
    templates: [],
    weeklyPlan: {
      0: { split: "rest", templateId: null },
      1: { split: "push", templateId: null },
      2: { split: "pull", templateId: null },
      3: { split: "legs", templateId: null },
      4: { split: "rest", templateId: null },
      5: { split: "upper", templateId: null },
      6: { split: "lower", templateId: null },
    },
    prEvents: [],
    bodyMetrics: [],
    notifications: [],
    milestones: [],
    settings: {
      restTimerAuto: true,
      restTimerSound: true,
      restTimerVibration: true,
      defaultRestSeconds: 90,
      showPreviousPerformance: true,
      notifications: {
        workoutReminder: { enabled: true, time: "17:30", days: [1, 2, 3, 5, 6] },
        restDay: { enabled: true, time: "08:00" },
        missedSession: { enabled: false, time: "21:00" },
        bodyReminder: { enabled: true, time: "08:00", days: [0] },
        restTimer: { enabled: true },
        pushEnabled: false,
      },
    },
  };
}

export function createDemoDatabase() {
  const userId = "user-demo";
  const templates = makeTemplates();
  const sessions = buildDemoSessions(templates);
  const todaySession = sessions.find((s) => s.date === dateKey(new Date()));
  const notifications = buildNotifications(todaySession);

  const user = {
    id: userId,
    name: "Rafi Pratama",
    email: "demo@gymtracker.app",
    password: hashPassword("demo1234"),
    avatar: "",
    unitWeight: "kg",
    unitLength: "cm",
    timezone: "Asia/Jakarta",
    targetDaysPerWeek: 5,
    defaultRestSeconds: 90,
    goalWeightKg: 69,
    onboardingComplete: true,
    createdAt: addDays(new Date(), -63).toISOString(),
  };

  const data = createEmptyUserData();
  data.templates = templates;
  data.sessions = sessions;
  data.weeklyPlan = {
    0: { split: "rest", templateId: null },
    1: { split: "push", templateId: "tpl-push" },
    2: { split: "pull", templateId: "tpl-pull" },
    3: { split: "legs", templateId: "tpl-legs" },
    4: { split: "rest", templateId: null },
    5: { split: "upper", templateId: "tpl-upper" },
    6: { split: "lower", templateId: "tpl-lower" },
  };
  data.bodyMetrics = buildBodyMetrics();
  data.notifications = notifications;
  data.settings.notifications.workoutReminder.days = [1, 2, 3, 5, 6];

  return {
    version: 1,
    users: [user],
    data: { [userId]: data },
  };
}

export function weekdayName(day) {
  return WEEKDAYS_ID[day] || "";
}
