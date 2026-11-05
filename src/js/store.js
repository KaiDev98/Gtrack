import {
  DEFAULT_EXERCISES,
  EXERCISE_BY_ID,
  SESSION_KEY,
  SESSION_TEMP_KEY,
  SPLITS,
  STORAGE_KEY,
  addDays,
  clamp,
  dateKey,
  daysBetween,
  epley,
  formatDateID,
  formatWeight,
  hashPassword,
  parseDateKey,
  pct,
  round,
  sessionVolume,
  startOfWeek,
  uid,
  WEEKDAYS_ID,
} from "./lib.js";
import { createDemoDatabase, createEmptyUserData } from "./seed.js";

const ATTEMPTS_KEY = "gymtracker:login-attempts";

export function getStoredSession() {
  return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || null;
}

function setStoredSession(userId, remember = true) {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  if (!userId) return;
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, userId);
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.users && parsed.data) return parsed;
    }
  } catch (err) {
    console.warn("Gagal membaca data lokal, memuat data demo.", err);
  }
  const demo = createDemoDatabase();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
  return demo;
}

function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function deepMerge(target, patch) {
  const out = { ...target };
  Object.keys(patch || {}).forEach((key) => {
    const val = patch[key];
    if (val && typeof val === "object" && !Array.isArray(val) && target?.[key] && typeof target[key] === "object") {
      out[key] = deepMerge(target[key], val);
    } else {
      out[key] = val;
    }
  });
  return out;
}

function readAttempts() {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAttempts(attempts) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}

export const App = {
  /* ============================ state ============================ */
  db: null,
  userId: null,
  user: null,
  data: null,
  ready: false,

  init() {
    this.db = loadDb();
    const storedId = getStoredSession();
    if (storedId) {
      const user = this.db.users.find((u) => u.id === storedId);
      if (user) {
        this.userId = user.id;
        this.user = user;
        this.data = this.db.data[user.id];
        this.markMissedSessions();
      }
    }
    this.ready = true;
    return this;
  },

  persist() {
    if (this.db) saveDb(this.db);
  },

  syncUser() {
    if (!this.userId) return;
    this.userId = this.userId;
    this.user = this.db.users.find((u) => u.id === this.userId) || null;
    this.data = this.db.data[this.userId] || null;
  },

  requireData() {
    if (!this.data) throw new Error("Data pengguna belum dimuat.");
    return this.data;
  },

  /* ============================ auth ============================ */
  isAuthenticated() {
    return Boolean(this.user);
  },

  signIn(email, password, remember = true) {
    const attempts = readAttempts();
    const key = String(email || "").toLowerCase().trim();
    const entry = attempts[key];
    if (entry?.until && entry.until > Date.now()) {
      const minutes = Math.ceil((entry.until - Date.now()) / 60000);
      return { ok: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.` };
    }

    const user = this.db.users.find((u) => u.email.toLowerCase() === key);
    if (!user || user.password !== hashPassword(password)) {
      const next = { count: (entry?.count || 0) + 1, until: 0 };
      if (next.count >= 5) next.until = Date.now() + 10 * 60000;
      attempts[key] = next;
      writeAttempts(attempts);
      return {
        ok: false,
        error: next.count >= 5 ? "Terlalu banyak percobaan. Tunggu 10 menit." : "Email atau password salah.",
      };
    }

    delete attempts[key];
    writeAttempts(attempts);
    this.userId = user.id;
    this.user = user;
    this.data = this.db.data[user.id];
    setStoredSession(user.id, remember);
    this.markMissedSessions();
    return { ok: true, user };
  },

  signUp({ name, email, password }) {
    const cleanEmail = String(email || "").toLowerCase().trim();
    if (this.db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { ok: false, error: "Email sudah terdaftar. Gunakan email lain atau masuk." };
    }
    const user = {
      id: uid("user"),
      name: String(name || "").trim(),
      email: cleanEmail,
      password: hashPassword(password),
      avatar: "",
      unitWeight: "kg",
      unitLength: "cm",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
      targetDaysPerWeek: 4,
      defaultRestSeconds: 90,
      goalWeightKg: null,
      onboardingComplete: false,
      createdAt: new Date().toISOString(),
    };
    this.db.users.push(user);
    this.db.data[user.id] = createEmptyUserData();
    saveDb(this.db);
    this.userId = user.id;
    this.user = user;
    this.data = this.db.data[user.id];
    setStoredSession(user.id, true);
    return { ok: true, user };
  },

  signOut() {
    this.userId = null;
    this.user = null;
    this.data = null;
    setStoredSession(null);
    localStorage.removeItem(SESSION_TEMP_KEY);
    window.location.href = "signin.html";
  },

  completeOnboarding(payload) {
    if (!this.user) return;
    Object.assign(this.user, {
      unitWeight: payload.unitWeight || "kg",
      unitLength: payload.unitLength || "cm",
      timezone: payload.timezone || this.user.timezone,
      targetDaysPerWeek: Number(payload.targetDaysPerWeek) || 4,
      defaultRestSeconds: Number(payload.defaultRestSeconds) || 90,
      onboardingComplete: true,
    });
    if (payload.notifications !== undefined) {
      const enabled = Boolean(payload.notifications);
      this.data.settings.notifications.workoutReminder.enabled = enabled;
      this.data.settings.notifications.restDay.enabled = enabled;
      this.data.settings.notifications.bodyReminder.enabled = enabled;
    }
    this.persist();
  },

  updateUser(patch) {
    if (!this.user) return;
    Object.assign(this.user, patch);
    this.persist();
  },

  userWeightUnit() {
    return this.user?.unitWeight || "kg";
  },

  userLengthUnit() {
    return this.user?.unitLength || "cm";
  },

  /* ============================ exercises ============================ */
  exercises() {
    return this.data?.exercises || DEFAULT_EXERCISES;
  },

  exerciseById(id) {
    return this.data?.exercises.find((e) => e.id === id) || EXERCISE_BY_ID[id] || { id, name: id, muscle: "Lainnya", type: "weighted" };
  },

  addExercise({ name, muscle = "Lainnya", type = "weighted" }) {
    const clean = String(name || "").trim();
    if (!clean) return { ok: false, error: "Nama gerakan wajib diisi." };
    if (this.exercises().some((e) => e.name.toLowerCase() === clean.toLowerCase())) {
      return { ok: false, error: "Gerakan dengan nama ini sudah ada." };
    }
    const exercise = { id: uid("ex"), name: clean, muscle, type, isCustom: true };
    this.data.exercises.push(exercise);
    this.persist();
    return { ok: true, exercise };
  },

  deleteExercise(id) {
    const ex = this.data.exercises.find((e) => e.id === id);
    if (!ex?.isCustom) return { ok: false, error: "Gerakan bawaan tidak dapat dihapus." };
    this.data.exercises = this.data.exercises.filter((e) => e.id !== id);
    this.persist();
    return { ok: true };
  },

  /* ============================ sessions ============================ */
  markMissedSessions() {
    if (!this.data) return;
    const today = dateKey(new Date());
    let changed = false;
    this.data.sessions.forEach((s) => {
      if ((s.status === "scheduled" || s.status === "in_progress") && s.date < today) {
        s.status = "missed";
        changed = true;
      }
    });
    if (changed) this.persist();
  },

  sessions() {
    return [...(this.data?.sessions || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  },

  sessionById(id) {
    return this.data?.sessions.find((s) => s.id === id) || null;
  },

  sessionByDate(date) {
    return this.data?.sessions.find((s) => s.date === date) || null;
  },

  scheduleSession({ date, split, templateId = null }) {
    if (!date) return { ok: false, error: "Pilih tanggal terlebih dahulu." };
    const existing = this.sessionByDate(date);
    if (existing) return { ok: false, error: "Tanggal ini sudah memiliki sesi." };
    const template = templateId ? this.templateById(templateId) : null;
    const session = this.buildSession({ date, split: split || template?.splitType || "custom", template, status: split === "rest" ? "rest" : "scheduled" });
    this.data.sessions.push(session);
    this.persist();
    return { ok: true, session };
  },

  repeatSession(sourceId, date) {
    const source = this.sessionById(sourceId);
    if (!source) return { ok: false, error: "Sesi sumber tidak ditemukan." };
    if (!date) return { ok: false, error: "Pilih tanggal terlebih dahulu." };
    if (this.sessionByDate(date)) return { ok: false, error: "Tanggal ini sudah memiliki sesi." };
    const session = {
      id: uid("ses"),
      date,
      splitType: source.splitType,
      status: source.splitType === "rest" ? "rest" : "scheduled",
      templateId: source.templateId || null,
      startedAt: null,
      endedAt: null,
      durationMinutes: 0,
      notes: "",
      journal: null,
      exercises: (source.exercises || []).map((ex, index) => ({
        id: uid("sex"),
        exerciseId: ex.exerciseId,
        order: index + 1,
        durationMinutes: null,
        note: "",
        sets: (ex.sets || []).map((set, i) => ({
          id: uid("set"),
          order: i + 1,
          reps: Number(set.reps) || 10,
          weight: Number(set.weight) || 0,
          restSeconds: Number(set.restSeconds) || this.data.settings.defaultRestSeconds || 90,
          isCompleted: false,
        })),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.sessions.push(session);
    this.persist();
    return { ok: true, session };
  },

  buildSession({ date, split, template = null, status = "scheduled" }) {
    const exercises = (template?.exercises || []).map((t, index) => {
      const last = this.lastPerformance(t.exerciseId);
      const sets = [];
      for (let i = 0; i < (t.targetSets || 3); i++) {
        sets.push({
          id: uid("set"),
          order: i + 1,
          reps: t.targetRepsMax || 10,
          weight: last?.weight || 0,
          isCompleted: false,
          restSeconds: t.restSeconds || this.data?.settings?.defaultRestSeconds || 90,
        });
      }
      return {
        id: uid("sex"),
        exerciseId: t.exerciseId,
        order: index + 1,
        durationMinutes: null,
        note: "",
        sets,
      };
    });
    return {
      id: uid("ses"),
      date,
      splitType: split,
      status,
      templateId: template?.id || null,
      startedAt: null,
      endedAt: null,
      durationMinutes: 0,
      notes: "",
      journal: null,
      exercises,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  saveSession(session) {
    if (!session) return;
    const idx = this.data.sessions.findIndex((s) => s.id === session.id);
    session.updatedAt = new Date().toISOString();
    if (idx >= 0) this.data.sessions[idx] = session;
    else this.data.sessions.push(session);
    this.persist();
  },

  startSession(id) {
    const session = this.sessionById(id);
    if (!session) return { ok: false };
    if (!session.startedAt) session.startedAt = new Date().toISOString();
    if (session.status !== "in_progress") session.status = "in_progress";
    session.updatedAt = new Date().toISOString();
    this.persist();
    return { ok: true, session };
  },

  finishSession(id, durationOverride = null) {
    const session = this.sessionById(id);
    if (!session) return { ok: false, error: "Sesi tidak ditemukan." };
    const before = this.milestones().filter((m) => m.achieved).map((m) => m.code);
    const computed = session.startedAt ? Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)) : 0;
    const duration = Number(durationOverride) || session.durationMinutes || computed;
    if (!duration) return { ok: false, error: "Durasi latihan wajib diisi minimal 1 menit." };
    if (!session.exercises.length) return { ok: false, error: "Tambahkan minimal satu gerakan sebelum menyelesaikan sesi." };
    session.status = "completed";
    session.endedAt = new Date().toISOString();
    session.durationMinutes = duration;
    session.updatedAt = new Date().toISOString();
    this.persist();
    const after = this.milestones();
    const newlyAchieved = after.filter((m) => m.achieved && !before.includes(m.code));
    newlyAchieved.forEach((m) => this.addNotification({ type: "milestone", title: "Milestone tercapai 🎉", body: m.title, href: "progress.html" }));
    return { ok: true, session, newlyAchieved };
  },

  toggleSessionComplete(id) {
    const session = this.sessionById(id);
    if (!session) return { ok: false };
    if (session.status === "completed") {
      session.status = "scheduled";
      session.endedAt = null;
    } else {
      if (!session.exercises.length) return { ok: false, error: "Sesi belum memiliki gerakan." };
      session.status = "completed";
      session.endedAt = new Date().toISOString();
      if (!session.startedAt) session.startedAt = session.endedAt;
      if (!session.durationMinutes) session.durationMinutes = 45;
    }
    session.updatedAt = new Date().toISOString();
    this.persist();
    return { ok: true, session };
  },

  deleteSession(id) {
    this.data.sessions = this.data.sessions.filter((s) => s.id !== id);
    this.persist();
    return { ok: true };
  },

  /* ============================ performance helpers ============================ */
  lastPerformance(exerciseId, excludeSessionId = null) {
    const sessions = this.sessions()
      .filter((s) => s.status === "completed" && s.id !== excludeSessionId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const session of sessions) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) continue;
      const sets = ex.sets.filter((s) => s.isCompleted !== false && Number(s.reps) > 0);
      if (!sets.length) continue;
      const top = [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
      return {
        sessionId: session.id,
        date: session.date,
        weight: top.weight,
        reps: top.reps,
        volume: sets.reduce((sum, s) => sum + s.reps * s.weight, 0),
        oneRm: Math.max(...sets.map((s) => epley(s.weight, s.reps))),
      };
    }
    return null;
  },

  sessionExerciseVolume(session, exerciseId) {
    const ex = session.exercises?.find((e) => e.exerciseId === exerciseId);
    if (!ex) return 0;
    return ex.sets.filter((s) => s.isCompleted !== false).reduce((sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weight) || 0), 0);
  },

  detectPRs(session, exerciseId, setId) {
    const exercise = this.exerciseById(exerciseId);
    const targetEx = session.exercises.find((e) => e.exerciseId === exerciseId);
    const targetSet = targetEx?.sets.find((s) => s.id === setId);
    if (!targetSet || !targetSet.isCompleted) return [];

    let prevWeight = 0;
    let prevOneRm = 0;
    let prevReps = 0;
    let prevVolume = 0;
    let hadPrevious = false;

    this.data.sessions.forEach((s) => {
      if (s.status === "rest") return;
      s.exercises?.forEach((ex) => {
        if (ex.exerciseId !== exerciseId) return;
        let sessionVol = 0;
        ex.sets?.forEach((set) => {
          if (set.id === setId || set.isCompleted === false || !Number(set.reps)) return;
          hadPrevious = true;
          sessionVol += set.reps * set.weight;
          prevWeight = Math.max(prevWeight, Number(set.weight) || 0);
          prevOneRm = Math.max(prevOneRm, epley(set.weight, set.reps));
          prevReps = Math.max(prevReps, Number(set.reps) || 0);
        });
        if (s.id !== session.id) prevVolume = Math.max(prevVolume, sessionVol);
      });
    });

    const currentVolume = this.sessionExerciseVolume(session, exerciseId);
    const hits = [];

    const consider = (type, label, value, previous, unit) => {
      if (previous <= 0) return;
      if (value <= previous) return;
      hits.push({ type, label, value: round(value, 2), previous: round(previous, 2), unit, exerciseId, exerciseName: exercise.name });
    };

    consider("weight", "Beban terberat", Number(targetSet.weight) || 0, prevWeight, "kg");
    consider("oneRm", "Estimasi 1RM", epley(targetSet.weight, targetSet.reps), prevOneRm, "kg");
    consider("reps", "Repetisi terbanyak", Number(targetSet.reps) || 0, prevReps, "reps");
    consider("volume", "Volume sesi tertinggi", currentVolume, prevVolume, "kg");

    const fresh = hits.filter((h) => {
      const duplicate = this.data.prEvents.some(
        (e) => e.exerciseId === h.exerciseId && e.type === h.type && (e.value === h.value || (h.type === "volume" && e.sessionId === session.id)),
      );
      return !duplicate;
    });

    fresh.forEach((hit) => {
      this.data.prEvents.push({
        id: uid("pr"),
        exerciseId,
        type: hit.type,
        value: hit.value,
        previous: hit.previous,
        reps: targetSet.reps,
        weight: targetSet.weight,
        sessionId: session.id,
        achievedAt: new Date().toISOString(),
      });
    });
    if (fresh.length) {
      this.persist();
      fresh.forEach((hit) => {
        this.addNotification({
          type: "pr",
          title: `PR Baru! ${exercise.name} 🏆`,
          body: `${hit.label}: ${this.formatHitValue(hit.value, hit.unit)} (sebelumnya ${this.formatHitValue(hit.previous, hit.unit)}).`,
          href: "progress.html",
        });
      });
    }
    return fresh;
  },

  formatHitValue(value, unit) {
    if (unit === "reps") return `${value} reps`;
    return formatWeight(value, this.userWeightUnit() || "kg");
  },

  prSummary() {
    const best = {};
    const history = [];
    const sessions = [...this.data.sessions]
      .filter((s) => s.status !== "rest")
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    sessions.forEach((session) => {
      const volumeByExercise = {};
      session.exercises?.forEach((ex) => {
        const sets = (ex.sets || []).filter((s) => s.isCompleted !== false && Number(s.reps) > 0);
        if (!sets.length) return;
        const key = ex.exerciseId;
        const exercise = this.exerciseById(key);
        const bucket =
          best[key] ||
          (best[key] = {
            exerciseId: key,
            name: exercise.name,
            muscle: exercise.muscle,
            weight: null,
            oneRm: null,
            reps: null,
            volume: null,
          });

        sets.forEach((set) => {
          const w = Number(set.weight) || 0;
          const reps = Number(set.reps) || 0;
          const oneRm = epley(w, reps);
          const push = (type, value, previous, unit) => {
            const current = bucket[type];
            if (!current || value > current.value) {
              if (current) {
                history.push({
                  id: `${session.id}-${key}-${type}-${set.id}`,
                  exerciseId: key,
                  exerciseName: exercise.name,
                  type,
                  value: round(value, 2),
                  previous: current.value,
                  unit,
                  reps,
                  weight: w,
                  date: session.date,
                  sessionId: session.id,
                });
              }
              bucket[type] = { value: round(value, 2), reps, weight: w, date: session.date, sessionId: session.id };
            }
          };
          if (w > 0) push("weight", w, bucket.weight?.value, "kg");
          if (oneRm > 0) push("oneRm", oneRm, bucket.oneRm?.value, "kg");
          if (reps > 0) push("reps", reps, bucket.reps?.value, "reps");
        });

        const volume = sets.reduce((sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weight) || 0), 0);
        volumeByExercise[key] = volume;
      });

      Object.entries(volumeByExercise).forEach(([key, volume]) => {
        const bucket = best[key];
        if (!bucket || volume <= 0) return;
        const current = bucket.volume;
        if (!current || volume > current.value) {
          if (current) {
            history.push({
              id: `${session.id}-${key}-volume`,
              exerciseId: key,
              exerciseName: bucket.name,
              type: "volume",
              value: round(volume, 2),
              previous: current.value,
              unit: "kg",
              date: session.date,
              sessionId: session.id,
            });
          }
          bucket.volume = { value: round(volume, 2), date: session.date, sessionId: session.id };
        }
      });
    });

    const recent = history.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    return { best, history, recent };
  },

  prForExercise(exerciseId) {
    return this.prSummary().best[exerciseId] || null;
  },

  /* ============================ stats & charts ============================ */
  weekRange(offset = 0) {
    const start = startOfWeek(new Date());
    start.setDate(start.getDate() + offset * 7);
    const end = addDays(start, 6);
    return { start, end, startKey: dateKey(start), endKey: dateKey(end) };
  },

  weekStats(offset = 0) {
    const { startKey, endKey } = this.weekRange(offset);
    const sessions = this.data.sessions.filter((s) => s.date >= startKey && s.date <= endKey);
    const completed = sessions.filter((s) => s.status === "completed");
    const planned = sessions.filter((s) => s.status !== "rest" && s.splitType !== "rest");
    const volume = completed.reduce((sum, s) => sum + sessionVolume(s), 0);
    const duration = completed.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
    return {
      startKey,
      endKey,
      completed: completed.length,
      planned: planned.length || this.user?.targetDaysPerWeek || 0,
      volume,
      duration,
      sessions,
      completionRate: pct(completed.length, planned.length || this.user?.targetDaysPerWeek || 1),
    };
  },

  streak() {
    const map = {};
    this.data.sessions.forEach((s) => {
      if (s.status === "completed") map[s.date] = true;
    });
    const plan = this.data.weeklyPlan || {};
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    const first = this.data.sessions.reduce((min, s) => (!min || s.date < min ? s.date : min), null);
    if (!first) return 0;
    for (let i = 0; i < 400; i++) {
      const key = dateKey(cursor);
      if (key < first) break;
      const dayPlan = plan[cursor.getDay()]?.split;
      if (map[key]) streak++;
      else if (dayPlan === "rest") {
        /* rest days don't break the streak */
      } else if (i === 0) {
        /* today may not be trained yet */
      } else break;
      cursor = addDays(cursor, -1);
    }
    return streak;
  },

  totalVolume() {
    return this.data.sessions.filter((s) => s.status === "completed").reduce((sum, s) => sum + sessionVolume(s), 0);
  },

  totalCompletedSessions() {
    return this.data.sessions.filter((s) => s.status === "completed").length;
  },

  dashboardStats() {
    const week = this.weekStats(0);
    const prev = this.weekStats(-1);
    return {
      week,
      prev,
      streak: this.streak(),
      totalCompleted: this.totalCompletedSessions(),
      totalVolume: this.totalVolume(),
      volumeDelta: prev.volume ? Math.round(((week.volume - prev.volume) / prev.volume) * 100) : null,
      durationDelta: prev.duration ? Math.round(((week.duration - prev.duration) / prev.duration) * 100) : null,
    };
  },

  volumeSeries(period = "weekly") {
    const completed = this.data.sessions.filter((s) => s.status === "completed");
    if (period === "daily") {
      const points = [];
      for (let i = 13; i >= 0; i--) {
        const d = addDays(new Date(), -i);
        const key = dateKey(d);
        const volume = completed.filter((s) => s.date === key).reduce((sum, s) => sum + sessionVolume(s), 0);
        points.push({ label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d), value: volume });
      }
      return points;
    }
    if (period === "monthly") {
      const points = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const volume = completed.filter((s) => s.date.startsWith(prefix)).reduce((sum, s) => sum + sessionVolume(s), 0);
        points.push({ label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(d), value: volume });
      }
      return points;
    }
    const points = [];
    for (let i = 7; i >= 0; i--) {
      const { startKey, endKey } = this.weekRange(-i);
      const volume = completed.filter((s) => s.date >= startKey && s.date <= endKey).reduce((sum, s) => sum + sessionVolume(s), 0);
      points.push({ label: i === 0 ? "Minggu ini" : `${i} mg lalu`, value: volume });
    }
    return points;
  },

  frequencySeries(period = "weekly") {
    const completed = this.data.sessions.filter((s) => s.status === "completed");
    if (period === "daily") {
      const points = [];
      for (let i = 13; i >= 0; i--) {
        const d = addDays(new Date(), -i);
        const key = dateKey(d);
        points.push({ label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d), value: completed.filter((s) => s.date === key).length });
      }
      return points;
    }
    if (period === "monthly") {
      const points = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        points.push({
          label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(d),
          value: completed.filter((s) => s.date.startsWith(prefix)).length,
        });
      }
      return points;
    }
    const points = [];
    for (let i = 7; i >= 0; i--) {
      const { startKey, endKey } = this.weekRange(-i);
      points.push({ label: i === 0 ? "Minggu ini" : `${i} mg lalu`, value: completed.filter((s) => s.date >= startKey && s.date <= endKey).length });
    }
    return points;
  },

  splitDistribution(days = 90) {
    const cutoff = days ? dateKey(addDays(new Date(), -days)) : "0000-00-00";
    const counts = {};
    this.data.sessions
      .filter((s) => s.status === "completed" && s.date >= cutoff)
      .forEach((s) => {
        counts[s.splitType] = (counts[s.splitType] || 0) + 1;
      });
    return Object.entries(counts).map(([key, value]) => ({
      key,
      label: SPLITS[key]?.label || key,
      value,
      color: SPLITS[key]?.hex || "#667085",
    }));
  },

  exerciseProgress(exerciseId, range = "3m") {
    const months = { "1m": 1, "3m": 3, "6m": 6, all: 120 }[range] || 3;
    const cutoff = dateKey(addDays(new Date(), -months * 30));
    return this.data.sessions
      .filter((s) => s.status === "completed" && s.date >= cutoff)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((s) => {
        const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
        if (!ex) return null;
        const sets = ex.sets.filter((set) => set.isCompleted !== false && Number(set.reps) > 0);
        if (!sets.length) return null;
        return {
          date: s.date,
          label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(parseDateKey(s.date)),
          weight: Math.max(...sets.map((set) => Number(set.weight) || 0)),
          oneRm: Math.max(...sets.map((set) => epley(set.weight, set.reps))),
          volume: sets.reduce((sum, set) => sum + set.reps * set.weight, 0),
          reps: Math.max(...sets.map((set) => Number(set.reps) || 0)),
        };
      })
      .filter(Boolean);
  },

  /* ============================ templates ============================ */
  templates() {
    return this.data?.templates || [];
  },

  templateById(id) {
    return this.data?.templates.find((t) => t.id === id) || null;
  },

  saveTemplate(template) {
    if (!template?.name?.trim()) return { ok: false, error: "Nama template wajib diisi." };
    if (!template.exercises?.length) return { ok: false, error: "Tambahkan minimal satu gerakan." };
    const idx = this.data.templates.findIndex((t) => t.id === template.id);
    if (idx >= 0) this.data.templates[idx] = template;
    else this.data.templates.push({ ...template, id: template.id || uid("tpl"), createdAt: new Date().toISOString() });
    this.persist();
    return { ok: true, template };
  },

  createTemplate(payload) {
    const template = {
      id: uid("tpl"),
      name: payload.name,
      splitType: payload.splitType || "custom",
      exercises: payload.exercises || [],
      createdAt: new Date().toISOString(),
    };
    return this.saveTemplate(template);
  },

  deleteTemplate(id) {
    this.data.templates = this.data.templates.filter((t) => t.id !== id);
    Object.keys(this.data.weeklyPlan || {}).forEach((day) => {
      if (this.data.weeklyPlan[day]?.templateId === id) this.data.weeklyPlan[day].templateId = null;
    });
    this.persist();
    return { ok: true };
  },

  duplicateTemplate(id) {
    const tpl = this.templateById(id);
    if (!tpl) return { ok: false };
    const copy = { ...JSON.parse(JSON.stringify(tpl)), id: uid("tpl"), name: `${tpl.name} (copy)`, createdAt: new Date().toISOString() };
    this.data.templates.push(copy);
    this.persist();
    return { ok: true, template: copy };
  },

  saveSessionAsTemplate(sessionId, name) {
    const session = this.sessionById(sessionId);
    if (!session) return { ok: false };
    const exercises = session.exercises.map((ex) => {
      const sets = ex.sets.filter((s) => s.isCompleted !== false);
      return {
        exerciseId: ex.exerciseId,
        targetSets: Math.max(1, sets.length),
        targetRepsMin: sets.length ? Math.min(...sets.map((s) => s.reps)) : 8,
        targetRepsMax: sets.length ? Math.max(...sets.map((s) => s.reps)) : 12,
        restSeconds: sets[0]?.restSeconds || this.data.settings.defaultRestSeconds,
      };
    });
    return this.createTemplate({ name: name || `Template ${formatDateID(session.date)}`, splitType: session.splitType, exercises });
  },

  /* ============================ weekly plan ============================ */
  setPlanDay(day, split, templateId = null) {
    if (!this.data.weeklyPlan) this.data.weeklyPlan = {};
    this.data.weeklyPlan[day] = { split, templateId };
    this.persist();
  },

  applyPlanToFuture(weeks = 4) {
    let created = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 1; i <= weeks * 7; i++) {
      const d = addDays(today, i);
      const key = dateKey(d);
      if (this.sessionByDate(key)) continue;
      const entry = this.data.weeklyPlan?.[d.getDay()];
      if (!entry || entry.split === "rest") continue;
      this.data.sessions.push(
        this.buildSession({
          date: key,
          split: entry.split,
          template: entry.templateId ? this.templateById(entry.templateId) : null,
          status: "scheduled",
        }),
      );
      created++;
    }
    if (created) this.persist();
    return created;
  },

  /* ============================ body ============================ */
  bodyMetrics() {
    return [...(this.data?.bodyMetrics || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  },

  latestBody() {
    const list = this.bodyMetrics();
    return list.length ? list[list.length - 1] : null;
  },

  previousBody() {
    const list = this.bodyMetrics();
    return list.length > 1 ? list[list.length - 2] : null;
  },

  saveBodyMetric(payload) {
    if (!payload.date) return { ok: false, error: "Tanggal wajib diisi." };
    const metrics = ["weightKg", "bodyFatPct", "armCm", "chestCm", "waistCm", "thighCm", "shoulderCm", "hipCm"];
    const hasValue = metrics.some((m) => payload[m] !== null && payload[m] !== undefined && payload[m] !== "");
    if (!hasValue) return { ok: false, error: "Isi minimal satu metrik tubuh." };
    const clean = { ...payload, id: payload.id || uid("body") };
    metrics.forEach((m) => {
      clean[m] = payload[m] === "" || payload[m] === undefined || payload[m] === null ? null : Number(payload[m]);
    });
    const existing = this.data.bodyMetrics.find((b) => b.date === payload.date || (payload.id && b.id === payload.id));
    if (existing) Object.assign(existing, clean, { id: existing.id });
    else this.data.bodyMetrics.push(clean);
    this.persist();
    return { ok: true, entry: clean };
  },

  deleteBodyMetric(id) {
    this.data.bodyMetrics = this.data.bodyMetrics.filter((b) => b.id !== id);
    this.persist();
    return { ok: true };
  },

  bodyChart(range = "3m") {
    const months = { "1m": 1, "3m": 3, "6m": 6, all: 120 }[range] || 3;
    const cutoff = dateKey(addDays(new Date(), -months * 30));
    return this.bodyMetrics().filter((b) => b.date >= cutoff);
  },

  bodyComparison(range = "3m") {
    const metrics = this.bodyChart(range).filter((b) => b.weightKg);
    const months = { "1m": 1, "3m": 3, "6m": 6, all: 120 }[range] || 3;
    const cutoff = dateKey(addDays(new Date(), -months * 30));
    const sessions = this.data.sessions
      .filter((s) => s.status === "completed" && s.date >= cutoff)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    return {
      metrics,
      sessions: sessions.map((s) => ({ date: s.date, label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(parseDateKey(s.date)), volume: sessionVolume(s) })),
    };
  },

  /* ============================ journal ============================ */
  saveJournal(sessionId, journal) {
    const session = this.sessionById(sessionId);
    if (!session) return { ok: false };
    session.journal = { ...journal, updatedAt: new Date().toISOString() };
    session.updatedAt = new Date().toISOString();
    this.persist();
    return { ok: true };
  },

  journalEntries(query = "") {
    const q = query.toLowerCase().trim();
    return this.sessions()
      .filter((s) => s.journal && (s.journal.notes || s.journal.tags?.length))
      .filter((s) => {
        if (!q) return true;
        const j = s.journal;
        return (
          (j.notes || "").toLowerCase().includes(q) ||
          (j.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          formatDateID(s.date).toLowerCase().includes(q)
        );
      });
  },

  /* ============================ notifications ============================ */
  addNotification({ type = "info", title, body, href = null }) {
    if (!this.data) return;
    this.data.notifications.unshift({
      id: uid("ntf"),
      type,
      title,
      body,
      href,
      date: new Date().toISOString(),
      read: false,
    });
    this.data.notifications = this.data.notifications.slice(0, 40);
    this.persist();
  },

  notifications() {
    return this.data?.notifications || [];
  },

  unreadCount() {
    return this.notifications().filter((n) => !n.read).length;
  },

  markNotificationRead(id) {
    const n = this.data.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    this.persist();
  },

  markAllNotificationsRead() {
    this.data.notifications.forEach((n) => {
      n.read = true;
    });
    this.persist();
  },

  clearNotifications() {
    this.data.notifications = [];
    this.persist();
  },

  /* ============================ settings ============================ */
  updateSettings(patch) {
    this.data.settings = deepMerge(this.data.settings, patch);
    this.persist();
  },

  updateNotificationSetting(key, patch) {
    this.data.settings.notifications[key] = deepMerge(this.data.settings.notifications[key] || {}, patch);
    this.persist();
  },

  /* ============================ milestones ============================ */
  milestones() {
    const completed = this.data.sessions.filter((s) => s.status === "completed").sort((a, b) => (a.date < b.date ? -1 : 1));
    const totalVolume = this.totalVolume();
    const streak = this.streak();
    const bodyWeight = this.latestBody()?.weightKg || null;
    const best = this.prSummary().best;
    const first = completed[0];
    const firstBody = this.bodyMetrics()[0];
    const firstTemplate = this.data.templates[0];

    const defs = [
      { code: "first_session", title: "Sesi pertama selesai", description: "Menyelesaikan sesi latihan pertama.", achieved: completed.length >= 1, date: first?.date },
      { code: "sessions_10", title: "10 sesi selesai", description: "Konsistensi mulai terbentuk.", achieved: completed.length >= 10, date: completed[9]?.date },
      { code: "sessions_50", title: "50 sesi selesai", description: "Sudah 50 sesi latihan tercatat.", achieved: completed.length >= 50, date: completed[49]?.date },
      { code: "sessions_100", title: "100 sesi selesai", description: "Seratus sesi, luar biasa.", achieved: completed.length >= 100, date: completed[99]?.date },
      { code: "streak_7", title: "Streak 7 hari", description: "Latihan konsisten selama 7 hari.", achieved: streak >= 7, date: streak >= 7 ? dateKey(new Date()) : null },
      { code: "streak_30", title: "Streak 30 hari", description: "Latihan konsisten selama 30 hari.", achieved: streak >= 30, date: streak >= 30 ? dateKey(new Date()) : null },
      { code: "volume_10000", title: "Volume 10.000 kg", description: "Total volume angkatan menembus 10.000 kg.", achieved: totalVolume >= 10000, date: totalVolume >= 10000 ? dateKey(new Date()) : null },
      { code: "volume_100000", title: "Volume 100.000 kg", description: "Total volume angkatan menembus 100.000 kg.", achieved: totalVolume >= 100000, date: totalVolume >= 100000 ? dateKey(new Date()) : null },
      { code: "template_first", title: "Template pertama", description: "Membuat template program latihan.", achieved: Boolean(firstTemplate), date: firstTemplate?.createdAt?.slice(0, 10) },
      { code: "body_first", title: "Ukur tubuh pertama", description: "Mencatat metrik tubuh pertama kali.", achieved: Boolean(firstBody), date: firstBody?.date },
    ];

    ["bench-press", "squat", "deadlift"].forEach((id) => {
      const ex = this.exerciseById(id);
      const pr = best[id]?.oneRm?.value || 0;
      defs.push({
        code: `${id}_bodyweight`,
        title: `${ex.name} ≥ berat badan`,
        description: `Estimasi 1RM ${ex.name} melewati berat badan saat ini.`,
        achieved: Boolean(bodyWeight && pr >= bodyWeight),
        date: bodyWeight && pr >= bodyWeight ? best[id]?.oneRm?.date : null,
        progress: bodyWeight ? clamp(Math.round((pr / bodyWeight) * 100), 0, 100) : 0,
      });
    });

    return defs.map((d) => ({
      ...d,
      progress:
        d.progress ??
        (d.code.startsWith("sessions_") ? clamp(Math.round((completed.length / Number(d.code.split("_")[1])) * 100), 0, 100) : d.achieved ? 100 : 0),
    }));
  },

  /* ============================ data management ============================ */
  exportData() {
    const { password, ...user } = this.user;
    return {
      exportedAt: new Date().toISOString(),
      app: "Gym Tracker",
      user,
      ...JSON.parse(JSON.stringify(this.data)),
    };
  },

  deleteAccount() {
    if (!this.userId) return;
    this.db.users = this.db.users.filter((u) => u.id !== this.userId);
    delete this.db.data[this.userId];
    saveDb(this.db);
    this.signOut();
  },

  resetDemoData() {
    const demo = createDemoDatabase();
    const existingIdx = this.db.users.findIndex((u) => u.email === "demo@gymtracker.app");
    if (existingIdx >= 0) {
      this.db.users[existingIdx] = demo.users[0];
      this.db.data["user-demo"] = demo.data["user-demo"];
      saveDb(this.db);
    } else {
      this.db = demo;
      saveDb(this.db);
    }
    this.userId = "user-demo";
    this.user = this.db.users.find((u) => u.id === this.userId);
    this.data = this.db.data[this.userId];
    setStoredSession(this.userId, true);
    return { ok: true };
  },

  demoCredentials() {
    return { email: "demo@gymtracker.app", password: "demo1234" };
  },

  weekdayName(day) {
    return WEEKDAYS_ID[day];
  },

  daysUntil(dateStr) {
    return daysBetween(new Date(), parseDateKey(dateStr));
  },
};

export function initApp() {
  return App.init();
}
