/* Gym Tracker service worker — offline shell + Web Push handling. */
const VERSION = "gymtracker-v1.0.0";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./signin.html",
  "./signup.html",
  "./reset-password.html",
  "./onboarding.html",
  "./dashboard.html",
  "./schedule.html",
  "./workout.html",
  "./summary.html",
  "./exercises.html",
  "./templates.html",
  "./progress.html",
  "./body.html",
  "./journal.html",
  "./settings.html",
  "./bundle.js",
  "./style.css",
  "./manifest.webmanifest",
  "./offline.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./images/logo/logo-icon.svg",
  "./images/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {
            /* a missing optional asset should not block installation */
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isNavigation(request) {
  return request.mode === "navigate" || (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = (await caches.match(request)) || (await caches.match(new URL(request.url).pathname));
    if (cached) return cached;
    const shell = await caches.match("./index.html");
    if (shell) return shell;
    return caches.match("./offline.html");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Refresh in the background when online.
    if (request.method === "GET") {
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
          }
        })
        .catch(() => {});
    }
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin fonts/CDNs go to network
  if (url.pathname.endsWith("/sw.js")) return;

  if (isNavigation(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (/\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

/* ------------------------------ Web Push ------------------------------ */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text?.() || "Waktunya latihan 💪" };
  }
  const title = payload.title || "Gym Tracker";
  const options = {
    body: payload.body || "Pengingat latihanmu sudah tiba.",
    icon: payload.icon || "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    tag: payload.tag || "gymtracker-reminder",
    renotify: true,
    data: { url: payload.url || "./dashboard.html" },
    actions: [
      { action: "open", title: "Buka" },
      { action: "dismiss", title: "Nanti" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const target = new URL(event.notification.data?.url || "./dashboard.html", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
