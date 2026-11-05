import { TIMEZONES, WEEKDAYS_ID, dateKey } from "../lib.js";

export function appShell(page) {
  return {
    page,
    darkMode: false,
    sidebarOpen: false,
    notificationsOpen: false,
    userMenuOpen: false,

    init() {
      const stored = localStorage.getItem("darkMode");
      this.darkMode = stored !== null ? JSON.parse(stored) : false;
      document.documentElement.classList.toggle("dark", this.darkMode);
      this.$watch("darkMode", (value) => {
        localStorage.setItem("darkMode", JSON.stringify(value));
        document.documentElement.classList.toggle("dark", value);
        document.documentElement.setAttribute("data-color-scheme", value ? "dark" : "light");
        window.dispatchEvent(new CustomEvent("gt-theme", { detail: value }));
      });
    },

    get currentUser() {
      return this.$store.app.user;
    },

    get pageTitle() {
      const map = {
        dashboard: "Dashboard",
        schedule: "Jadwal Latihan",
        workout: "Sesi Latihan",
        summary: "Ringkasan Sesi",
        exercises: "Library Gerakan",
        templates: "Template Program",
        progress: "Progres & PR",
        body: "Body Tracker",
        journal: "Jurnal Latihan",
        settings: "Pengaturan",
      };
      return map[this.page] || "Gym Tracker";
    },

    get pageSubtitle() {
      const map = {
        dashboard: "Ringkasan aktivitas dan progres latihanmu",
        schedule: "Rencanakan split dan pantau konsistensi",
        workout: "Catat set, repetisi, dan beban",
        summary: "Evaluasi sesi yang baru selesai",
        exercises: "Gerakan bawaan dan custom milikmu",
        templates: "Simpan rutinitas, panggil saat di gym",
        progress: "Lihat perkembangan beban dan personal record",
        body: "Pantau berat, lemak, dan lingkar tubuh",
        journal: "Catatan dan refleksi tiap sesi",
        settings: "Profil, satuan, notifikasi, dan data",
      };
      return map[this.page] || "";
    },

    timeAgo(iso) {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.round(diff / 60000);
      if (mins < 1) return "Baru saja";
      if (mins < 60) return `${mins} mnt lalu`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `${hours} jam lalu`;
      const days = Math.round(hours / 24);
      if (days < 7) return `${days} hari lalu`;
      return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(iso));
    },

    startQuick() {
      const app = this.$store.app;
      let session = app.sessionByDate(gt.dateKey(new Date()));
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
      if (session.status !== "in_progress" && session.status !== "completed") app.startSession(session.id);
      window.location.href = `workout.html?id=${session.id}`;
    },

    get initials() {
      const name = this.currentUser?.name || "Gym User";
      return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
    },

    notifications() {
      return this.$store.app.notifications().slice(0, 7);
    },

    unreadCount() {
      return this.$store.app.unreadCount();
    },

    openNotification(n) {
      this.$store.app.markNotificationRead(n.id);
      this.notificationsOpen = false;
      if (n.href) window.location.href = n.href;
    },

    markAllRead() {
      this.$store.app.markAllNotificationsRead();
      this.$store.toast.success("Semua notifikasi ditandai sudah dibaca.");
    },

    logout() {
      this.$store.app.signOut();
    },
  };
}

export function signinPage() {
  return {
    email: "",
    password: "",
    remember: true,
    showPassword: false,
    error: "",
    loading: false,

    fillDemo() {
      this.email = this.$store.app.demoCredentials().email;
      this.password = this.$store.app.demoCredentials().password;
      this.error = "";
    },

    submit() {
      this.error = "";
      if (!this.email || !this.password) {
        this.error = "Email dan password wajib diisi.";
        return;
      }
      this.loading = true;
      const result = this.$store.app.signIn(this.email, this.password, this.remember);
      this.loading = false;
      if (!result.ok) {
        this.error = result.error;
        return;
      }
      const next = gt.queryParam("next");
      if (!result.user.onboardingComplete) {
        window.location.href = "onboarding.html";
        return;
      }
      window.location.href = next && next.startsWith("/") ? next : "dashboard.html";
    },
  };
}

export function signupPage() {
  return {
    name: "",
    email: "",
    password: "",
    confirm: "",
    agree: true,
    showPassword: false,
    errors: {},
    error: "",
    loading: false,

    validate() {
      const errors = {};
      if (!this.name.trim()) errors.name = "Nama wajib diisi.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) errors.email = "Format email tidak valid.";
      if (this.password.length < 8) errors.password = "Password minimal 8 karakter.";
      if (this.confirm !== this.password) errors.confirm = "Konfirmasi password tidak cocok.";
      if (!this.agree) errors.agree = "Kamu perlu menyetujui ketentuan.";
      this.errors = errors;
      return Object.keys(errors).length === 0;
    },

    submit() {
      this.error = "";
      if (!this.validate()) return;
      this.loading = true;
      const result = this.$store.app.signUp({ name: this.name, email: this.email, password: this.password });
      this.loading = false;
      if (!result.ok) {
        this.error = result.error;
        return;
      }
      window.location.href = "onboarding.html";
    },
  };
}

export function resetPage() {
  return {
    email: "",
    sent: false,
    error: "",
    submit() {
      this.error = "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
        this.error = "Masukkan email yang valid.";
        return;
      }
      this.sent = true;
    },
  };
}

export function onboardingPage() {
  return {
    step: 1,
    unitWeight: "kg",
    unitLength: "cm",
    timezone: "Asia/Jakarta",
    targetDays: 4,
    defaultRest: 90,
    notifications: true,
    starterPack: true,
    loading: false,
    timezones: TIMEZONES,
    weekdays: WEEKDAYS_ID,

    init() {
      const user = this.$store.app.user;
      if (!user) return;
      this.unitWeight = user.unitWeight || "kg";
      this.unitLength = user.unitLength || "cm";
      this.timezone = user.timezone || "Asia/Jakarta";
      this.targetDays = user.targetDaysPerWeek || 4;
      this.defaultRest = user.defaultRestSeconds || 90;
    },

    next() {
      if (this.step < 3) this.step++;
    },
    back() {
      if (this.step > 1) this.step--;
    },

    createStarterPack() {
      const app = this.$store.app;
      if (app.data.templates.length) return;
      const push = app.createTemplate({
        name: "Push Day",
        splitType: "push",
        exercises: [
          { exerciseId: "bench-press", targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120 },
          { exerciseId: "incline-dumbbell-press", targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
          { exerciseId: "lateral-raise", targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
          { exerciseId: "triceps-pushdown", targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 60 },
        ],
      });
      const pull = app.createTemplate({
        name: "Pull Day",
        splitType: "pull",
        exercises: [
          { exerciseId: "deadlift", targetSets: 3, targetRepsMin: 5, targetRepsMax: 8, restSeconds: 150 },
          { exerciseId: "lat-pulldown", targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
          { exerciseId: "barbell-row", targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
          { exerciseId: "barbell-curl", targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
        ],
      });
      const legs = app.createTemplate({
        name: "Leg Day",
        splitType: "legs",
        exercises: [
          { exerciseId: "squat", targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 150 },
          { exerciseId: "romanian-deadlift", targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 120 },
          { exerciseId: "leg-press", targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 90 },
          { exerciseId: "calf-raise", targetSets: 4, targetRepsMin: 12, targetRepsMax: 20, restSeconds: 60 },
        ],
      });
      app.setPlanDay(1, "push", push.template?.id);
      app.setPlanDay(3, "pull", pull.template?.id);
      app.setPlanDay(5, "legs", legs.template?.id);
      app.setPlanDay(0, "rest");
      app.setPlanDay(2, "rest");
      app.setPlanDay(4, "rest");
      app.setPlanDay(6, "rest");
      const plan = app.data.weeklyPlan[new Date().getDay()];
      if (plan && plan.split !== "rest" && !app.sessionByDate(dateKey(new Date()))) {
        app.scheduleSession({ date: dateKey(new Date()), split: plan.split, templateId: plan.templateId });
      }
    },

    finish() {
      this.loading = true;
      const app = this.$store.app;
      app.completeOnboarding({
        unitWeight: this.unitWeight,
        unitLength: this.unitLength,
        timezone: this.timezone,
        targetDaysPerWeek: this.targetDays,
        defaultRestSeconds: this.defaultRest,
        notifications: this.notifications,
      });
      if (this.starterPack) this.createStarterPack();
      app.addNotification({
        type: "info",
        title: "Selamat datang di Gym Tracker 👋",
        body: "Mulai sesi pertamamu dan catat progresmu di sini.",
        href: "dashboard.html",
      });
      this.loading = false;
      window.location.href = "dashboard.html";
    },
  };
}
