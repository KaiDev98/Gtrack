# PRD — Gym Tracker

| | |
|---|---|
| **Nama Produk** | Gym Tracker (nama kerja) |
| **Versi Dokumen** | 1.0 (Draft) |
| **Tanggal** | 5 November 2026 |
| **Platform** | Web App, Mobile-First (PWA) |
| **Basis UI** | [TailAdmin Free Tailwind Dashboard Template](https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template) |
| **Status** | Draft, siap direview sebelum development |

---

## 1. Ringkasan Produk

Gym Tracker adalah aplikasi web untuk mencatat, menjadwalkan, dan memantau progres latihan beban. Pengguna dapat merencanakan split latihan harian, mencatat set, repetisi, dan beban tiap gerakan, memakai timer istirahat saat di gym, dan melihat perkembangan lewat grafik. Aplikasi mendeteksi Personal Record (PR) secara otomatis dan menyimpan metrik tubuh agar progres di gym dan perubahan fisik bisa dilihat bersama.

Aplikasi dirancang **mobile-first** karena dipakai langsung di lantai gym, sering dengan satu tangan dan di sela-sela set.

## 2. Latar Belakang & Masalah

| Masalah | Dampak |
|---|---|
| Catatan latihan tersebar di chat, notes HP, atau kertas | Sulit melihat riwayat dan membandingkan performa |
| Tidak ada angka beban, repetisi, dan set yang konsisten | Progressive overload tidak terukur |
| Istirahat antar set tidak terkontrol | Intensitas latihan tidak konsisten |
| Mengetik ulang rutinitas yang sama tiap hari | Buang waktu dan malas mencatat |
| Tidak ada pengingat | Jadwal latihan sering terlewat |
| Progres fisik dan progres angkatan terpisah | Sulit melihat gambaran utuh |

## 3. Tujuan & Metrik Keberhasilan

### 3.1 Tujuan Produk
1. Pencatatan satu sesi latihan selesai dengan input sesedikit mungkin.
2. Pengguna dapat melihat progres (beban, volume, konsistensi) secara visual.
3. Pengguna terdorong tetap konsisten lewat pengingat dan perayaan PR.
4. Nyaman dipakai di layar HP saat di gym.

### 3.2 Metrik Keberhasilan (KPI)

| Metrik | Target Awal |
|---|---|
| Waktu mencatat 1 set (dari template) | ≤ 10 detik |
| Pengguna yang membuat ≥ 1 template dalam 7 hari pertama | ≥ 50% |
| Retensi mingguan (membuka app ≥ 3×/minggu) | ≥ 40% |
| Rasio sesi terjadwal yang ditandai selesai | ≥ 60% |
| Skor Lighthouse Mobile (Performance & Accessibility) | ≥ 85 |

## 4. Target Pengguna

**Persona utama: "Rafi", 22 tahun, lifter pemula–menengah**
- Latihan 3–5 hari per minggu dengan split Push/Pull/Legs atau Upper/Lower.
- Membuka app di HP saat di gym, sering dengan tangan berkeringat dan waktu terbatas.
- Ingin tahu apakah bebannya naik dari minggu ke minggu.
- Mudah lupa jadwal dan malas mencatat kalau prosesnya ribet.

**Persona sekunder:** pengguna yang baru mulai olahraga dan ingin membangun kebiasaan latihan rutin.

## 5. Ruang Lingkup

### 5.1 Dalam Lingkup (In Scope)
Semua fitur pada Bagian 7 (F-01 s.d. F-12).

### 5.2 Di Luar Lingkup (Out of Scope, untuk saat ini)
- Fitur sosial (teman, leaderboard, berbagi)
- Rekomendasi program latihan berbasis AI
- Pelacakan nutrisi dan kalori
- Integrasi wearable (Apple Watch, Garmin, dsb.)
- Aplikasi native iOS/Android (cukup PWA)
- Pembayaran dan langganan
- Library video tutorial gerakan

## 6. Arsitektur & Tech Stack

### 6.1 Fondasi Frontend: TailAdmin Free (HTML)

Repo yang dipakai adalah versi **HTML** dari TailAdmin Free. Stack bawaannya:

| Komponen | Teknologi |
|---|---|
| Struktur | HTML multi-page |
| Interaktivitas | Alpine.js (+ plugin `@alpinejs/persist`) |
| Styling | Tailwind CSS v4 |
| Bundler | Webpack |
| Grafik | ApexCharts (sudah dipakai di template) |
| Runtime | Node.js ≥ 18 |

Fitur bawaan template yang dimanfaatkan: layout sidebar/header, dark mode, komponen form/tabel/kartu, halaman Sign In dan Sign Up, serta komponen grafik.

> **Catatan penting:** TailAdmin versi HTML hanyalah *template UI statis*. Ia **tidak punya backend, database, maupun autentikasi**. Karena itu, kita perlu menambahkan layer backend (lihat 6.2).

### 6.2 Backend yang Disarankan (Asumsi, perlu konfirmasi)

| Kebutuhan | Rekomendasi | Alasan |
|---|---|---|
| Autentikasi | **Supabase Auth** (email + password) | Aman, tanpa membuat sistem auth sendiri, cocok dipanggil dari JS di HTML statis |
| Database | **Supabase Postgres** + Row Level Security (RLS) | Data tiap user terisolasi di level database |
| API | Supabase JS Client (`supabase-js`) | Langsung dari frontend, tanpa server tambahan |
| Penjadwal notifikasi | Supabase Edge Function + `pg_cron` | Mengirim pengingat sesuai jadwal user |
| Push | Web Push API (VAPID) + Service Worker | Notifikasi bisa muncul walau tab ditutup |
| Hosting | Vercel / Netlify / Cloudflare Pages | Deploy statis dari folder build |

**Alternatif** jika ingin full-control: Node.js (Express/Fastify) + PostgreSQL + JWT. Keputusan final tercatat di Bagian 15.

### 6.3 Pendekatan PWA
- `manifest.webmanifest` agar bisa di-*Add to Home Screen*.
- Service Worker untuk cache aset statis, mode offline dasar, dan menerima push.
- **Offline-tolerant untuk input sesi:** data set disimpan sementara di `localStorage`/IndexedDB lalu disinkronkan saat koneksi kembali, karena sinyal di dalam gym sering buruk.

## 7. Spesifikasi Fitur

**Prioritas:** `P0` = wajib untuk MVP · `P1` = penting, segera setelah MVP · `P2` = pelengkap.

### Ringkasan

| ID | Fitur | Prioritas |
|---|---|---|
| F-01 | Autentikasi Pengguna | P0 |
| F-02 | Kategorisasi Program Latihan (Split) | P0 |
| F-03 | Pelacakan Jadwal Latihan (Daily Tracker) | P0 |
| F-04 | Input Detail Sesi Latihan | P0 |
| F-05 | Pencatatan Set, Repetisi, dan Beban (Volume Tracker) | P0 |
| F-06 | Jurnal / Catatan Latihan | P1 |
| F-07 | Timer Istirahat (Rest Timer) | P0 |
| F-08 | Template Program Latihan | P1 |
| F-09 | Dashboard & Visualisasi Data | P0 |
| F-10 | Personal Record (PR) & Milestone | P1 |
| F-11 | Pelacakan Metrik Tubuh (Body Tracker) | P1 |
| F-12 | Sistem Notifikasi | P1 |
| F-13 | Desain Antarmuka Mobile-First | P0 (lintas fitur) |

---

### F-01 — Autentikasi Pengguna `P0`

**Deskripsi:** Registrasi, login, dan logout yang aman agar setiap pengguna hanya mengakses data miliknya.

**User story:** *Sebagai pengguna, saya ingin membuat akun dan login agar data latihan saya tersimpan pribadi dan bisa diakses dari perangkat mana pun.*

**Kebutuhan fungsional**
- Registrasi dengan nama, email, dan password (+ konfirmasi password).
- Login dengan email dan password; sesi tetap aktif (*remember me*).
- Logout menghapus sesi di perangkat tersebut.
- Reset password lewat email.
- Halaman yang butuh login (semua selain Sign In/Sign Up) **harus** me-redirect ke login bila belum terautentikasi.
- Onboarding singkat setelah registrasi pertama: satuan berat (kg/lb), zona waktu, dan hari latihan target per minggu.

**Kriteria penerimaan**
- [ ] Password minimal 8 karakter; validasi tampil inline di form.
- [ ] Email duplikat ditolak dengan pesan jelas.
- [ ] Pengguna A tidak dapat membaca atau mengubah data pengguna B (diuji lewat RLS).
- [ ] Setelah logout, tombol *Back* browser tidak menampilkan halaman terproteksi.
- [ ] Rate limiting dasar pada percobaan login.

**Pemanfaatan template:** halaman `signin.html` dan `signup.html` bawaan TailAdmin disesuaikan.

---

### F-02 — Kategorisasi Program Latihan (Split) `P0`

**Deskripsi:** Pengguna menentukan jenis latihan untuk tiap hari.

**Opsi split bawaan:** `Push`, `Pull`, `Legs`, `Upper`, `Lower`, `Full Body`, `Rest Day`, `Lainnya (custom)`.

**Kebutuhan fungsional**
- Memilih split saat menjadwalkan sesi pada tanggal tertentu.
- Setiap split memiliki warna/label berbeda agar mudah dikenali di kalender dan dashboard.
- Pengguna dapat menandai hari sebagai **Rest Day**.
- *(Opsional)* Mengatur pola mingguan berulang, misalnya Senin=Push, Selasa=Pull, Rabu=Legs, dst., yang otomatis mengisi jadwal minggu-minggu berikutnya.

**Kriteria penerimaan**
- [ ] Satu tanggal hanya punya satu split utama.
- [ ] Rest Day tidak mewajibkan input gerakan.
- [ ] Mengubah pola mingguan tidak menghapus riwayat sesi yang sudah selesai.

---

### F-03 — Pelacakan Jadwal Latihan (Daily Tracker) `P0`

**Deskripsi:** Tampilan jadwal per hari/minggu untuk menjadwalkan, menandai selesai, dan melihat status sesi.

**User story:** *Sebagai pengguna, saya ingin melihat jadwal latihan minggu ini dan mencentang sesi yang sudah selesai agar saya tahu seberapa konsisten saya.*

**Kebutuhan fungsional**
- Tampilan **strip minggu** (swipe kiri/kanan) dan **kalender bulanan**.
- Tiap hari menampilkan: split, jumlah gerakan, dan status.
- **Checkbox selesai** pada tiap sesi.
- Status sesi: `Terjadwal` → `Sedang Berlangsung` → `Selesai` / `Terlewat` / `Rest Day`.
- Sesi yang lewat tanggal tanpa dicentang otomatis berstatus `Terlewat` (tetap bisa diubah manual).
- Tombol cepat **"Mulai Latihan"** pada sesi hari ini.
- Laporan ringkas sesi: durasi, total volume, jumlah gerakan, dan PR yang dicapai.

**Kriteria penerimaan**
- [ ] Mencentang checkbox langsung memperbarui status tanpa reload halaman.
- [ ] Menandai selesai tanpa ada data set menampilkan konfirmasi.
- [ ] Hari ini ditandai jelas pada strip minggu.

---

### F-04 — Input Detail Sesi Latihan `P0`

**Deskripsi:** Form pencatatan sesi latihan yang spesifik.

**Kebutuhan fungsional**
- **Nama gerakan (wajib)** dengan *autocomplete* dari library gerakan bawaan (Bench Press, Push Up, Squat, Deadlift, dll.) dan dapat membuat gerakan custom.
- **Durasi latihan (wajib)**:
  - Durasi total sesi, dihitung otomatis dari tombol Mulai/Selesai, dan bisa diedit manual.
  - Durasi per gerakan bersifat opsional, berguna untuk cardio atau plank.
- Menambah, mengurutkan ulang, dan menghapus gerakan dalam satu sesi.
- Menyimpan sesi sebagai **draft** otomatis (*autosave*) agar tidak hilang bila browser tertutup.

**Kriteria penerimaan**
- [ ] Sesi tidak dapat disimpan sebagai "Selesai" jika nama gerakan atau durasi kosong.
- [ ] Pesan error muncul langsung di bawah field yang bermasalah.
- [ ] Autosave berjalan setiap perubahan, tanpa tombol simpan manual.

---

### F-05 — Pencatatan Set, Repetisi, dan Beban (Volume Tracker) `P0`

**Deskripsi:** Tiap gerakan memiliki daftar set dengan repetisi dan beban untuk mendukung *progressive overload*.

**Kebutuhan fungsional**
- Per gerakan: tambah banyak **set**, masing-masing berisi **repetisi** dan **beban (kg/lb)**.
- Centang per set untuk menandai selesai; pada layar mobile, centang ini **memicu rest timer** (F-07).
- Menampilkan **performa sesi sebelumnya** untuk gerakan yang sama (mis. "Terakhir: 60 kg × 8") sebagai acuan.
- Tombol salin set sebelumnya dan tombol +/− cepat (±2,5 kg) untuk mempercepat input.
- Dukungan gerakan *bodyweight* (beban = 0 atau berat badan).
- Perhitungan otomatis:
  - **Volume set** = repetisi × beban
  - **Volume gerakan/sesi** = jumlah volume seluruh set
  - **Estimasi 1RM** (rumus Epley: `beban × (1 + repetisi / 30)`)

**Kriteria penerimaan**
- [ ] Beban menerima desimal (mis. 22,5) dan repetisi hanya bilangan bulat positif.
- [ ] Input numerik memunculkan keyboard angka di mobile.
- [ ] Volume total diperbarui real-time saat angka diubah.

---

### F-06 — Jurnal / Catatan Latihan `P1`

**Deskripsi:** Evaluasi pribadi per sesi.

**Kebutuhan fungsional**
- Kolom teks bebas untuk catatan sesi.
- Input terstruktur singkat (opsional):
  - Tingkat kelelahan (skala 1–5)
  - Kualitas tidur (skala 1–5)
  - Mood/energi (skala 1–5)
- Tag cepat untuk kendala, misalnya "nyeri bahu", "grip lemah", "kurang tidur".
- Riwayat jurnal dapat dilihat per sesi dan dicari berdasarkan kata kunci.

**Kriteria penerimaan**
- [ ] Jurnal bersifat opsional dan tidak menghalangi penyelesaian sesi.
- [ ] Catatan tampil di detail sesi dan di daftar riwayat.

---

### F-07 — Timer Istirahat (Rest Timer) `P0`

**Deskripsi:** Hitung mundur di antara set untuk menjaga intensitas.

**Kebutuhan fungsional**
- Preset: **60 detik, 90 detik, 120 detik**, plus durasi custom.
- Mulai otomatis saat set dicentang (dapat dimatikan di pengaturan) atau manual.
- Kontrol: Pause, Reset, +15 detik, −15 detik, Lewati.
- Muncul sebagai **bottom sheet/bar melayang** yang tetap terlihat saat pengguna menggulir form.
- Saat selesai: **getar** (Vibration API) dan/atau **bunyi** pendek, dengan tombol mute.
- Preferensi durasi default tersimpan per pengguna (bahkan bisa per gerakan).

**Catatan teknis:** Timer dihitung berdasarkan *timestamp akhir* (bukan interval per detik) agar tetap akurat ketika layar terkunci atau tab di latar belakang. Pertimbangkan Screen Wake Lock API agar layar tidak mati selama sesi aktif.

**Kriteria penerimaan**
- [ ] Waktu tetap akurat setelah tab di-background lalu dibuka kembali.
- [ ] Timer tidak mereset saat berpindah gerakan.

---

### F-08 — Template Program Latihan `P1`

**Deskripsi:** Menyimpan rutinitas agar tidak mengetik ulang.

**User story:** *Sebagai pengguna, saya ingin menyimpan "Dada & Tricep Senin" sehingga di gym saya cukup memanggilnya dan mengisi angka repetisi dan beban.*

**Kebutuhan fungsional**
- Membuat template: nama, split, dan daftar gerakan beserta jumlah set target, rentang repetisi target, dan durasi istirahat.
- **Simpan sesi sebagai template** dari sesi yang sudah ada.
- Memanggil template pada sesi baru; semua gerakan dan jumlah set terisi otomatis, pengguna hanya mengisi angka aktual.
- Menampilkan beban terakhir sebagai nilai awal (*pre-fill*).
- Edit, duplikat, dan hapus template.
- Menetapkan template ke hari tertentu pada pola mingguan (terhubung dengan F-02).

**Kriteria penerimaan**
- [ ] Mengubah template tidak mengubah sesi lama yang sudah dibuat darinya.
- [ ] Menghapus template tidak menghapus riwayat sesi.

---

### F-09 — Dashboard & Visualisasi Data `P0`

**Deskripsi:** Halaman utama dengan ringkasan aktivitas dan grafik progres.

**Kebutuhan fungsional**

*Kartu ringkasan*
- Sesi minggu ini (selesai / terjadwal)
- Streak hari latihan berturut-turut
- Total volume minggu ini (dan selisihnya terhadap minggu lalu)
- Total durasi latihan

*Grafik (ApexCharts)*, dengan filter **Harian / Mingguan / Bulanan**:
- Volume latihan dari waktu ke waktu (bar/line)
- Frekuensi latihan (konsistensi)
- Progres beban atau estimasi 1RM per gerakan terpilih (line)
- Distribusi split (donut), misalnya porsi Push/Pull/Legs

*Lainnya*
- Kartu **"Latihan Hari Ini"** dengan tombol Mulai.
- Daftar PR terbaru.
- Kartu ringkasan Body Tracker (F-11).
- *Empty state* yang ramah untuk pengguna baru.

**Kriteria penerimaan**
- [ ] Dashboard memuat dan menampilkan data utama dalam ≤ 2 detik pada koneksi 4G.
- [ ] Grafik responsif dan terbaca pada lebar layar 360 px.
- [ ] Mengganti filter periode memperbarui grafik tanpa reload halaman.

**Pemanfaatan template:** halaman dashboard utama TailAdmin dan komponen kartu metrik serta chart bawaannya.

---

### F-10 — Personal Record (PR) & Milestone `P1`

**Deskripsi:** Deteksi otomatis pencapaian terbaik dibanding riwayat.

**Jenis PR yang dideteksi (per gerakan)**
| Jenis PR | Definisi |
|---|---|
| **Beban Terberat** | Beban tertinggi yang pernah diangkat (minimal 1 repetisi) |
| **Repetisi Terbanyak** | Repetisi terbanyak pada beban yang sama (atau bodyweight) |
| **Estimasi 1RM Tertinggi** | Nilai Epley tertinggi |
| **Volume Sesi Tertinggi** | Total volume tertinggi untuk gerakan itu dalam satu sesi |

**Kebutuhan fungsional**
- Deteksi berjalan saat set dicentang selesai, sehingga pengguna langsung tahu saat PR terjadi.
- **Perayaan:** badge "🏆 PR Baru!", animasi singkat (confetti ringan), dan getar.
- Halaman **Riwayat PR** per gerakan dengan tanggal dan nilai sebelumnya.
- **Milestone** otomatis, contohnya:
  - Sesi pertama selesai
  - 10 / 50 / 100 sesi selesai
  - Streak 7 / 30 hari
  - Total volume 10.000 kg / 100.000 kg
  - Bench Press, Squat, atau Deadlift melewati 1× berat badan
- Set pertama kali pada gerakan baru **tidak** dihitung sebagai PR (belum ada pembanding), tetapi dicatat sebagai *baseline*.

**Kriteria penerimaan**
- [ ] PR tidak muncul ganda untuk angka yang sama.
- [ ] Jika set yang menjadi PR dihapus atau diedit, nilai PR dihitung ulang.

---

### F-11 — Pelacakan Metrik Tubuh (Body Tracker) `P1`

**Deskripsi:** Memantau perubahan fisik agar sejalan dengan progres angkatan.

**Metrik yang dicatat**
- Berat badan (kg)
- Persentase lemak tubuh (%)
- Lingkar tubuh (cm): lengan, dada, perut/pinggang, *(opsional: paha, bahu, pinggul)*

**Kebutuhan fungsional**
- Form entri cepat dengan tanggal (default hari ini); semua field opsional kecuali tanggal dan minimal satu metrik.
- Grafik tersendiri per metrik, dengan rentang 1 bulan / 3 bulan / 6 bulan / semua.
- Tampilan **perbandingan berdampingan** dengan grafik beban/volume (mis. berat badan vs total volume).
- Menampilkan selisih terhadap entri pertama dan entri sebelumnya.
- *(Opsional)* Target berat badan dan garis target pada grafik.

**Kriteria penerimaan**
- [ ] Satu tanggal dapat diedit tanpa membuat entri duplikat.
- [ ] Satuan mengikuti pengaturan pengguna (kg/lb, cm/in).

---

### F-12 — Sistem Notifikasi `P1`

**Deskripsi:** Pengingat otomatis jadwal latihan dan Rest Day.

**Jenis notifikasi**
| Notifikasi | Pemicu | Contoh pesan |
|---|---|---|
| Pengingat latihan | X menit sebelum jam latihan atau pada jam tetap | "Hari ini Push Day. Siap angkat? 💪" |
| Pengingat Rest Day | Pada hari Rest Day | "Hari ini Rest Day. Istirahat yang cukup ya 😴" |
| Sesi terlewat *(opsional)* | Malam hari jika sesi belum ditandai | "Kamu belum latihan hari ini. Masih sempat?" |
| Pengingat Body Tracker *(opsional)* | Mingguan | "Waktunya timbang dan ukur progres minggu ini." |
| Rest timer selesai | Timer mencapai 0 | Getar dan bunyi (in-app) |

**Kebutuhan fungsional**
- Pengaturan: aktif/nonaktif per jenis notifikasi, jam pengingat, dan hari.
- **Web Push** (Service Worker + VAPID) dengan permintaan izin yang dijelaskan konteksnya terlebih dahulu.
- **Fallback in-app alert** (toast/banner dan pusat notifikasi) jika izin push ditolak atau tidak didukung.
- Notifikasi mengikuti **zona waktu** pengguna.
- Klik notifikasi membuka halaman sesi hari itu.

**Keterbatasan yang perlu diketahui**
- Di **iOS**, Web Push hanya berfungsi bila aplikasi sudah dipasang ke Home Screen (PWA) dan pengguna memberi izin. Alur onboarding perlu memandu hal ini.
- Pengiriman push tidak dijamin tepat detik; sebaiknya diberi toleransi beberapa menit.

**Kriteria penerimaan**
- [ ] Pengguna dapat mematikan semua notifikasi dalam satu langkah.
- [ ] Tidak ada notifikasi yang terkirim di luar jam yang dipilih pengguna.

---

### F-13 — Desain Antarmuka Mobile-First `P0` (lintas fitur)

**Prinsip**
- Desain dan uji dimulai dari lebar **360–414 px**, lalu naik ke tablet dan desktop.
- **Target sentuh minimal 44×44 px**; tombol aksi utama mudah dijangkau jempol.
- **Bottom navigation bar** (Dashboard · Jadwal · Latihan · Progres · Profil) menggantikan sidebar pada layar kecil. Sidebar bawaan TailAdmin tetap dipakai di desktop.
- **Tombol aksi utama melayang** (FAB) "Mulai Latihan".
- Input numerik besar dengan tombol +/−; keyboard angka otomatis (`inputmode="decimal"`).
- Mengurangi ketikan: autocomplete, pre-fill, salin set, template.
- **Dark mode** (sudah ada di TailAdmin) dengan kontras baik di ruangan gym yang terang maupun redup.
- Layar tetap menyala selama sesi aktif (Wake Lock).
- Tidak ada elemen yang bergantung pada *hover*.
- Tabel lebar diganti kartu/daftar vertikal pada layar kecil.

**Kriteria penerimaan**
- [ ] Tidak ada scroll horizontal pada lebar 360 px.
- [ ] Seluruh alur utama (login → mulai sesi → catat set → selesai) dapat dilakukan dengan satu tangan.
- [ ] Lulus audit Lighthouse Mobile (Performance & Accessibility ≥ 85).

---

## 8. Alur Pengguna Utama

**A. Pengguna baru**
`Registrasi` → `Onboarding (satuan, zona waktu, target hari/minggu)` → `Buat template/atur pola mingguan` → `Aktifkan notifikasi` → `Dashboard`

**B. Latihan harian (alur inti)**
`Notifikasi pengingat` → `Buka sesi hari ini (atau pilih template)` → `Mulai Latihan` → `Isi beban & repetisi per set` → `Centang set` → `Rest timer berjalan otomatis` → `(PR terdeteksi 🏆)` → `Selesai Latihan` → `Isi jurnal (opsional)` → `Ringkasan sesi`

**C. Melihat progres**
`Dashboard` → `Pilih periode (harian/mingguan/bulanan)` → `Pilih gerakan` → `Lihat grafik beban/volume` → `Bandingkan dengan Body Tracker`

## 9. Struktur Halaman & Navigasi

| Halaman | Isi | Basis Template TailAdmin |
|---|---|---|
| `/signin`, `/signup`, `/reset-password` | Autentikasi | Sign In / Sign Up |
| `/dashboard` | Ringkasan dan grafik | Dashboard utama |
| `/schedule` | Kalender dan strip mingguan, status sesi | Calendar |
| `/workout/:id` | Mode pencatatan sesi (set, beban, timer) | Form elements |
| `/workout/:id/summary` | Ringkasan dan jurnal sesi | Card/Table |
| `/exercises` | Library gerakan (bawaan + custom) | Table/List |
| `/templates` | Daftar dan editor template | Table + Form |
| `/progress` | Grafik per gerakan dan riwayat PR | Charts |
| `/body` | Body Tracker | Form + Charts |
| `/journal` | Riwayat catatan | List |
| `/settings` | Profil, satuan, notifikasi, timer default | Profile/Settings |

**Navigasi mobile (bottom bar):** Dashboard · Jadwal · **Latihan (FAB)** · Progres · Profil
**Navigasi desktop:** sidebar TailAdmin dengan menu yang sama ditambah Template, Gerakan, Body, Jurnal.

## 10. Model Data (Konseptual)

> Semua tabel memiliki `id`, `created_at`, `updated_at`, dan (kecuali `exercises` bawaan) `user_id` dengan **RLS: user hanya mengakses barisnya sendiri**.

| Tabel | Kolom Utama | Keterangan |
|---|---|---|
| `profiles` | user_id, nama, unit_weight, unit_length, timezone, target_days_per_week, default_rest_seconds | Ekstensi dari tabel auth |
| `exercises` | id, user_id (null = bawaan), nama, kategori/otot, tipe (weighted/bodyweight/cardio) | Library gerakan |
| `weekly_plan` | user_id, weekday (0–6), split_type, template_id | Pola mingguan berulang |
| `workout_sessions` | user_id, date, split_type, status, started_at, ended_at, duration_minutes, template_id, total_volume | Satu sesi per hari |
| `session_exercises` | session_id, exercise_id, urutan, duration_minutes (opsional), catatan | Gerakan dalam sesi |
| `sets` | session_exercise_id, urutan, reps, weight, is_completed, rest_seconds | Data set |
| `session_journals` | session_id, catatan, fatigue (1–5), sleep_quality (1–5), mood (1–5), tags[] | Jurnal sesi |
| `templates` | user_id, nama, split_type | Template program |
| `template_exercises` | template_id, exercise_id, urutan, target_sets, target_reps_min/max, rest_seconds | Isi template |
| `personal_records` | user_id, exercise_id, jenis, nilai, reps, set_id, achieved_at | Riwayat PR |
| `milestones` | user_id, kode, achieved_at | Milestone yang tercapai |
| `body_metrics` | user_id, date, weight_kg, body_fat_pct, arm_cm, chest_cm, waist_cm, dll. | Metrik tubuh |
| `notification_settings` | user_id, tipe, enabled, waktu, hari[] | Preferensi pengingat |
| `push_subscriptions` | user_id, endpoint, keys, user_agent | Langganan Web Push |

**Relasi inti:** `workout_sessions` 1—N `session_exercises` 1—N `sets`

**Indeks yang disarankan:** `(user_id, date)` pada sesi dan metrik tubuh; `(user_id, exercise_id, achieved_at)` pada PR.

## 11. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| **Performa** | LCP ≤ 2,5 detik pada 4G; interaksi input set terasa instan (< 100 ms) |
| **Keamanan** | HTTPS wajib; password di-hash oleh penyedia auth; RLS aktif di semua tabel; validasi input di client **dan** server; perlindungan XSS (escape output, terutama catatan jurnal) |
| **Privasi** | Data bersifat pribadi; pengguna dapat **ekspor** dan **menghapus akun beserta seluruh datanya** |
| **Keandalan** | Autosave draft sesi; antrean sinkronisasi offline; backup database terjadwal |
| **Kompatibilitas** | Chrome & Safari mobile (2 versi terakhir), Firefox, Edge; iOS 16.4+ untuk Web Push |
| **Aksesibilitas** | Kontras WCAG AA, label form jelas, navigasi keyboard di desktop |
| **Lokalisasi** | Bahasa Indonesia (utama); struktur teks disiapkan agar mudah menambah bahasa Inggris |
| **Skalabilitas** | Dirancang untuk ribuan pengguna aktif tanpa perubahan arsitektur |

## 12. Rencana Pengembangan (Fase)

| Fase | Fokus | Fitur | Perkiraan |
|---|---|---|---|
| **0. Setup** | Fondasi proyek | Clone TailAdmin, rapikan struktur, setup Supabase, routing & guard halaman, PWA dasar | 3–5 hari |
| **1. MVP Inti** | Pencatatan latihan | F-01, F-02, F-03, F-04, F-05, F-07, F-13 | 2–3 minggu |
| **2. Insight** | Progres & motivasi | F-09, F-10, F-06 | 1–2 minggu |
| **3. Efisiensi** | Mempercepat input | F-08 (Template) | 1 minggu |
| **4. Holistik** | Tubuh & pengingat | F-11, F-12 | 1–2 minggu |
| **5. Polish** | Kualitas rilis | Uji perangkat nyata, optimasi performa, aksesibilitas, bug fixing, deploy | 1 minggu |

*Estimasi bersifat kasar untuk satu developer dan akan disesuaikan setelah Fase 0.*

## 13. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Template HTML statis, tanpa routing/state management bawaan | Kode makin berantakan seiring fitur bertambah | Tetapkan struktur folder dan pola Alpine (store/komponen) sejak Fase 0; modularkan JS per halaman |
| Sinyal buruk di gym | Data set hilang | Autosave lokal + sinkronisasi saat online |
| Web Push terbatas di iOS | Notifikasi tidak sampai | Panduan install PWA + fallback in-app alert |
| Timer tidak akurat saat layar mati | Pengalaman buruk | Timer berbasis timestamp + Wake Lock + getar |
| Input terlalu ribet → pengguna berhenti mencatat | Retensi rendah | Pre-fill, template, salin set, tombol +/−, uji langsung di gym |
| Hanya ada 1 dashboard & 30+ komponen di versi Free | Beberapa komponen perlu dibuat sendiri | Rancang komponen custom (bottom nav, rest timer, set row) dengan Tailwind |
| Kebocoran data antar pengguna | Pelanggaran privasi | RLS ketat, uji otorisasi khusus sebelum rilis |

## 14. Asumsi

1. Pengguna adalah individu perorangan (tidak ada peran admin/pelatih pada versi ini).
2. Satu pengguna memiliki maksimal satu sesi utama per hari.
3. Satuan default adalah kg dan cm, dengan opsi lb/in.
4. Backend memakai Supabase (lihat 6.2), menunggu konfirmasi.
5. Bahasa antarmuka awal adalah Bahasa Indonesia.

## 15. Pertanyaan Terbuka

1. **Backend:** Supabase (disarankan) atau backend sendiri (Node.js + PostgreSQL)?
2. **Durasi per gerakan:** apakah cukup durasi total sesi (wajib) dengan durasi per gerakan opsional, atau durasi per gerakan juga wajib?
3. **Library gerakan:** apakah perlu daftar gerakan bawaan lengkap (± 100–200 gerakan), atau pengguna membuat sendiri saja?
4. **Satu hari, banyak sesi:** apakah perlu mendukung dua sesi dalam sehari (pagi dan sore)?
5. **Mode offline:** seberapa penuh? Apakah cukup untuk pencatatan sesi aktif saja?
6. **Nama dan branding** produk final.
7. **Hosting dan domain** yang akan dipakai.

## 16. Lampiran

- **Repo basis UI:** https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template
- **Demo template:** https://free-demo.tailadmin.com/
- **Cara menjalankan template (lokal):** `git clone` → `npm install` → `npm run start` (Node.js ≥ 18)
- **Build produksi:** `npm run build`

---

*Dokumen ini adalah draft awal dan akan diperbarui seiring keputusan teknis dan masukan selama pengembangan.*
