import { App } from "./store.js";
import { REST_KEY, formatClock, formatWeight } from "./lib.js";

/* ------------------------------ toasts ------------------------------ */
export function toastStore() {
  return {
    items: [],
    push(message, type = "success", timeout = 3800) {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      this.items.push({ id, message, type });
      if (timeout) {
        setTimeout(() => this.remove(id), timeout);
      }
      return id;
    },
    success(message) {
      return this.push(message, "success");
    },
    error(message) {
      return this.push(message, "error", 5000);
    },
    info(message) {
      return this.push(message, "info");
    },
    warning(message) {
      return this.push(message, "warning", 4500);
    },
    remove(id) {
      this.items = this.items.filter((t) => t.id !== id);
    },
  };
}

/* --------------------------- rest timer --------------------------- */
export function restTimerStore() {
  return {
    visible: false,
    running: false,
    remaining: 0,
    total: 90,
    endsAt: 0,
    muted: false,
    _tick: null,

    init() {
      try {
        const raw = localStorage.getItem(REST_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        this.muted = Boolean(saved.muted);
        if (saved.endsAt && saved.endsAt > Date.now()) {
          this.endsAt = saved.endsAt;
          this.total = saved.total || 90;
          this.remaining = Math.max(0, Math.ceil((saved.endsAt - Date.now()) / 1000));
          this.visible = true;
          this.running = true;
          this.loop();
        } else {
          localStorage.removeItem(REST_KEY);
        }
      } catch {
        /* ignore malformed state */
      }
    },

    get label() {
      return formatClock(this.remaining);
    },

    get progress() {
      if (!this.total) return 0;
      return Math.min(100, Math.max(0, ((this.total - this.remaining) / this.total) * 100));
    },

    start(seconds = 90) {
      const s = Math.max(5, Math.round(Number(seconds) || 90));
      this.total = s;
      this.remaining = s;
      this.endsAt = Date.now() + s * 1000;
      this.visible = true;
      this.running = true;
      this.muted = App.data?.settings?.restTimerSound === false;
      this.loop();
      this.persist();
    },

    loop() {
      clearInterval(this._tick);
      this._tick = setInterval(() => this.tick(), 250);
    },

    tick() {
      if (!this.running) return;
      const left = Math.ceil((this.endsAt - Date.now()) / 1000);
      if (left <= 0) {
        this.remaining = 0;
        this.complete();
      } else {
        this.remaining = left;
      }
    },

    pause() {
      if (!this.running) return;
      this.remaining = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
      this.running = false;
      clearInterval(this._tick);
      this.persist();
    },

    resume() {
      if (!this.remaining) return;
      this.endsAt = Date.now() + this.remaining * 1000;
      this.running = true;
      this.visible = true;
      this.loop();
      this.persist();
    },

    toggle() {
      if (this.running) this.pause();
      else this.resume();
    },

    add(seconds) {
      this.remaining = Math.max(0, this.remaining + seconds);
      this.total = Math.max(this.total + Math.max(0, seconds), this.remaining);
      if (this.running) this.endsAt = Date.now() + this.remaining * 1000;
      if (this.remaining > 0 && !this.running) this.resume();
      this.visible = true;
      this.persist();
    },

    reset() {
      this.remaining = this.total;
      this.endsAt = Date.now() + this.total * 1000;
      this.running = true;
      this.visible = true;
      this.loop();
      this.persist();
    },

    skip() {
      clearInterval(this._tick);
      this.running = false;
      this.visible = false;
      this.remaining = 0;
      localStorage.removeItem(REST_KEY);
    },

    complete() {
      clearInterval(this._tick);
      this.running = false;
      this.visible = false;
      this.remaining = 0;
      localStorage.removeItem(REST_KEY);
      this.vibrate([180, 80, 180]);
      if (!this.muted) this.beep();
      if (typeof Alpine !== "undefined") {
        Alpine.store("toast")?.success("Istirahat selesai. Siap untuk set berikutnya 💪");
      }
    },

    vibrate(pattern) {
      if (App.data?.settings?.restTimerVibration === false) return;
      if (navigator.vibrate) navigator.vibrate(pattern);
    },

    beep() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        setTimeout(() => ctx.close?.(), 700);
      } catch {
        /* audio may be blocked until user gesture */
      }
    },

    persist() {
      localStorage.setItem(
        REST_KEY,
        JSON.stringify({ endsAt: this.endsAt, total: this.total, muted: this.muted }),
      );
    },
  };
}

/* --------------------------- PR celebration --------------------------- */
const CONFETTI_COLORS = ["#465fff", "#12b76a", "#f79009", "#f04438", "#7c3aed", "#06b6d4"];

export function prStore() {
  return {
    visible: false,
    hits: [],
    confetti: [],
    _timeout: null,
    show(hits) {
      this.hits = hits || [];
      this.visible = true;
      this.confetti = Array.from({ length: 34 }, (_, i) => ({
        id: i,
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 500) / 1000,
        duration: 1.6 + Math.round(Math.random() * 12) / 10,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.round(Math.random() * 360),
      }));
      this.vibrate([60, 40, 120]);
      clearTimeout(this._timeout);
      this._timeout = setTimeout(() => this.hide(), 7000);
    },
    hide() {
      this.visible = false;
      clearTimeout(this._timeout);
    },
    formatHit(hit, key = "value") {
      const value = hit?.[key];
      if (value === null || value === undefined) return "—";
      if (hit.unit === "reps") return `${value} reps`;
      return formatWeight(value, App.user?.unitWeight || "kg");
    },
    vibrate(pattern) {
      if (App.data?.settings?.restTimerVibration === false) return;
      if (navigator.vibrate) navigator.vibrate(pattern);
    },
  };
}
