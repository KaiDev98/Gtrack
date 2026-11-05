import { MUSCLES } from "../lib.js";

export function exercisesPage() {
  return {
    search: "",
    muscle: "Semua",
    modalOpen: false,
    form: { name: "", muscle: "Dada", type: "weighted" },
    muscles: ["Semua", ...MUSCLES],

    get list() {
      const q = this.search.toLowerCase().trim();
      return this.$store.app
        .exercises()
        .filter((e) => this.muscle === "Semua" || e.muscle === this.muscle)
        .filter((e) => !q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q))
        .sort((a, b) => Number(a.isCustom) - Number(b.isCustom) || a.name.localeCompare(b.name));
    },

    get customCount() {
      return this.$store.app.exercises().filter((e) => e.isCustom).length;
    },

    openModal() {
      this.form = { name: "", muscle: "Dada", type: "weighted" };
      this.modalOpen = true;
    },

    save() {
      const result = this.$store.app.addExercise(this.form);
      if (!result.ok) {
        this.$store.toast.error(result.error);
        return;
      }
      this.modalOpen = false;
      this.$store.toast.success("Gerakan custom berhasil ditambahkan.");
    },

    remove(exercise) {
      if (!window.confirm(`Hapus gerakan custom "${exercise.name}"? Riwayat sesi tetap tersimpan.`)) return;
      const result = this.$store.app.deleteExercise(exercise.id);
      if (!result.ok) {
        this.$store.toast.error(result.error);
        return;
      }
      this.$store.toast.info("Gerakan custom dihapus.");
    },

    lastUsed(exerciseId) {
      const session = this.$store.app
        .sessions()
        .filter((s) => s.status === "completed")
        .find((s) => s.exercises?.some((ex) => ex.exerciseId === exerciseId));
      if (!session) return null;
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      const sets = ex.sets.filter((s) => s.isCompleted !== false && Number(s.reps));
      if (!sets.length) return null;
      const top = [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
      return {
        date: session.date,
        label: `${this.$store.app.userWeightUnit() === "lb" ? Math.round(top.weight * 2.20462 * 10) / 10 : top.weight} ${this.$store.app.userWeightUnit()} × ${top.reps}`,
      };
    },

    typeLabel(type) {
      return { weighted: "Beban", bodyweight: "Bodyweight", cardio: "Cardio" }[type] || type;
    },
  };
}
