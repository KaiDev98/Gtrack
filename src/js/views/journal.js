import {
  SPLITS,
  formatDateID,
  formatDuration,
  formatVolume,
  sessionCompletedSets,
  sessionVolume,
} from "../lib.js";

export function journalPage() {
  return {
    search: "",

    get entries() {
      return this.$store.app.journalEntries(this.search);
    },

    split(key) {
      return SPLITS[key] || SPLITS.custom;
    },

    splitStyle(key) {
      const sp = this.split(key);
      return `background-color:${sp.soft};color:${sp.hex}`;
    },

    dateText(date) {
      return formatDateID(date, { weekday: "long", year: "numeric" });
    },

    scaleLabel(value) {
      return ["—", "Sangat rendah", "Rendah", "Cukup", "Baik", "Sangat baik"][value] || "—";
    },

    volumeText(session) {
      return formatVolume(sessionVolume(session), this.$store.app.userWeightUnit());
    },

    durationText(minutes) {
      return formatDuration(minutes);
    },

    setCount(session) {
      return sessionCompletedSets(session);
    },

    get totalEntries() {
      return this.$store.app.journalEntries("").length;
    },

    get notedSessions() {
      return this.$store.app.sessions().filter((s) => s.journal?.notes).length;
    },

    open(session) {
      window.location.href = `summary.html?id=${session.id}`;
    },
  };
}
