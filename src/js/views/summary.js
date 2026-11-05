import {
  SESSION_STATUS,
  SPLITS,
  addDays,
  dateKey,
  formatDateID,
  formatDuration,
  formatNumber,
  formatVolume,
  formatWeight,
  sessionExerciseCount,
  sessionVolume,
} from "../lib.js";

export function summaryPage() {
  return {
    session: null,
    journal: { notes: "", fatigue: null, sleep: null, mood: null, tags: [] },
    tagsText: "",
    prs: [],
    templateOpen: false,
    templateName: "",
    editing: false,

    init() {
      const app = this.$store.app;
      const id = gt.queryParam("id");
      const session = id ? app.sessionById(id) : app.sessionByDate(dateKey(new Date()));
      if (!session) {
        window.location.href = "dashboard.html";
        return;
      }
      this.session = JSON.parse(JSON.stringify(session));
      this.journal = {
        notes: this.session.journal?.notes || "",
        fatigue: this.session.journal?.fatigue || null,
        sleep: this.session.journal?.sleep || null,
        mood: this.session.journal?.mood || null,
        tags: this.session.journal?.tags || [],
      };
      this.tagsText = this.journal.tags.join(", ");
      this.journalOpen = Boolean(this.session.journal?.notes);
      const seen = new Set();
      this.prs = app
        .prSummary()
        .history.filter((pr) => pr.sessionId === this.session.id)
        .filter((pr) => {
          const key = `${pr.exerciseId}:${pr.type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => b.value - a.value);
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

    get status() {
      return SESSION_STATUS[this.session?.status] || SESSION_STATUS.completed;
    },

    get volume() {
      return sessionVolume(this.session);
    },

    get totalSets() {
      return this.session?.exercises?.reduce((n, ex) => n + ex.sets.filter((s) => s.isCompleted !== false).length, 0) || 0;
    },

    get completedSets() {
      return this.totalSets;
    },

    get exerciseCount() {
      return sessionExerciseCount(this.session);
    },

    get dateLabel() {
      return formatDateID(this.session.date, { weekday: "long", year: "numeric" });
    },

    get volumeText() {
      return formatVolume(this.volume, this.unit);
    },

    durationText(min) {
      return formatDuration(min);
    },

    numberText(n) {
      return formatNumber(n);
    },

    weightText(kg) {
      return formatWeight(kg, this.unit);
    },

    prLabel(type) {
      return { weight: "Beban terberat", reps: "Reps terbanyak", oneRm: "Estimasi 1RM", volume: "Volume gerakan" }[type] || type;
    },

    prValue(pr) {
      if (pr.type === "reps") return `${pr.value} reps`;
      if (pr.type === "volume") return formatVolume(pr.value, this.unit);
      return formatWeight(pr.value, this.unit);
    },

    toggleJournal() {
      this.journalOpen = !this.journalOpen;
    },
    journalOpen: false,

    setScale(field, value) {
      this.journal[field] = this.journal[field] === value ? null : value;
    },

    saveJournal() {
      const tags = this.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      this.$store.app.saveJournal(this.session.id, { ...this.journal, tags });
      this.session.journal = { ...this.journal, tags };
      this.editing = false;
      this.$store.toast.success("Jurnal sesi disimpan.");
    },

    openTemplate() {
      this.templateName = `${this.split.label} — ${formatDateID(this.session.date)}`;
      this.templateOpen = true;
    },

    saveTemplate() {
      const result = this.$store.app.saveSessionAsTemplate(this.session.id, this.templateName);
      if (!result.ok) {
        this.$store.toast.error(result.error || "Gagal menyimpan template.");
        return;
      }
      this.templateOpen = false;
      this.$store.toast.success("Template berhasil dibuat.");
    },

    repeatSession() {
      const app = this.$store.app;
      const today = new Date();
      let target = dateKey(today);
      for (let i = 0; i < 30; i++) {
        target = dateKey(addDays(today, i));
        if (!app.sessionByDate(target)) break;
      }
      const result = app.repeatSession(this.session.id, target);
      if (!result.ok) {
        this.$store.toast.error(result.error || "Gagal mengulang sesi.");
        return;
      }
      app.startSession(result.session.id);
      window.location.href = `workout.html?id=${result.session.id}`;
    },

    goDashboard() {
      window.location.href = "dashboard.html";
    },
  };
}
