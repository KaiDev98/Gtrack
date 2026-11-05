import {
  dateKey,
  formatDateID,
  formatNumber,
  formatWeight,
  fromDisplayWeight,
  toDisplayWeight,
  daysBetween,
  parseDateKey,
} from "../lib.js";
import { renderDualLine, renderLine, renderMixed } from "../charts.js";

export function bodyPage() {
  return {
    range: "3m",
    entries: [],
    latest: null,
    prev: null,
    first: null,
    comparison: { metrics: [], sessions: [] },
    modalOpen: false,
    editingId: null,
    formError: "",
    form: {
      date: dateKey(new Date()),
      weight: "",
      bodyFat: "",
      arm: "",
      chest: "",
      waist: "",
      thigh: "",
      shoulder: "",
      hip: "",
      note: "",
    },

    init() {
      this.refresh();
    },

    get unit() {
      return this.$store.app.userWeightUnit();
    },

    get lengthUnit() {
      return this.$store.app.userLengthUnit();
    },

    get goalWeight() {
      return this.$store.app.user?.goalWeightKg || null;
    },

    refresh() {
      const app = this.$store.app;
      this.entries = app.bodyChart(this.range).slice().reverse();
      this.latest = app.latestBody();
      this.prev = app.previousBody();
      this.first = app.bodyMetrics()[0] || null;
      this.comparison = app.bodyComparison(this.range);
      this.$nextTick(() => this.renderCharts());
    },

    setRange(range) {
      this.range = range;
      this.refresh();
    },

    renderCharts() {
      if (!this.$refs.weightChart) return;
      const entries = this.comparison.metrics;
      const categories = entries.map((e) => this.dateShort(e.date));

      renderDualLine(this.$refs.weightChart, {
        categories,
        series: [
          { name: `Berat badan (${this.unit})`, data: entries.map((e) => Math.round(toDisplayWeight(e.weightKg, this.unit) * 10) / 10) },
          { name: "Lemak tubuh (%)", data: entries.map((e) => e.bodyFatPct || 0) },
        ],
        height: 300,
      });

      const measurements = entries.filter((e) => e.armCm || e.chestCm || e.waistCm);
      renderLine(this.$refs.measureChart, {
        categories: measurements.map((e) => this.dateShort(e.date)),
        series: [
          { name: "Lengan", data: measurements.map((e) => this.lengthValue(e.armCm) || 0) },
          { name: "Dada", data: measurements.map((e) => this.lengthValue(e.chestCm) || 0) },
          { name: "Pinggang", data: measurements.map((e) => this.lengthValue(e.waistCm) || 0) },
        ],
        colors: ["#465fff", "#12b76a", "#f79009"],
        suffix: this.lengthUnit,
        height: 280,
      });

      const sessions = this.comparison.sessions;
      const volumes = entries.map((entry) => {
        const d = parseDateKey(entry.date);
        return sessions
          .filter((s) => Math.abs(daysBetween(parseDateKey(s.date), d)) <= 3)
          .reduce((sum, s) => sum + s.volume, 0);
      });
      renderMixed(this.$refs.compareChart, {
        categories,
        barValues: volumes.map((v) => Math.round(this.unit === "lb" ? v * 2.20462 : v)),
        lineValues: entries.map((e) => Math.round(toDisplayWeight(e.weightKg, this.unit) * 10) / 10),
        barName: `Volume (${this.unit})`,
        lineName: `Berat (${this.unit})`,
        height: 300,
      });
    },

    get latestWeightText() {
      return this.latest?.weightKg ? formatWeight(this.latest.weightKg, this.unit) : "—";
    },

    get bodyFatText() {
      return this.latest?.bodyFatPct ? `${this.latest.bodyFatPct}%` : "—";
    },

    get waistText() {
      return this.latest?.waistCm ? this.length(this.latest.waistCm) : "—";
    },

    get weightDelta() {
      if (!this.latest?.weightKg || !this.prev?.weightKg) return null;
      const latest = toDisplayWeight(this.latest.weightKg, this.unit);
      const prev = toDisplayWeight(this.prev.weightKg, this.unit);
      return Math.round((latest - prev) * 10) / 10;
    },

    get fatDelta() {
      if (!this.latest?.bodyFatPct || !this.prev?.bodyFatPct) return null;
      return Math.round((this.latest.bodyFatPct - this.prev.bodyFatPct) * 10) / 10;
    },

    get waistDelta() {
      if (!this.latest?.waistCm || !this.prev?.waistCm) return null;
      const deltaCm = this.latest.waistCm - this.prev.waistCm;
      const delta = this.lengthUnit === "in" ? deltaCm / 2.54 : deltaCm;
      return Math.round(delta * 10) / 10;
    },

    get goalProgress() {
      if (!this.goalWeight || !this.first?.weightKg || !this.latest?.weightKg) return null;
      const total = Math.abs(this.first.weightKg - this.goalWeight);
      const done = Math.abs(this.first.weightKg - this.latest.weightKg);
      return total ? Math.min(100, Math.round((done / total) * 100)) : 100;
    },

    weight(kg) {
      return formatWeight(kg, this.unit);
    },

    length(cm) {
      if (!cm) return "—";
      if (this.lengthUnit === "in") return `${(cm / 2.54).toFixed(1).replace(".", ",")} in`;
      return `${Number(cm).toFixed(1).replace(".", ",")} cm`;
    },

    lengthValue(cm) {
      if (cm === null || cm === undefined) return "";
      return this.lengthUnit === "in" ? Math.round((cm / 2.54) * 10) / 10 : Math.round(cm * 10) / 10;
    },

    lengthToCm(value) {
      if (value === "" || value === null || value === undefined) return null;
      const n = Number(String(value).replace(",", "."));
      if (!Number.isFinite(n)) return null;
      return this.lengthUnit === "in" ? Math.round(n * 2.54 * 10) / 10 : n;
    },

    dateShort(d) {
      return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(parseDateKey(d));
    },

    dateText(d) {
      return formatDateID(d, { weekday: "short" });
    },

    number(n) {
      return formatNumber(n);
    },

    openAdd() {
      this.editingId = null;
      this.formError = "";
      this.form = {
        date: dateKey(new Date()),
        weight: "",
        bodyFat: "",
        arm: "",
        chest: "",
        waist: "",
        thigh: "",
        shoulder: "",
        hip: "",
        note: "",
      };
      this.modalOpen = true;
    },

    openEdit(entry) {
      this.editingId = entry.id;
      this.formError = "";
      this.form = {
        date: entry.date,
        weight: entry.weightKg ? toDisplayWeight(entry.weightKg, this.unit) : "",
        bodyFat: entry.bodyFatPct ?? "",
        arm: this.lengthValue(entry.armCm),
        chest: this.lengthValue(entry.chestCm),
        waist: this.lengthValue(entry.waistCm),
        thigh: this.lengthValue(entry.thighCm),
        shoulder: this.lengthValue(entry.shoulderCm),
        hip: this.lengthValue(entry.hipCm),
        note: entry.note || "",
      };
      this.modalOpen = true;
    },

    save() {
      this.formError = "";
      const hasAny = ["weight", "bodyFat", "arm", "chest", "waist", "thigh", "shoulder", "hip"].some(
        (k) => this.form[k] !== "" && this.form[k] !== null,
      );
      if (!hasAny) {
        this.formError = "Isi minimal satu metrik tubuh.";
        return;
      }
      const result = this.$store.app.saveBodyMetric({
        id: this.editingId,
        date: this.form.date,
        weightKg: this.form.weight === "" ? null : fromDisplayWeight(this.form.weight, this.unit),
        bodyFatPct: this.form.bodyFat === "" ? null : Number(this.form.bodyFat),
        armCm: this.lengthToCm(this.form.arm),
        chestCm: this.lengthToCm(this.form.chest),
        waistCm: this.lengthToCm(this.form.waist),
        thighCm: this.lengthToCm(this.form.thigh),
        shoulderCm: this.lengthToCm(this.form.shoulder),
        hipCm: this.lengthToCm(this.form.hip),
        note: this.form.note,
      });
      if (!result.ok) {
        this.formError = result.error;
        return;
      }
      this.modalOpen = false;
      this.refresh();
      this.$store.toast.success("Metrik tubuh disimpan.");
    },

    remove(entry) {
      if (!window.confirm(`Hapus entri tubuh tanggal ${formatDateID(entry.date)}?`)) return;
      this.$store.app.deleteBodyMetric(entry.id);
      this.refresh();
      this.$store.toast.info("Entri tubuh dihapus.");
    },
  };
}
