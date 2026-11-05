import "../css/style.css";

import collapse from "@alpinejs/collapse";
import persist from "@alpinejs/persist";
import Alpine from "alpinejs";

import { App, getStoredSession } from "./store.js";
import { prStore, restTimerStore, toastStore } from "./stores.js";
import * as gtLib from "./lib.js";

import { appShell, onboardingPage, resetPage, signinPage, signupPage } from "./views/shell.js";
import { dashboardPage } from "./views/dashboard.js";
import { schedulePage } from "./views/schedule.js";
import { workoutPage } from "./views/workout.js";
import { summaryPage } from "./views/summary.js";
import { exercisesPage } from "./views/exercises.js";
import { templatesPage } from "./views/templates.js";
import { progressPage } from "./views/progress.js";
import { bodyPage } from "./views/body.js";
import { journalPage } from "./views/journal.js";
import { settingsPage } from "./views/settings.js";

/* Theme is applied before Alpine boots to avoid a light flash. */
(function applyInitialTheme() {
  try {
    const stored = localStorage.getItem("darkMode");
    const dark = stored !== null ? JSON.parse(stored) : false;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.setAttribute("data-color-scheme", dark ? "dark" : "light");
  } catch {
    /* storage may be unavailable */
  }
})();

window.gt = {
  ...gtLib,
  go: (url) => {
    window.location.href = url;
  },
};

Alpine.plugin(persist);
Alpine.plugin(collapse);
window.Alpine = Alpine;

Alpine.data("appShell", appShell);
Alpine.data("signinPage", signinPage);
Alpine.data("signupPage", signupPage);
Alpine.data("resetPage", resetPage);
Alpine.data("onboardingPage", onboardingPage);
Alpine.data("dashboardPage", dashboardPage);
Alpine.data("schedulePage", schedulePage);
Alpine.data("workoutPage", workoutPage);
Alpine.data("summaryPage", summaryPage);
Alpine.data("exercisesPage", exercisesPage);
Alpine.data("templatesPage", templatesPage);
Alpine.data("progressPage", progressPage);
Alpine.data("bodyPage", bodyPage);
Alpine.data("journalPage", journalPage);
Alpine.data("settingsPage", settingsPage);

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const secure = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!secure) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* dev server may not serve the worker */
    });
  });
}

function boot() {
  const app = App.init();
  const page = document.body.dataset.page || "";
  const auth = document.body.dataset.auth || "public";
  const next = encodeURIComponent(window.location.pathname + window.location.search);

  if (page === "landing") {
    if (app.user) {
      location.replace(app.user.onboardingComplete ? "dashboard.html" : "onboarding.html");
    } else {
      location.replace("signin.html");
    }
    return;
  }

  if (auth === "required" && !app.user) {
    location.replace(`signin.html?next=${next}`);
    return;
  }

  if (auth === "guest" && app.user) {
    location.replace(app.user.onboardingComplete ? "dashboard.html" : "onboarding.html");
    return;
  }

  Alpine.store("app", app);
  Alpine.store("toast", toastStore());
  Alpine.store("restTimer", restTimerStore());
  Alpine.store("pr", prStore());

  Alpine.store("restTimer").init?.();

  try {
    Alpine.start();
  } catch (error) {
    console.error("Gagal menjalankan aplikasi:", error);
  }

  document.body.style.visibility = "visible";

  window.addEventListener("online", () => Alpine.store("toast")?.success("Kembali online. Data akan tersinkron."));
  window.addEventListener("offline", () => Alpine.store("toast")?.warning("Kamu sedang offline. Perubahan disimpan lokal dan disinkronkan nanti."));

  // Re-check auth when a page is restored from the back-forward cache.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    const auth = document.body.dataset.auth || "public";
    const signedIn = Boolean(getStoredSession());
    if (auth === "required" && !signedIn) {
      location.replace("signin.html");
      return;
    }
    if (auth === "guest" && signedIn) {
      location.replace("dashboard.html");
    }
  });

  registerServiceWorker();
}

boot();
