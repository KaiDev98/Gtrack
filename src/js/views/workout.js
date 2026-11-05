import {
  SESSION_STATUS,
  SPLITS,
  formatClock,
  formatDateID,
  formatVolume,
  formatWeight,
  fromDisplayWeight,
  sessionVolume,
  toDisplayWeight,
  uid,
} from "../lib.js";

export function workoutPage() {
  return {
    session: null,
    exerciseList: [],
    previous: {},
    pickerOpen: false,
    exerciseSearch: "",
    customOpen: false,
    custom: { name: "", muscle: "Dada", type: "weighted" },
    templateOpen: false,
    templateName: "",
    durationInput: 0,
    durationTouched: false,
    elapsedSeconds: 0,
    savedAt: null,
    journalTags: "",
    journalOpen: false,
    _ticker: null,
    _saveTimer: null,
    wakeLock: null,
    now: Date.now(),

    init() {
      const app = this.$store.app;
      const id = gt.queryParam("id");
      let session = id ? app.sessionById(id) : app.sessionByDate(gt.dateKey(new Date()));
      if (!session) {
        const plan = app.data.weeklyPlan?.[new Date().getDay()];
        if (plan && plan.split !== "rest") {
          const result = app.scheduleSession({ date: gt.dateKey(new Date()), split: plan.split, templateId: plan.templateId });
          if (result.ok) session = result.session;
        }
      }
      if (!session) {
        window.location.href = "schedule.html";
        return;
      }
      this.session = JSON.parse(JSON.stringify(session));
      this.exerciseList = app.exercises();
      this.durationInput = this.session.durationMinutes || 0;
      this.durationTouched = Boolean(this.session.durationMinutes);
      this.journalTags = (this.session.journal?.tags || []).join(", ");
      this.journalOpen = Boolean(this.session.journal?.notes);
      this.prepare();
      this._ticker = setInterval(() => this.tick(), 1000);
      this.tick();
      if (this.session.status === "in_progress") this.requestWakeLock();
    },

    destroy() {
      clearInterval(this._ticker);
      clearTimeout(this._saveTimer);
      this.releaseWakeLock();
    },

    prepare() {
      const unit = this.unit;
      this.previous = {};
      if (!this.session.journal) {
        this.session.journal = { notes: "", fatigue: null, sleep: null, mood: null, tags: [] };
      }
      this.session.exercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          set.uiWeight = toDisplayWeight(set.weight, unit);
        });
        this.previous[ex.exerciseId] = this.findLastSets(ex.exerciseId);
      });
    },

    findLastSets(exerciseId) {
      const sessions = this.$store.app
        .sessions()
        .filter((s) => s.status === "completed" && s.id !== this.session.id)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      for (const s of sessions) {
        const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
        if (!ex) continue;
        const sets = ex.sets.filter((set) => set.isCompleted !== false && Number(set.reps) > 0);
        if (sets.length) return sets;
      }
      return [];
    },

    get unit() {
      return this.$store.app.userWeightUnit();
    },

    get split() {
      return SPLITS[this.session?.splitType] || SPLITS.custom;
    },

    get splitStyle() {
      return `background-color:${this.split.soft};color:${this.split.hex}`;
    },

    get isStarted() {
      return Boolean(this.session?.startedAt);
    },

    get isCompleted() {
      return this.session?.status === "completed";
    },

    get elapsedLabel() {
      return formatClock(this.elapsedSeconds);
    },

    get increment() {
      return this.unit === "lb" ? 5 : 2.5;
    },

    get totalVolume() {
      return sessionVolume(this.session);
    },

    get doneSets() {
      return this.session?.exercises?.reduce((n, ex) => n + ex.sets.filter((s) => s.isCompleted).length, 0) || 0;
    },

    get totalSets() {
      return this.session?.exercises?.reduce((n, ex) => n + ex.sets.length, 0) || 0;
    },

    get dateLabel() {
      return formatDateID(this.session.date, { weekday: "long", year: "numeric" });
    },

    get status() {
      return SESSION_STATUS[this.session?.status] || SESSION_STATUS.scheduled;
    },

    tick() {
      this.now = Date.now();
      if (this.session?.startedAt) {
        this.elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(this.session.startedAt).getTime()) / 1000));
        if (!this.durationTouched && this.session.status !== "completed") {
          this.durationInput = Math.max(1, Math.round(this.elapsedSeconds / 60));
        }
      }
    },

    startWorkout() {
      if (!this.session || this.isCompleted) return;
      if (!this.session.startedAt) this.session.startedAt = new Date().toISOString();
      this.session.status = "in_progress";
      this.$store.app.startSession(this.session.id);
      this.autosaveNow();
      this.requestWakeLock();
      this.$store.toast.success("Latihan dimulai. Catat set pertamamu! 💪");
    },

    async requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          this.wakeLock = await navigator.wakeLock.request("screen");
          this.wakeLock.addEventListener("release", () => {
            this.wakeLock = null;
          });
        }
      } catch {
        /* wake lock can be rejected (battery saver, not focused) */
      }
    },

    releaseWakeLock() {
      try {
        this.wakeLock?.release?.();
      } catch {
        /* noop */
      }
      this.wakeLock = null;
    },

    autosave() {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this.autosaveNow(), 400);
    },

    autosaveNow() {
      if (!this.session) return;
      this.session.durationMinutes = Number(this.durationInput) || this.session.durationMinutes || 0;
      this.session.updatedAt = new Date().toISOString();
      this.$store.app.saveSession(this.session);
      this.savedAt = new Date();
    },

    setWeight(set, value) {
      const num = Math.max(0, Number(String(value).replace(",", ".")) || 0);
      set.uiWeight = num;
      set.weight = fromDisplayWeight(num, this.unit);
      this.autosave();
    },

    adjustWeight(set, delta) {
      const current = Number(set.uiWeight) || 0;
      this.setWeight(set, Math.max(0, current + delta));
    },

    setReps(set, value) {
      set.reps = Math.max(1, Math.round(Number(value) || 1));
      this.autosave();
    },

    toggleSet(ex, set) {
      set.isCompleted = !set.isCompleted;
      if (set.isCompleted) {
        if (!this.session.startedAt) this.startWorkout();
        this.autosaveNow();
        const hits = this.$store.app.detectPRs(this.session, ex.exerciseId, set.id);
        if (hits.length) this.$store.pr.show(hits);
        if (this.$store.app.data.settings.restTimerAuto !== false) {
          const rest = Number(set.restSeconds) || Number(this.$store.app.data.settings.defaultRestSeconds) || 90;
          this.$store.restTimer.start(rest);
        }
        if (navigator.vibrate) navigator.vibrate(40);
      } else {
        this.autosave();
      }
    },

    previousFor(exerciseId, index) {
      const sets = this.previous[exerciseId] || [];
      return sets[index] || sets[sets.length - 1] || null;
    },

    previousLabel(exerciseId) {
      const sets = this.previous[exerciseId] || [];
      if (!sets.length) return "Belum ada performa sebelumnya";
      const top = [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
      return `Terakhir: ${formatWeight(top.weight, this.unit)} × ${top.reps}`;
    },

    copyPreviousSet(ex, index) {
      const prev = this.previousFor(ex.exerciseId, index);
      if (!prev) {
        this.$store.toast.info("Belum ada set sebelumnya untuk disalin.");
        return;
      }
      ex.sets[index].reps = prev.reps;
      this.setWeight(ex.sets[index], toDisplayWeight(prev.weight, this.unit));
      this.$store.toast.info("Set sebelumnya disalin.");
    },

    addSet(ex) {
      const last = ex.sets[ex.sets.length - 1];
      const set = {
        id: uid("set"),
        order: ex.sets.length + 1,
        reps: last?.reps || 10,
        weight: last?.weight || 0,
        restSeconds: last?.restSeconds || this.$store.app.data.settings.defaultRestSeconds || 90,
        isCompleted: false,
      };
      set.uiWeight = toDisplayWeight(set.weight, this.unit);
      ex.sets.push(set);
      this.autosave();
    },

    removeSet(ex, index) {
      if (ex.sets.length === 1) {
        this.$store.toast.warning("Minimal satu set per gerakan.");
        return;
      }
      ex.sets.splice(index, 1);
      ex.sets.forEach((s, i) => {
        s.order = i + 1;
      });
      this.autosave();
    },

    openPicker() {
      this.exerciseSearch = "";
      this.customOpen = false;
      this.custom = { name: "", muscle: "Dada", type: "weighted" };
      this.pickerOpen = true;
    },

    get filteredExercises() {
      const q = this.exerciseSearch.toLowerCase().trim();
      return this.exerciseList
        .filter((e) => !q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q))
        .slice(0, 60);
    },

    addExercise(exercise) {
      let sets = [];
      const last = this.findLastSets(exercise.id);
      const count = last.length || 3;
      for (let i = 0; i < count; i++) {
        const weight = last[i]?.weight ?? last[0]?.weight ?? 0;
        const set = {
          id: uid("set"),
          order: i + 1,
          reps: last[i]?.reps ?? 10,
          weight,
          restSeconds: last[i]?.restSeconds || this.$store.app.data.settings.defaultRestSeconds || 90,
          isCompleted: false,
        };
        set.uiWeight = toDisplayWeight(weight, this.unit);
        sets.push(set);
      }
      this.session.exercises.push({
        id: uid("sex"),
        exerciseId: exercise.id,
        order: this.session.exercises.length + 1,
        durationMinutes: null,
        note: "",
        sets,
      });
      this.previous[exercise.id] = last;
      this.pickerOpen = false;
      this.autosave();
      this.$store.toast.success(`${exercise.name} ditambahkan.`);
    },

    createCustomExercise() {
      const result = this.$store.app.addExercise(this.custom);
      if (!result.ok) {
        this.$store.toast.error(result.error);
        return;
      }
      this.exerciseList = this.$store.app.exercises();
      this.addExercise(result.exercise);
      this.$store.toast.success("Gerakan custom dibuat.");
    },

    moveExercise(index, direction) {
      const target = index + direction;
      if (target < 0 || target >= this.session.exercises.length) return;
      const list = this.session.exercises;
      [list[index], list[target]] = [list[target], list[index]];
      list.forEach((ex, i) => {
        ex.order = i + 1;
      });
      this.autosave();
    },

    removeExercise(ex) {
      if (!window.confirm(`Hapus ${this.$store.app.exerciseById(ex.exerciseId).name} dari sesi ini?`)) return;
      this.session.exercises = this.session.exercises.filter((e) => e.id !== ex.id);
      this.session.exercises.forEach((e, i) => {
        e.order = i + 1;
      });
      this.autosave();
    },

    startRest(seconds) {
      this.$store.restTimer.start(seconds);
    },

    saveJournalLocal() {
      const tags = this.journalTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      this.session.journal = {
        ...(this.session.journal || {}),
        notes: this.session.journal?.notes || "",
        fatigue: this.session.journal?.fatigue || null,
        sleep: this.session.journal?.sleep || null,
        mood: this.session.journal?.mood || null,
        tags,
      };
      this.autosave();
    },

    setJournalScale(field, value) {
      if (!this.session.journal) this.session.journal = { notes: "", tags: [] };
      this.session.journal[field] = this.session.journal[field] === value ? null : value;
      this.autosave();
    },

    openTemplateModal() {
      this.templateName = `${this.split.label} — ${formatDateID(this.session.date)}`;
      this.templateOpen = true;
    },

    saveAsTemplate() {
      this.autosaveNow();
      const result = this.$store.app.saveSessionAsTemplate(this.session.id, this.templateName);
      if (!result.ok) {
        this.$store.toast.error(result.error || "Template gagal disimpan.");
        return;
      }
      this.templateOpen = false;
      this.$store.toast.success("Sesi disimpan sebagai template.");
    },

    finishWorkout() {
      this.autosaveNow();
      if (!this.session.exercises.length) {
        this.$store.toast.error("Tambahkan minimal satu gerakan sebelum menyelesaikan sesi.");
        return;
      }
      if (this.doneSets === 0) {
        const ok = window.confirm("Belum ada set yang dicentang selesai. Tetap selesaikan sesi?");
        if (!ok) return;
      }
      const computed = this.session.startedAt ? Math.max(1, Math.round((Date.now() - new Date(this.session.startedAt).getTime()) / 60000)) : 0;
      const duration = Number(this.durationInput) || computed || this.session.durationMinutes || 0;
      if (!duration) {
        this.$store.toast.error("Durasi latihan wajib diisi minimal 1 menit.");
        return;
      }
      const result = this.$store.app.finishSession(this.session.id, duration);
      if (!result.ok) {
        this.$store.toast.error(result.error);
        return;
      }
      this.releaseWakeLock();
      this.$store.restTimer.skip();
      window.location.href = `summary.html?id=${this.session.id}`;
    },

    volumeText() {
      return formatVolume(this.totalVolume, this.unit);
    },

    weightText(kg) {
      return formatWeight(kg, this.unit);
    },

    exerciseName(id) {
      return this.$store.app.exerciseById(id).name;
    },

    exerciseMeta(id) {
      const ex = this.$store.app.exerciseById(id);
      return `${ex.muscle} · ${ex.type === "bodyweight" ? "Bodyweight" : ex.type === "cardio" ? "Cardio" : "Beban"}`;
    },
  };
}
