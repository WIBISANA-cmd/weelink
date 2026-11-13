# Deploy WeeLink dengan Docker

Panduan ini menjalankan WeeLink di server sendiri (VPS atau mesin lokal) dengan Docker Compose: satu container aplikasi, ditambah Caddy sebagai reverse proxy yang juga mengurus HTTPS otomatis.

```
Internet ──▶ Caddy (:80, :443) ──▶ weelink (:3000, tidak dibuka ke host)
              HTTPS otomatis          Next.js + yt-dlp + ffmpeg
              X-Forwarded-For         user non-root, healthcheck
```

## Daftar isi

- [Kenapa pakai Caddy](#kenapa-pakai-caddy)
- [Prasyarat](#prasyarat)
- [Langkah cepat](#langkah-cepat)
- [Konfigurasi](#konfigurasi)
- [HTTPS dengan domain sendiri](#https-dengan-domain-sendiri)
- [Cookies untuk YouTube dan Instagram](#cookies-untuk-youtube-dan-instagram)
- [Operasional sehari-hari](#operasional-sehari-hari)
- [Dokploy](#dokploy)
- [Memakai Nginx atau proxy sendiri](#memakai-nginx-atau-proxy-sendiri)
- [Tanpa Compose](#tanpa-compose)
- [Isi image](#isi-image)
- [Troubleshooting](#troubleshooting)
- [Yang sudah diuji](#yang-sudah-diuji)

## Kenapa pakai Caddy

Route handler Next.js tidak bisa melihat IP pengunjung secara langsung. WeeLink membaca IP dari header `X-Forwarded-For` untuk rate limit per IP. Kalau container dibuka langsung ke internet, header itu bisa dipalsukan pengunjung, atau kosong sama sekali sehingga semua pengunjung berbagi satu kuota.

Caddy menulis ulang `X-Forwarded-For` dari IP koneksi asli dan membuang nilai yang dikirim klien. Karena itu, di `docker-compose.yml` container `weelink` sengaja **tidak** dibuka ke host. Satu-satunya jalan masuk adalah lewat Caddy.

## Prasyarat

- Docker Engine 24 atau lebih baru, dengan plugin Compose v2 (`docker compose version`).
- Server Linux amd64 atau arm64. Disarankan minimal 2 GB RAM dan ruang disk kosong 6 GB (image sekitar 1.2 GB, sisanya untuk file sementara saat memproses video).
- Port 80 dan 443 terbuka di firewall.
- Untuk HTTPS: domain atau subdomain dengan record DNS A/AAAA yang mengarah ke IP server.

## Langkah cepat

```bash
# 1. Ambil kode
git clone <url-repo-kamu> weelink
cd weelink

# 2. Siapkan konfigurasi
cp .env.example .env

# 3. Isi WEELINK_SECRET dengan string acak (atau edit .env manual)
sed -i "s/^WEELINK_SECRET=.*/WEELINK_SECRET=$(openssl rand -hex 32)/" .env

# 4. Folder data (untuk cookies opsional)
mkdir -p data

# 5. Build dan jalankan
docker compose up -d --build
```

Build pertama butuh beberapa menit. Setelah selesai:

```bash
docker compose ps                 # weelink harus "healthy"
curl http://localhost/api/health  # {"status":"ok","ytdlp":"2026.10.26","ffmpeg":true}
```

Buka `http://IP-SERVER` di browser.

## Konfigurasi

Semua variabel dibaca dari file `.env` di folder yang sama dengan `docker-compose.yml`.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `WEELINK_SECRET` | wajib | Kunci HMAC token unduhan. Minimal 32 karakter acak. Mengganti nilainya membatalkan semua token yang sedang aktif (paling lama berlaku satu jam). |
| `DOMAIN` | `:80` | `:80` untuk HTTP biasa. Isi nama domain untuk HTTPS otomatis. |
| `HTTP_PORT` / `HTTPS_PORT` | `80` / `443` | Port di host. Ubah kalau port itu sudah dipakai, tapi Let's Encrypt butuh 80 dan 443 yang asli. |
| `YTDLP_AUTO_UPDATE` | `1` | `1` = perbarui yt-dlp setiap container start. `0` = pakai versi dari image apa adanya. |
| `YTDLP_VERSION` | `latest` | Versi yt-dlp yang dipasang saat build, mis. `2026.10.26`. |
| `YTDLP_COOKIES_FILE` | kosong | `/app/data/cookies.txt` kalau memakai cookies. Lihat bagian Cookies untuk YouTube dan Instagram. |
| `THREADS_RENDER` | `1` | Buka link Threads dengan Chromium headless yang sudah ada di image. `0` untuk mematikan. |
| `COMPAT_TRANSCODE` | `1` | Konversi video VP9/AV1/HEVC ke H.264 dan gambar ke JPG agar bisa dibuka di iPhone. Memakai CPU saat konversi. |
| `MAX_CONCURRENT_JOBS` | `3` | Proses yt-dlp dan ffmpeg bersamaan. Naikkan sesuai jumlah core CPU. |
| `MAX_DURATION_SECONDS` | `10800` | Batas durasi media (3 jam). |
| `RESOLVE_LIMIT_PER_10_MIN` | `30` | Batas baca link per IP per 10 menit. |
| `DOWNLOAD_LIMIT_PER_10_MIN` | `30` | Batas unduhan per IP per 10 menit. |
| `WEELINK_CPUS` / `WEELINK_MEMORY` | `2` / `2g` | Batas CPU dan RAM container aplikasi. |

`YTDLP_PATH` dan `FFMPEG_PATH` **tidak perlu diisi** di Docker. Image sudah mengaturnya ke `/opt/yt-dlp/yt-dlp` dan `/usr/local/bin/ffmpeg`.

Setelah mengubah `.env`, terapkan dengan:

```bash
docker compose up -d
```

## HTTPS dengan domain sendiri

1. Buat record DNS, misalnya `A weelink.contoh.id -> 203.0.113.10`, lalu tunggu sampai `ping weelink.contoh.id` mengarah ke server.
2. Di `.env`, isi `DOMAIN=weelink.contoh.id`.
3. Jalankan `docker compose up -d`.

Caddy meminta sertifikat Let's Encrypt saat permintaan pertama dan memperbaruinya otomatis. Sertifikat disimpan di volume `caddy-data`, jadi tetap ada walau container dibuat ulang. Ikuti prosesnya dengan `docker compose logs -f caddy`.

## Cookies untuk YouTube dan Instagram

YouTube dan Instagram sering menolak permintaan dari IP server (VPS, pusat data), padahal dari IP rumahan link yang sama berhasil. Tandanya di log aplikasi:

- YouTube: `Sign in to confirm you're not a bot`, dan WeeLink menulis `[weelink] YouTube menolak IP server ini sebagai bot`. Pengunjung melihat "YouTube sedang menolak permintaan dari server WeeLink".
- Instagram: `login required` atau `rate-limit`. Pengunjung melihat "Platform meminta login".

Solusi yang dianjurkan yt-dlp adalah cookies dari akun yang login. Pengunjung WeeLink tetap tidak perlu login; cookies hanya dipakai server.

**Menyiapkan file cookies**

1. Pakai **akun khusus**, bukan akun pribadimu. Platform bisa membatasi akun yang dipakai server.
2. Buka jendela privat/incognito, login ke `youtube.com` (dan `instagram.com` kalau perlu) di jendela itu.
3. Ekspor cookies dalam format Netscape (`cookies.txt`) dengan ekstensi browser yang bisa mengekspor format itu. Cookies kedua situs boleh digabung dalam satu file.
4. Tutup jendela privat itu tanpa logout. Kalau sesi yang sama terus dipakai di browser, YouTube merotasi cookies dan file ekspor cepat kedaluwarsa.

File boleh read-only: WeeLink menyalin cookies ke file sementara untuk setiap proses yt-dlp, jadi file aslimu tidak pernah diubah.

**Docker Compose**

Simpan sebagai `data/cookies.txt`, lalu di `.env` isi `YTDLP_COOKIES_FILE=/app/data/cookies.txt` dan jalankan `docker compose up -d`.

**Dokploy (Application)**

1. Advanced, bagian Volumes, tambahkan **File Mount**: Mount Path `/app/data/cookies.txt`, Content diisi seluruh isi `cookies.txt`.
2. Environment: tambahkan `YTDLP_COOKIES_FILE=/app/data/cookies.txt`.
3. Deploy ulang.

Cek hasilnya di tab Logs: baris `YTDLP_COOKIES_FILE tidak bisa dibaca` berarti path-nya salah. Cookies kedaluwarsa dari waktu ke waktu; kalau pesan penolakan muncul lagi, ekspor ulang dan ganti isi File Mount.

## Operasional sehari-hari

| Kebutuhan | Perintah |
| --- | --- |
| Status dan health | `docker compose ps` |
| Log aplikasi | `docker compose logs -f weelink` |
| Log Caddy | `docker compose logs -f caddy` |
| Cek mesin unduh | `curl http://localhost/api/health` |
| Perbarui yt-dlp | `docker compose restart weelink` (otomatis kalau `YTDLP_AUTO_UPDATE=1`) |
| Perbarui aplikasi | `git pull && docker compose up -d --build` |
| Hentikan | `docker compose down` |
| Hapus semua termasuk sertifikat | `docker compose down -v` |

**Kapan memperbarui yt-dlp.** Kalau platform tertentu tiba-tiba gagal untuk semua link, penyebab paling umum adalah yt-dlp yang sudah usang. Restart container cukup untuk mengambil versi terbaru. Pembaruan juga bisa gagal (misalnya GitHub tidak bisa dijangkau). Dalam kasus itu container tetap jalan dengan versi bawaan image, dan lognya menulis `pembaruan yt-dlp gagal`.

**Build yang bisa diulang persis.** Untuk produksi yang ketat, kunci versinya:

```bash
# .env
YTDLP_VERSION=2026.10.26
YTDLP_AUTO_UPDATE=0
```

Versi ffmpeg dan Node bisa dikunci saat build:

```bash
docker compose build --build-arg FFMPEG_VERSION=7.1.1 --build-arg NODE_VERSION=22
```

**Yang perlu dibackup.** Hanya `.env` dan `data/`. Aplikasi tidak menyimpan data pengguna. Volume `caddy-data` berisi sertifikat; kalau hilang, Caddy akan meminta sertifikat baru.

## Dokploy

Dokploy sudah menjalankan Traefik di port 80 dan 443, jadi **jangan pakai `docker-compose.yml` bawaan** (Caddy di dalamnya akan berebut port dengan Traefik). Pilih salah satu cara di bawah. Cara A paling sederhana.

### Cara A: Application (Dockerfile), disarankan

**General**
- Provider: repo Git kamu, branch yang dipakai.
- Build Type: `Dockerfile`
- Docker File: `Dockerfile`
- Docker Context Path: `.`
- Docker Build Stage: kosongkan (stage terakhir, `runner`, otomatis dipakai)

**Environment**: cukup ini. Jangan tempel seluruh isi `.env.example`.

```env
WEELINK_SECRET=isi-64-karakter-acak
```

Buat nilainya dengan `openssl rand -hex 32`. Variabel lain opsional, tambahkan hanya kalau ingin mengubah default:

```env
MAX_CONCURRENT_JOBS=3
MAX_DURATION_SECONDS=10800
RESOLVE_LIMIT_PER_10_MIN=30
DOWNLOAD_LIMIT_PER_10_MIN=30
YTDLP_AUTO_UPDATE=1
```

**Jangan isi** `YTDLP_PATH`, `FFMPEG_PATH`, `PORT`, `HOSTNAME`, `DOMAIN`, `HTTP_PORT`, `HTTPS_PORT`. Semuanya sudah diatur image atau ditangani Traefik.

**Domains** → Add Domain:

| Field | Isi |
| --- | --- |
| Host | `weelink.domainkamu.id` |
| Path | `/` |
| Internal Path | kosong |
| Strip Path | mati |
| Container Port | `3000` |
| HTTPS | nyala |
| Certificate | `letsencrypt` |

**Advanced → Ports**: biarkan kosong. Traefik menjangkau container lewat jaringan internal Dokploy.

Lalu **Deploy**. Build pertama butuh beberapa menit. Domain baru bisa diakses setelah container berstatus sehat (healthcheck memanggil `/api/health`, dengan masa tunggu 40 detik).

### Cara B: Docker Compose

- Compose Path: `./docker-compose.dokploy.yml` (versi tanpa Caddy dan tanpa port host)
- Environment: sama seperti Cara A.
- Domains → Add Domain: Service Name `weelink`, Host domainmu, Path `/`, Container Port `3000`, HTTPS nyala, Certificate `letsencrypt`.

Dokploy menambahkan label Traefik dan `dokploy-network` ke service yang dipilih saat deploy. Setiap kali domain diubah, deploy ulang.

### DNS dan Cloudflare

Buat record `A` untuk host tadi ke IP server Dokploy. Kalau domain dikelola Cloudflare, matikan proxy (awan abu-abu, "DNS only") minimal sampai sertifikat Let's Encrypt terbit. Kalau proxy Cloudflare dinyalakan, semua pengunjung terlihat datang dari IP Cloudflare, sehingga rate limit per IP bisa mengenai banyak orang sekaligus. Dalam kasus itu naikkan `RESOLVE_LIMIT_PER_10_MIN` dan `DOWNLOAD_LIMIT_PER_10_MIN`.

### Bad Gateway di Dokploy

Periksa berurutan:

1. **Container Port bukan `3000`.** WeeLink mendengarkan di 3000 (di `0.0.0.0`, jadi bisa dijangkau Traefik).
2. **Container belum atau tidak sehat.** Buka tab Logs. Log normal berisi `[weelink] yt-dlp 2026.x.x, ffmpeg version 7.1.1` lalu `Ready`. Di tab terminal container, `node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"` harus membalas `"status":"ok"`.
3. **Variabel kosong yang ikut tersalin.** Image versi lama gagal kalau `YTDLP_PATH=` atau `FFMPEG_PATH=` dikirim kosong (healthcheck 503). Image sekarang sudah kebal terhadap hal ini, tapi sebaiknya tetap hapus baris kosong itu dari Environment.
4. **Memakai `docker-compose.yml` bawaan.** Ganti ke Cara A, atau ke `docker-compose.dokploy.yml`.
5. **Ports di Advanced terisi.** Kosongkan, lalu deploy ulang.
6. **Deploy ulang** setelah setiap perubahan Environment atau Domain.

## Memakai Nginx atau proxy sendiri

Kalau server sudah punya Nginx, matikan Caddy dan buka WeeLink hanya ke `127.0.0.1`. Buat `docker-compose.override.yml`:

```yaml
services:
  weelink:
    ports:
      - "127.0.0.1:3000:3000"
  caddy:
    profiles: ["disabled"]
```

Lalu jalankan `docker compose up -d weelink`.

Konfigurasi Nginx (bagian `server`):

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Timpa, jangan tambahkan ($proxy_add_x_forwarded_for), supaya klien tidak bisa memalsukan IP.
    proxy_set_header X-Forwarded-For $remote_addr;

    # Video panjang bisa butuh beberapa menit sebelum byte pertama dikirim.
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;
    # Stream file langsung, jangan ditampung dulu di disk Nginx.
    proxy_buffering off;
}
```

Kalau Nginx sendiri berada di balik proxy lain (Cloudflare, load balancer), gunakan modul `real_ip` agar `$remote_addr` berisi IP pengunjung yang asli.

## Tanpa Compose

Untuk tes cepat:

```bash
docker build -t weelink .
docker run -d --name weelink -p 3000:3000 \
  -e WEELINK_SECRET="$(openssl rand -hex 32)" \
  weelink
```

Cara ini **tidak disarankan untuk publik**. Tanpa proxy di depannya, header `X-Forwarded-For` kosong atau bisa dipalsukan, sehingga rate limit per IP tidak berfungsi.

## Isi image

Dockerfile memakai beberapa stage supaya image akhir hanya berisi yang dibutuhkan saat berjalan:

| Stage | Isi |
| --- | --- |
| `ffmpeg` | `mwader/static-ffmpeg`: hanya file `ffmpeg` statis (sekitar 135 MB) yang diambil |
| `ytdlp` | Mengunduh build standalone yt-dlp (sudah membawa Python sendiri) sesuai arsitektur |
| `deps` | `npm ci --ignore-scripts` |
| `browser` | Mengunduh Chromium headless shell untuk Threads dengan CLI `playwright-core` milik aplikasi, jadi versinya selalu cocok |
| `build` | `next build` dengan `output: "standalone"` |
| `runner` | `node:22-bookworm-slim` + tini + hasil dari stage di atas |

Ukuran image akhir sekitar 1.17 GB (diukur pada build amd64 untuk dokumen ini). Bagian terbesar: Chromium headless untuk Threads (sekitar 283 MB) beserta library-nya, base image Node, ffmpeg (135 MB), dan yt-dlp (41 MB). Runtime hanya memasang library yang dibutuhkan Chromium, tanpa xvfb dan paket font dari `--with-deps` (menghemat sekitar 420 MB).

Saat membaca link Threads, Chromium memakai RAM tambahan (container sekitar 220 MB saat diuji). Browser dipakai ulang antar permintaan dan ditutup otomatis setelah 2 menit tidak dipakai.

Detail lain:
- Proses berjalan sebagai user `node` (uid 1000), bukan root.
- `tini` menjadi PID 1, meneruskan sinyal stop dan membersihkan proses yt-dlp yang tersisa.
- `HEALTHCHECK` memanggil `/api/health`. Endpoint ini menjalankan `yt-dlp --version` dan `ffmpeg -version` (hasilnya disimpan satu menit) dan membalas 503 kalau salah satunya tidak ada. Caddy baru dijalankan setelah aplikasi sehat.
- File sementara ditulis ke `/tmp` di dalam container dan dihapus begitu respons selesai dikirim atau dibatalkan.
- `output: "standalone"` hanya aktif saat build Docker (`NEXT_OUTPUT_STANDALONE=1`), jadi `npm start` di luar Docker tetap seperti biasa.

## Troubleshooting

| Gejala | Penyebab dan solusi |
| --- | --- |
| `docker compose up` gagal dengan "Isi WEELINK_SECRET" | `.env` belum ada atau `WEELINK_SECRET` kosong. Lihat langkah cepat no. 3. |
| `weelink` tidak pernah `healthy` | Cek `docker compose logs weelink`. Jalankan `docker compose exec weelink /opt/yt-dlp/yt-dlp --version` untuk memastikan yt-dlp bisa jalan. |
| Semua link YouTube/TikTok gagal | yt-dlp usang. `docker compose restart weelink`, atau build ulang dengan `--no-cache`. |
| YouTube "menolak permintaan dari server" atau Instagram "meminta login" | IP server diblokir platform. Pasang cookies (lihat bagian Cookies untuk YouTube dan Instagram). |
| Unduhan video panjang terputus | Timeout di proxy lain di depan Caddy, atau RAM container habis. Naikkan `WEELINK_MEMORY` dan timeout proxy. |
| Muncul "Terlalu banyak permintaan" untuk semua orang | Proxy tidak meneruskan IP asli, jadi semua pengunjung terhitung satu IP. Pastikan lalu lintas lewat Caddy atau Nginx dengan konfigurasi di atas. |
| Sertifikat HTTPS tidak terbit | DNS belum mengarah ke server, atau port 80/443 tertutup. Lihat `docker compose logs caddy`. |
| `entrypoint.sh: not found` atau `\r` di log | File script ber-CRLF karena checkout di Windows. Repo menyertakan `.gitattributes` untuk mencegahnya; jalankan `git add --renormalize .` lalu build ulang. |

## Yang sudah diuji

Diuji pada Docker Desktop 29.8 (Linux engine, amd64), November 2026:

- `docker compose up -d --build` dari nol: kedua container jalan, `weelink` menjadi `healthy`, dan log menunjukkan yt-dlp 2026.10.26 serta ffmpeg 7.1.1.
- Lewat Caddy di port 80: halaman utama, manifest, dan `/api/health` membalas 200.
- Unduhan YouTube dan TikTok untuk ketiga mode (MP4, MP3, JPG) berhasil, dan `/tmp` di container kosong setelahnya.
- Alur penuh di browser (Playwright, viewport ponsel) lewat Caddy: baca link TikTok, pratinjau termuat, simpan MP3, tanpa error console.
- Rate limit: 32 permintaan dengan `X-Forwarded-For` palsu yang berbeda-beda tetap dibatasi setelah 30, membuktikan Caddy menimpa header dari klien.
- Proses berjalan sebagai user `node`. `docker compose stop` selesai dalam sekitar 2 detik.

Belum diuji: HTTPS dengan domain sungguhan (butuh DNS publik), server arm64, dan cookies Instagram.
