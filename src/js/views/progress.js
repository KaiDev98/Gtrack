import { formatDateID, formatNumber, formatVolume, formatWeight } from "../lib.js";
import { renderArea } from "../charts.js";

export function progressPage() {
  return {
    selected: "bench-press",
    range: "3m",
    chartType: "oneRm",
    prs: null,
    best: null,
    history: [],
    milestones: [],
    chartData: [],
    historyMode: "exercise",

    init() {
      this.refresh();
    },

    get unit() {
      return this.$store.app.userWeightUnit();
    },

    get exercises() {
      return this.$store.app.exercises().slice().sort((a, b) => a.name.localeCompare(b.name));
    },

    get selectedExercise() {
      return this.$store.app.exerciseById(this.selected);
    },

    refresh() {
      const app = this.$store.app;
      this.prs = app.prSummary();
      this.best = this.prs.best[this.selected] || null;
      this.history = this.prs.recent;
      this.milestones = app.milestones();
      this.chartData = app.exerciseProgress(this.selected, this.range);
      this.$nextTick(() => this.renderChart());
    },

    changeExercise() {
      this.refresh();
    },

    setRange(range) {
      this.range = range;
      this.refresh();
    },

    setChartType(type) {
      this.chartType = type;
      this.$nextTick(() => this.renderChart());
    },

    renderChart() {
      if (!this.$refs.progressChart) return;
      const toUnit = (v) => (this.unit === "lb" ? v * 2.20462 : v);
      const values = this.chartData.map((p) => {
        if (this.chartType === "volume") return Math.round(toUnit(p.volume));
        if (this.chartType === "weight") return Math.round(toUnit(p.weight) * 10) / 10;
        return Math.round(toUnit(p.oneRm) * 10) / 10;
      });
      const suffix = this.chartType === "volume" ? this.unit : this.unit;
      renderArea(this.$refs.progressChart, {
        categories: this.chartData.map((p) => p.label),
        values,
        name: { oneRm: "Estimasi 1RM", weight: "Beban", volume: "Volume" }[this.chartType],
        suffix,
        color: this.chartType === "volume" ? "#12b76a" : "#465fff",
      });
    },

    get filteredHistory() {
      if (this.historyMode === "all") return this.history;
      return this.history.filter((h) => h.exerciseId === this.selected);
    },

    get achievedMilestones() {
      return this.milestones.filter((m) => m.achieved).length;
    },

    get prCards() {
      const b = this.best;
      if (!b) return [];
      return [
        { type: "weight", label: "Beban terberat", value: b.weight ? this.weight(b.weight.value) : "—", meta: b.weight ? `${b.weight.reps} reps · ${formatDateID(b.weight.date)}` : "Belum ada data" },
        { type: "reps", label: "Reps terbanyak", value: b.reps ? `${b.reps.value} reps` : "—", meta: b.reps ? `${this.weight(b.reps.weight)} · ${formatDateID(b.reps.date)}` : "Belum ada data" },
        { type: "oneRm", label: "Estimasi 1RM", value: b.oneRm ? this.weight(b.oneRm.value) : "—", meta: b.oneRm ? `${formatDateID(b.oneRm.date)}` : "Belum ada data" },
        { type: "volume", label: "Volume terbaik", value: b.volume ? formatVolume(b.volume.value, this.unit) : "—", meta: b.volume ? `${formatDateID(b.volume.date)}` : "Belum ada data" },
      ];
    },

    weight(kg) {
      return formatWeight(kg, this.unit);
    },

    volume(kg) {
      return formatVolume(kg, this.unit);
    },

    number(n) {
      return formatNumber(n);
    },

    dateText(d) {
      return formatDateID(d);
    },

    typeLabel(type) {
      return { weight: "Beban terberat", reps: "Reps terbanyak", oneRm: "Estimasi 1RM", volume: "Volume" }[type] || type;
    },

    typeIcon(type) {
      return { weight: "🏋️", reps: "🔁", oneRm: "⚡", volume: "📈" }[type] || "🏆";
    },

    typeColor(type) {
      return {
        weight: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
        reps: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
        oneRm: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
        volume: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
      }[type];
    },

    historyValue(h) {
      return h.unit === "reps" ? `${h.value} reps` : formatWeight(h.value, this.unit);
    },

    historyPrevious(h) {
      return h.unit === "reps" ? `${h.previous} reps` : formatWeight(h.previous, this.unit);
    },
  };
}
