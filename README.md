# Gym Tracker

Dashboard latihan beban **mobile-first** untuk menjadwalkan sesi, mencatat set/repetisi/beban, memantau personal record, dan melihat progres tubuh. Dibangun di atas [TailAdmin Free (HTML)](https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template) dengan Alpine.js, Tailwind CSS v4, Webpack, ApexCharts, dan dukungan PWA.

Seluruh antarmuka menggunakan Bahasa Indonesia, dengan satuan berat (kg/lb) dan panjang (cm/in) yang bisa diganti.

## Demo

| | |
|---|---|
| **Email** | `demo@gymtracker.app` |
| **Password** | `demo1234` |

Akun demo sudah berisi 8 minggu riwayat latihan, template PPL, PR, metrik tubuh, dan notifikasi. Di halaman masuk, klik **Isi kredensial demo** untuk mengisi form otomatis.

## Menjalankan proyek

Prasyarat: **Node.js ≥ 18**.

```bash
npm install
npm run dev
```

Buka `http://localhost:8080`. Halaman masuk ada di `signin.html`.

Build produksi:

```bash
npm run build
npx serve build        # atau host statis lain
```

Folder `build/` berisi HTML, CSS, JS, gambar, `manifest.webmanifest`, `sw.js`, dan `offline.html`. Service Worker hanya aktif di `https` atau `localhost`. Karena aplikasi memakai path relatif, build bisa di-host di root domain maupun sub-folder.

## Akun, data, dan mode demo

PRD merekomendasikan **Supabase** untuk auth, database, dan push notification. Kredensial/backend Supabase belum tersedia saat implementasi, sehingga versi ini berjalan sepenuhnya **local-first**:

- Database disimpan di `localStorage` dengan key `gymtracker:db:v1`.
- Password di-hash sebelum disimpan, tetapi ini **bukan pengganti autentikasi server**.
- Sesi login disimpan di `localStorage` (remember me) atau `sessionStorage`.
- Data demo dibuat relatif terhadap tanggal hari ini, jadi akun demo selalu punya sesi Push hari ini.
- Ekspor data JSON tersedia di **Pengaturan → Data**.

Struktur data sudah dipisah per pengguna (`db.users` dan `db.data[userId]`), sehingga migrasi ke Supabase dapat dilakukan dengan memetakan tabel `users`, `exercises`, `sessions`, `templates`, `body_metrics`, `pr_events`, `notifications`, dan `settings`, lalu mengganti method pada `src/js/store.js`.

## Fitur yang tersedia

- **Auth & onboarding** — daftar, masuk, logout, remember me, rate limit percobaan login lokal, guard halaman, onboarding satuan/target/rest timer.
- **Jadwal** — strip minggu (swipe), kalender bulanan, status sesi, tandai selesai, rest day, pola mingguan, sesi terlewat otomatis.
- **Input latihan** — pilih/tambah gerakan, set/reps/beban, salin performa sebelumnya, autosave, durasi otomatis, wake lock, jurnal sesi.
- **PR & milestone** — deteksi beban, 1RM, repetisi, dan volume; perayaan PR + notifikasi in-app; milestone konsistensi.
- **Rest timer** — otomatis setelah set dicentang, pause/resume/reset, preset durasi, bunyi/getaran yang mengikuti pengaturan.
- **Template** — simpan sesi sebagai template, editor template, jadwalkan template langsung ke tanggal.
- **Dashboard & progres** — grafik volume, distribusi split, progres beban, PR, streak, completion rate, ApexCharts.
- **Body tracker** — berat, lemak tubuh, lingkar tubuh, grafik, perbandingan, progres menuju target, konversi kg/lb dan cm/in.
- **Jurnal** — catatan, skala kelelahan/tidur/mood, tag kendala, pencarian.
- **Notifikasi & pengaturan** — pusat notifikasi in-app, preferensi pengingat, izin Web Notification, ekspor data, reset demo, hapus akun.
- **PWA** — manifest, ikon 192/512/maskable/apple-touch, offline shell, Web Push handler, tombol install dengan fallback iOS.

## Struktur proyek

```text
src/
  pages/                 # Satu file HTML per halaman (diproses Webpack)
  partials/
    layout/              # Sidebar, header, bottom nav, toast, rest timer, PR, header auth
    auth/
  js/
    index.js             # Boot Alpine, register view, guard, service worker
    store.js             # Data layer + business logic (localStorage)
    seed.js              # Akun demo dan data awal
    lib.js               # Util tanggal, satuan, format, konstanta
    charts.js            # Wrapper ApexCharts
    stores.js            # Store Alpine: toast, rest timer, PR celebration
    views/               # Logika tiap halaman
  css/style.css          # Tailwind + token desain
  pwa/                   # manifest, service worker, offline page, ikon
  images/                # Aset gambar/logo
webpack.config.js        # Build HTML multi-page, include resolver, copy PWA
```

## Catatan pengembangan

- Semua beban disimpan dalam **kg**; konversi hanya dilakukan saat ditampilkan/diinput.
- `data-page` dan `data-auth` pada `<body>` menentukan guard saat boot.
- Halaman aplikasi memakai `x-data="appShell('<page>')"`; kontennya memakai `x-data="<page>Page()"`.
- `npm run format` menjalankan Prettier.
- Untuk pengujian browser, Playwright terpasang sebagai dev dependency (`npm i -D playwright` lalu `npx playwright install chromium`). Alur yang sudah diverifikasi: auth guard (termasuk logout lalu tombol Back), login demo, sesi latihan lengkap sampai PR, rest timer beserta pengaturan suara/getaran, simpan ringkasan, ulangi sesi, buka ringkasan sesi selesai, deep link `schedule.html?template=`, onboarding kg/lb + inci, konversi body tracker, template, jadwal, master switch notifikasi, dark mode, empty state pengguna baru, tanpa overflow horizontal di 360 px, dan offline shell PWA pada build produksi.

## Batasan saat ini

- Belum ada backend/Supabase, sinkronisasi antarperangkat, atau push notification terjadwal dari server.
- Reset password hanya mensimulasikan pengiriman email.
- Data hilang bila `localStorage` dibersihkan atau mode privat digunakan.
