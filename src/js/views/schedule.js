import {
  MONTHS_ID,
  SESSION_STATUS,
  SPLITS,
  WEEKDAYS_SHORT,
  addDays,
  addMonths,
  dateKey,
  formatDateID,
  formatDuration,
  formatVolume,
  parseDateKey,
  sessionExerciseCount,
  sessionVolume,
  startOfWeek,
} from "../lib.js";

export function schedulePage() {
  return {
    selected: dateKey(new Date()),
    anchor: new Date(),
    monthAnchor: new Date(),
    weekDays: [],
    monthDays: [],
    monthLabel: "",
    scheduleOpen: false,
    planOpen: false,
    error: "",
    form: { date: "", split: "push", templateId: "" },
    planDraft: {},

    init() {
      this.build();
      this.resetPlanDraft();
      this.handleTemplateQuery();
    },

    handleTemplateQuery() {
      const templateId = gt.queryParam("template");
      if (!templateId) return;
      const template = this.$store.app.templateById(templateId);
      if (!template) return;
      this.openSchedule();
      this.form.split = template.splitType || this.form.split;
      this.form.templateId = template.id;
    },

    resetPlanDraft() {
      const app = this.$store.app;
      const draft = {};
      for (let i = 0; i < 7; i++) {
        const entry = app.data.weeklyPlan?.[i] || { split: "rest", templateId: null };
        draft[i] = { split: entry.split || "rest", templateId: entry.templateId || "" };
      }
      this.planDraft = draft;
    },

    build() {
      const app = this.$store.app;
      const today = dateKey(new Date());
      const weekStart = startOfWeek(this.anchor, true);
      this.weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        const key = dateKey(d);
        const session = app.sessionByDate(key);
        return {
          key,
          date: d,
          dayNum: d.getDate(),
          dayName: WEEKDAYS_SHORT[d.getDay()],
          isToday: key === today,
          isSelected: key === this.selected,
          session,
        };
      });

      const first = new Date(this.monthAnchor.getFullYear(), this.monthAnchor.getMonth(), 1);
      const gridStart = startOfWeek(first, true);
      this.monthDays = Array.from({ length: 42 }, (_, i) => {
        const d = addDays(gridStart, i);
        const key = dateKey(d);
        return {
          key,
          dayNum: d.getDate(),
          inMonth: d.getMonth() === this.monthAnchor.getMonth(),
          isToday: key === today,
          isSelected: key === this.selected,
          session: app.sessionByDate(key),
        };
      });
      this.monthLabel = `${MONTHS_ID[this.monthAnchor.getMonth()]} ${this.monthAnchor.getFullYear()}`;
      this.$nextTick(() => {
        this.$dispatch?.("schedule-built");
      });
    },

    get selectedSession() {
      return this.$store.app.sessionByDate(this.selected);
    },

    get selectedLabel() {
      return formatDateID(this.selected, { weekday: "long" });
    },

    dateLong(key) {
      return formatDateID(key, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    },

    monthCompleted() {
      const prefix = `${this.monthAnchor.getFullYear()}-${String(this.monthAnchor.getMonth() + 1).padStart(2, "0")}`;
      return this.$store.app.data.sessions.filter((s) => s.status === "completed" && s.date.startsWith(prefix)).length;
    },

    get templates() {
      return this.$store.app.templates();
    },

    get planDraftReady() {
      return Object.keys(this.planDraft).length > 0;
    },

    shiftWeek(delta) {
      this.anchor = addDays(this.anchor, delta * 7);
      this.selected = dateKey(this.anchor);
      this.monthAnchor = new Date(this.anchor);
      this.build();
    },

    shiftMonth(delta) {
      this.monthAnchor = addMonths(this.monthAnchor, delta);
      this.build();
    },

    goToday() {
      const now = new Date();
      this.selected = dateKey(now);
      this.anchor = new Date(now);
      this.monthAnchor = new Date(now);
      this.build();
    },

    selectDate(key, switchMonth = false) {
      this.selected = key;
      this.anchor = parseDateKey(key);
      if (switchMonth) this.monthAnchor = parseDateKey(key);
      this.build();
    },

    // Touch swipe for the week strip
    touchStartX: 0,
    onTouchStart(e) {
      this.touchStartX = e.changedTouches[0].clientX;
    },
    onTouchEnd(e) {
      const delta = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(delta) > 50) this.shiftWeek(delta > 0 ? -1 : 1);
    },

    split(key) {
      return SPLITS[key] || SPLITS.custom;
    },

    splitStyle(key) {
      const sp = this.split(key);
      return `background-color:${sp.soft};color:${sp.hex}`;
    },

    statusClass(status) {
      return SESSION_STATUS[status]?.className || SESSION_STATUS.scheduled.className;
    },

    statusLabel(status) {
      return SESSION_STATUS[status]?.label || "Terjadwal";
    },

    volumeText(session) {
      return formatVolume(sessionVolume(session), this.$store.app.userWeightUnit());
    },

    durationText(min) {
      return formatDuration(min);
    },

    exerciseCount(session) {
      return sessionExerciseCount(session);
    },

    hasDoneSets(session) {
      return session.exercises?.some((ex) => ex.sets?.some((s) => s.isCompleted !== false));
    },

    openSchedule() {
      const plan = this.$store.app.data.weeklyPlan?.[parseDateKey(this.selected).getDay()];
      this.form = {
        date: this.selected,
        split: plan?.split === "rest" ? "push" : plan?.split || "push",
        templateId: plan?.templateId || "",
      };
      this.error = "";
      this.scheduleOpen = true;
    },

    submitSchedule() {
      this.error = "";
      if (!this.form.date) {
        this.error = "Pilih tanggal.";
        return;
      }
      const result = this.$store.app.scheduleSession({
        date: this.form.date,
        split: this.form.split,
        templateId: this.form.split === "rest" ? null : this.form.templateId || null,
      });
      if (!result.ok) {
        this.error = result.error;
        return;
      }
      this.scheduleOpen = false;
      this.selected = this.form.date;
      this.anchor = parseDateKey(this.form.date);
      this.monthAnchor = parseDateKey(this.form.date);
      this.build();
      this.$store.toast.success("Sesi berhasil dijadwalkan.");
    },

    quickRest() {
      this.form = { date: this.selected, split: "rest", templateId: "" };
      this.submitSchedule();
    },

    startSession(session) {
      if (!session) return;
      if (session.status === "completed") {
        window.location.href = `summary.html?id=${session.id}`;
        return;
      }
      if (session.status !== "in_progress") this.$store.app.startSession(session.id);
      window.location.href = `workout.html?id=${session.id}`;
    },

    toggleComplete(session) {
      if (!session) return;
      const app = this.$store.app;
      if (session.status === "completed") {
        app.toggleSessionComplete(session.id);
        this.$store.toast.info("Status sesi dikembalikan ke terjadwal.");
        this.build();
        return;
      }
      if (!this.hasDoneSets(session)) {
        const ok = window.confirm("Sesi ini belum memiliki data set yang dicentang. Tetap tandai selesai?");
        if (!ok) return;
      }
      const result = app.toggleSessionComplete(session.id);
      if (!result.ok) {
        this.$store.toast.error(result.error || "Sesi belum bisa diselesaikan.");
        return;
      }
      this.$store.toast.success("Sesi ditandai selesai. Mantap! 💪");
      this.build();
    },

    removeSession(session) {
      if (!session) return;
      if (!window.confirm(`Hapus sesi ${this.split(session.splitType).label} pada ${formatDateID(session.date)}?`)) return;
      this.$store.app.deleteSession(session.id);
      this.$store.toast.info("Sesi dihapus.");
      this.build();
    },

    openPlan() {
      this.resetPlanDraft();
      this.planOpen = true;
    },

    savePlan() {
      const app = this.$store.app;
      Object.entries(this.planDraft).forEach(([day, entry]) => {
        app.setPlanDay(Number(day), entry.split, entry.split === "rest" ? null : entry.templateId || null);
      });
      const created = app.applyPlanToFuture(4);
      this.planOpen = false;
      this.build();
      this.$store.toast.success(created ? `Pola mingguan disimpan. ${created} sesi terjadwal dibuat.` : "Pola mingguan disimpan.");
    },

    planFor(day) {
      return this.$store.app.data.weeklyPlan?.[day] || { split: "rest" };
    },

    templateName(id) {
      return this.$store.app.templateById(id)?.name || "";
    },

    get todayText() {
      return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
    },
  };
}
