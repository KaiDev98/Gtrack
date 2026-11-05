import {
  SESSION_STATUS,
  SPLITS,
  dateKey,
  formatDateID,
  formatDuration,
  formatNumber,
  formatVolume,
  formatWeight,
  sessionExerciseCount,
  sessionVolume,
  toDisplayWeight,
} from "../lib.js";
import { renderArea, renderBar, renderDonut } from "../charts.js";

export function dashboardPage() {
  return {
    period: "weekly",
    stats: null,
    today: null,
    recent: [],
    prs: [],
    body: null,
    firstBody: null,
    splitData: [],
    benchProgress: [],

    init() {
      this.refresh();
      this.$nextTick(() => this.renderCharts());
    },

    get unit() {
      return this.$store.app.userWeightUnit();
    },

    get greeting() {
      const h = new Date().getHours();
      if (h < 11) return "Selamat pagi";
      if (h < 15) return "Selamat siang";
      if (h < 19) return "Selamat sore";
      return "Selamat malam";
    },

    get todayLabel() {
      return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
    },

    get hasData() {
      return (this.stats?.totalCompleted || 0) > 0;
    },

    refresh() {
      const app = this.$store.app;
      this.stats = app.dashboardStats();
      this.today = app.sessionByDate(dateKey(new Date()));
      this.recent = app
        .sessions()
        .filter((s) => s.status === "completed")
        .slice(0, 5)
        .map((s) => ({ ...s, volume: sessionVolume(s), exerciseCount: sessionExerciseCount(s) }));
      this.prs = app.prSummary().recent.slice(0, 4);
      this.body = app.latestBody();
      this.firstBody = app.bodyMetrics()[0] || null;
      this.splitData = app.splitDistribution(90);
      this.benchProgress = app.exerciseProgress("bench-press", "3m");
      this.$nextTick(() => this.renderCharts());
    },

    setPeriod(period) {
      this.period = period;
      this.$nextTick(() => this.renderCharts());
    },

    renderCharts() {
      const app = this.$store.app;
      if (!this.$refs.volumeChart) return;
      const toUnit = (v) => (this.unit === "lb" ? v * 2.20462 : v);

      const volume = app.volumeSeries(this.period);
      renderBar(this.$refs.volumeChart, {
        categories: volume.map((p) => p.label),
        values: volume.map((p) => Math.round(toUnit(p.value))),
        name: "Volume",
        suffix: this.unit,
        color: "#465fff",
      });

      const frequency = app.frequencySeries(this.period);
      renderArea(this.$refs.frequencyChart, {
        categories: frequency.map((p) => p.label),
        values: frequency.map((p) => p.value),
        name: "Sesi selesai",
        suffix: "sesi",
        color: "#12b76a",
      });

      renderDonut(this.$refs.splitChart, {
        labels: this.splitData.map((s) => s.label),
        values: this.splitData.map((s) => s.value),
        colors: this.splitData.map((s) => s.color),
        totalLabel: "Sesi",
      });

      if (this.$refs.progressChart) {
        renderArea(this.$refs.progressChart, {
          categories: this.benchProgress.map((p) => p.label),
          values: this.benchProgress.map((p) => Math.round(toUnit(p.oneRm) * 10) / 10),
          name: "Estimasi 1RM Bench Press",
          suffix: this.unit,
          color: "#7c3aed",
        });
      }
    },

    ensureToday() {
      const app = this.$store.app;
      let session = app.sessionByDate(dateKey(new Date()));
      if (!session) {
        const plan = app.data.weeklyPlan?.[new Date().getDay()];
        if (plan && plan.split !== "rest") {
          const result = app.scheduleSession({ date: dateKey(new Date()), split: plan.split, templateId: plan.templateId });
          if (result.ok) session = result.session;
        }
      }
      return session;
    },

    startToday() {
      const app = this.$store.app;
      const session = this.ensureToday();
      if (!session) {
        gt.go("schedule.html");
        return;
      }
      if (session.status === "completed") {
        window.location.href = `summary.html?id=${session.id}`;
        return;
      }
      if (session.status !== "in_progress") app.startSession(session.id);
      window.location.href = `workout.html?id=${session.id}`;
    },

    get todaySets() {
      return this.today?.exercises?.reduce((n, ex) => n + (ex.sets?.length || 0), 0) || 0;
    },

    get todayDoneSets() {
      return this.today?.exercises?.reduce((n, ex) => n + (ex.sets?.filter((s) => s.isCompleted).length || 0), 0) || 0;
    },

    get todaySplit() {
      return this.splitOf(this.today?.splitType || "rest");
    },

    statusClass(status) {
      return SESSION_STATUS[status]?.className || SESSION_STATUS.scheduled.className;
    },

    statusLabel(status) {
      return SESSION_STATUS[status]?.label || "Terjadwal";
    },

    volumeText(kg) {
      return formatVolume(kg, this.unit);
    },

    weightText(kg) {
      return formatWeight(kg, this.unit);
    },

    durationText(min) {
      return formatDuration(min);
    },

    numberText(n) {
      return formatNumber(n);
    },

    dateText(d) {
      return formatDateID(d, { weekday: "short" });
    },

    prTypeLabel(type) {
      return { weight: "Beban terberat", reps: "Reps terbanyak", oneRm: "1RM", volume: "Volume" }[type] || type;
    },

    prValue(pr) {
      if (pr.type === "reps") return `${pr.value} reps`;
      if (pr.type === "volume") return formatVolume(pr.value, this.unit);
      return formatWeight(pr.value, this.unit);
    },

    prIcon(type) {
      return { weight: "🏋️", reps: "🔁", oneRm: "⚡", volume: "📈" }[type] || "🏆";
    },

    bodyDelta() {
      if (!this.body || !this.firstBody?.weightKg) return null;
      const current = toDisplayWeight(this.body.weightKg, this.unit);
      const first = toDisplayWeight(this.firstBody.weightKg, this.unit);
      return Math.round((current - first) * 10) / 10;
    },

    bodyWeightText(kg) {
      return formatWeight(kg, this.unit);
    },

    splitOf(key) {
      return SPLITS[key] || SPLITS.custom;
    },
  };
}
