import {
  TIMEZONES,
  WEEKDAYS_SHORT,
  downloadJson,
  fromDisplayWeight,
  toDisplayWeight,
} from "../lib.js";

export function settingsPage() {
  return {
    profile: {
      name: "",
      email: "",
      goalWeight: "",
      unitWeight: "kg",
      unitLength: "cm",
      timezone: "Asia/Jakarta",
      targetDaysPerWeek: 4,
      defaultRestSeconds: 90,
    },
    rest: { auto: true, sound: true, vibration: true },
    notif: null,
    deleteOpen: false,
    timezones: TIMEZONES,
    weekdays: WEEKDAYS_SHORT,
    pushStatus: "default",
    deferredPrompt: null,
    installing: false,

    init() {
      const app = this.$store.app;
      const user = app.user;
      this.profile = {
        name: user.name || "",
        email: user.email || "",
        goalWeight: user.goalWeightKg ? toDisplayWeight(user.goalWeightKg, user.unitWeight || "kg") : "",
        unitWeight: user.unitWeight || "kg",
        unitLength: user.unitLength || "cm",
        timezone: user.timezone || "Asia/Jakarta",
        targetDaysPerWeek: user.targetDaysPerWeek || 4,
        defaultRestSeconds: user.defaultRestSeconds || 90,
      };
      this.rest = {
        auto: app.data.settings.restTimerAuto !== false,
        sound: app.data.settings.restTimerSound !== false,
        vibration: app.data.settings.restTimerVibration !== false,
      };
      this.notif = JSON.parse(JSON.stringify(app.data.settings.notifications));
      if ("Notification" in window) this.pushStatus = Notification.permission;
      window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        this.deferredPrompt = event;
      });
      window.addEventListener("appinstalled", () => {
        this.deferredPrompt = null;
        this.$store.toast.success("Gym Tracker berhasil dipasang di perangkat.");
      });
    },

    get isStandalone() {
      return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    },

    get isIOS() {
      return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    },

    async installApp() {
      if (!this.deferredPrompt) {
        this.$store.toast.info(
          this.isIOS
            ? "Di iPhone/iPad: buka menu Share → Tambah ke Home Screen."
            : "Gunakan menu browser → Install app / Tambah ke layar utama.",
        );
        return;
      }
      this.installing = true;
      try {
        this.deferredPrompt.prompt();
        await this.deferredPrompt.userChoice;
        this.deferredPrompt = null;
      } finally {
        this.installing = false;
      }
    },

    get unit() {
      return this.profile.unitWeight;
    },

    saveProfile() {
      if (!this.profile.name.trim()) {
        this.$store.toast.error("Nama wajib diisi.");
        return;
      }
      const goal = this.profile.goalWeight === "" ? null : fromDisplayWeight(this.profile.goalWeight, this.profile.unitWeight);
      this.$store.app.updateUser({
        name: this.profile.name.trim(),
        unitWeight: this.profile.unitWeight,
        unitLength: this.profile.unitLength,
        timezone: this.profile.timezone,
        targetDaysPerWeek: Number(this.profile.targetDaysPerWeek) || 4,
        defaultRestSeconds: Number(this.profile.defaultRestSeconds) || 90,
        goalWeightKg: goal,
      });
      this.$store.app.updateSettings({ defaultRestSeconds: Number(this.profile.defaultRestSeconds) || 90 });
      this.$store.toast.success("Profil dan preferensi disimpan.");
    },

    saveRest() {
      this.$store.app.updateSettings({
        restTimerAuto: this.rest.auto,
        restTimerSound: this.rest.sound,
        restTimerVibration: this.rest.vibration,
      });
      this.$store.toast.success("Pengaturan rest timer disimpan.");
    },

    saveNotifications(silent = false) {
      this.$store.app.updateSettings({ notifications: this.notif });
      if (!silent) this.$store.toast.success("Pengaturan notifikasi disimpan.");
    },

    get allNotificationsOff() {
      const keys = ["workoutReminder", "restDay", "missedSession", "bodyReminder", "restTimer"];
      return keys.every((key) => !this.notif?.[key]?.enabled);
    },

    toggleAllNotifications() {
      const turnOn = this.allNotificationsOff;
      ["workoutReminder", "restDay", "missedSession", "bodyReminder", "restTimer"].forEach((key) => {
        if (this.notif[key]) this.notif[key].enabled = turnOn;
      });
      if (!turnOn) this.notif.pushEnabled = false;
      this.saveNotifications(true);
      this.$store.toast.success(turnOn ? "Semua notifikasi diaktifkan." : "Semua notifikasi dimatikan.");
    },

    toggleDay(key, day) {
      const list = this.notif[key].days || [];
      this.notif[key].days = list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort();
      this.saveNotifications(true);
    },

    async requestPush() {
      if (!("Notification" in window)) {
        this.pushStatus = "unsupported";
        this.$store.toast.warning("Browser ini tidak mendukung notifikasi. Fallback in-app tetap aktif.");
        return;
      }
      try {
        const permission = await Notification.requestPermission();
        this.pushStatus = permission;
        if (permission === "granted") {
          this.notif.pushEnabled = true;
          this.saveNotifications(true);
          this.$store.toast.success("Notifikasi diizinkan. Pengingat akan tampil sebagai notifikasi browser.");
          const reg = await navigator.serviceWorker?.getRegistration?.();
          if (reg) {
            new Notification("Gym Tracker", {
              body: "Notifikasi aktif. Kami akan mengingatkan jadwal latihanmu 💪",
              icon: "images/logo/logo-icon.svg",
            });
          }
        } else {
          this.notif.pushEnabled = false;
          this.saveNotifications();
          this.$store.toast.info("Izin ditolak. Pengingat tetap muncul di pusat notifikasi in-app.");
        }
      } catch {
        this.$store.toast.error("Gagal meminta izin notifikasi.");
      }
    },

    exportData() {
      downloadJson(`gymtracker-export-${new Date().toISOString().slice(0, 10)}.json`, this.$store.app.exportData());
      this.$store.toast.success("Data berhasil diekspor.");
    },

    applyPlan() {
      const created = this.$store.app.applyPlanToFuture(4);
      this.$store.toast.success(created ? `${created} sesi terjadwal dibuat untuk 4 minggu ke depan.` : "Semua sesi 4 minggu ke depan sudah terjadwal.");
    },

    resetDemo() {
      if (!window.confirm("Muat ulang data demo? Perubahan pada akun demo akan hilang.")) return;
      this.$store.app.resetDemoData();
      window.location.href = "dashboard.html";
    },

    deleteAccount() {
      this.$store.app.deleteAccount();
    },

    logout() {
      this.$store.app.signOut();
    },
  };
}
