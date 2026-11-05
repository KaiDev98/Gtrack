import { SPLITS, dateKey, formatDateID } from "../lib.js";

export function templatesPage() {
  return {
    editorOpen: false,
    pickerOpen: false,
    search: "",
    editing: { id: null, name: "", splitType: "push", exercises: [] },
    formError: "",

    get templates() {
      return this.$store.app.templates();
    },

    get splitOptions() {
      return Object.values(SPLITS).filter((s) => s.key !== "rest");
    },

    get pickerResults() {
      const q = this.search.toLowerCase().trim();
      const used = new Set((this.editing?.exercises || []).map((e) => e.exerciseId));
      return this.$store.app
        .exercises()
        .filter((e) => !used.has(e.id))
        .filter((e) => !q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q))
        .slice(0, 50);
    },

    split(key) {
      return SPLITS[key] || SPLITS.custom;
    },

    splitStyle(key) {
      const sp = this.split(key);
      return `background-color:${sp.soft};color:${sp.hex}`;
    },

    exerciseName(id) {
      return this.$store.app.exerciseById(id).name;
    },

    exerciseMeta(id) {
      const ex = this.$store.app.exerciseById(id);
      return `${ex.muscle} · ${ex.type === "bodyweight" ? "Bodyweight" : ex.type === "cardio" ? "Cardio" : "Beban"}`;
    },

    setCount(template) {
      return template.exercises.reduce((n, e) => n + Number(e.targetSets || 0), 0);
    },

    newTemplate() {
      this.editing = { id: null, name: "", splitType: "push", exercises: [] };
      this.formError = "";
      this.pickerOpen = false;
      this.search = "";
      this.editorOpen = true;
    },

    edit(template) {
      this.editing = JSON.parse(JSON.stringify(template));
      this.formError = "";
      this.pickerOpen = false;
      this.search = "";
      this.editorOpen = true;
    },

    openPicker() {
      this.search = "";
      this.pickerOpen = true;
    },

    addExercise(exercise) {
      this.editing.exercises.push({
        exerciseId: exercise.id,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restSeconds: 90,
      });
      this.pickerOpen = false;
    },

    removeExercise(index) {
      this.editing.exercises.splice(index, 1);
    },

    move(index, direction) {
      const target = index + direction;
      if (target < 0 || target >= this.editing.exercises.length) return;
      const list = this.editing.exercises;
      [list[index], list[target]] = [list[target], list[index]];
    },

    save() {
      this.formError = "";
      if (!this.editing.name.trim()) {
        this.formError = "Nama template wajib diisi.";
        return;
      }
      if (!this.editing.exercises.length) {
        this.formError = "Tambahkan minimal satu gerakan.";
        return;
      }
      const result = this.$store.app.saveTemplate(this.editing);
      if (!result.ok) {
        this.formError = result.error;
        return;
      }
      this.editorOpen = false;
      this.$store.toast.success("Template disimpan.");
    },

    duplicate(template) {
      const result = this.$store.app.duplicateTemplate(template.id);
      if (result.ok) this.$store.toast.success("Template diduplikat.");
    },

    remove(template) {
      if (!window.confirm(`Hapus template "${template.name}"? Riwayat sesi tidak akan terhapus.`)) return;
      this.$store.app.deleteTemplate(template.id);
      this.$store.toast.info("Template dihapus.");
    },

    useToday(template) {
      const app = this.$store.app;
      const today = dateKey(new Date());
      const existing = app.sessionByDate(today);
      if (existing) {
        this.$store.toast.info("Hari ini sudah ada sesi. Membuka sesi tersebut.");
        window.location.href = `workout.html?id=${existing.id}`;
        return;
      }
      const result = app.scheduleSession({ date: today, split: template.splitType, templateId: template.id });
      if (!result.ok) {
        this.$store.toast.error(result.error);
        return;
      }
      app.startSession(result.session.id);
      window.location.href = `workout.html?id=${result.session.id}`;
    },

    scheduleTemplate(template) {
      window.location.href = `schedule.html?template=${template.id}`;
    },

    dateText(date) {
      return formatDateID(date);
    },
  };
}
