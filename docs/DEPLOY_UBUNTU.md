# Deploy Frontend ke VPS Ubuntu

Dokumen ini untuk rilis frontend `1.0 beta` CRM Piposmart via Docker di VPS Ubuntu, dengan domain dan SSL melalui Traefik.

## Gambaran singkat

Frontend ini adalah aplikasi Next.js yang dibuild menjadi image Docker production.

Yang penting dipahami:

- frontend berjalan di port internal `3000`
- domain publik diarahkan lewat Traefik
- `NEXT_PUBLIC_API_URL` masuk ke bundle saat build image
- kalau URL backend berubah, frontend harus di-build ulang

## Prasyarat

- Ubuntu 22.04/24.04
- Docker Engine
- `docker-compose` atau `docker compose`
- domain frontend sudah mengarah ke VPS
- Traefik sudah berjalan di VPS jika ingin SSL otomatis dan routing domain
- backend API sudah live, misalnya `https://api.piposmart.com`

## 1. Install Docker di VPS

Kalau Docker belum ada:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Kalau VPS kamu masih memakai `docker-compose` lama seperti `1.29.2`, panduan ini tetap bisa dipakai karena file compose project sudah disesuaikan untuk versi itu.

## 2. Pastikan DNS dan Traefik siap

Sebelum deploy, pastikan:

- `crm.piposmart.com` mengarah ke IP VPS
- Traefik container sedang hidup
- network Traefik tersedia, misalnya `traefik-network`

Cek Traefik:

```bash
docker ps | grep Traefik
docker network ls | grep traefik
```

Kalau kamu ingin mengikuti setup server yang sekarang, nilai aman yang dipakai adalah:

```env
TRAEFIK_NETWORK=traefik-network
TRAEFIK_ENTRYPOINTS=websecure
TRAEFIK_CERT_RESOLVER=letsencrypt
```

## 3. Clone project frontend

Contoh:

```bash
cd /opt
git clone https://github.com/achul-cos/frontend_crm_piposmart.git crm-piposmart
cd crm-piposmart
```

Kalau folder sudah ada:

```bash
cd /opt/crm-piposmart
git pull
```

## 4. Siapkan file env production

Copy dulu template env:

```bash
cp .env.production.example .env.production
```

Lalu edit:

```bash
nano .env.production
```

Minimal isi yang wajib benar:

- `NEXT_PUBLIC_API_URL`
- `FRONTEND_DOMAIN`
- `TRAEFIK_NETWORK`
- `TRAEFIK_ENTRYPOINTS`
- `TRAEFIK_CERT_RESOLVER`

Contoh `.env.production` untuk environment kamu:

```env
NEXT_PUBLIC_API_URL=https://api.piposmart.com
FRONTEND_DOMAIN=crm.piposmart.com
TRAEFIK_NETWORK=traefik-network
TRAEFIK_ENTRYPOINTS=websecure
TRAEFIK_CERT_RESOLVER=letsencrypt

NEXT_PUBLIC_ENABLE_API_ERROR_DEBUG=false
NEXT_PUBLIC_ENABLE_QUERY_PERSIST=true
NEXT_PUBLIC_QUERY_PERSIST_MAX_AGE_MINUTES=15
NEXT_PUBLIC_QUERY_PERSIST_MAX_TOTAL_BYTES=1000000
NEXT_PUBLIC_QUERY_PERSIST_MAX_QUERY_BYTES=150000
NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS=false

PORT=3000
FRONTEND_PORT=3000
```

Catatan penting:

- `NEXT_PUBLIC_API_URL` dibaca saat build image, bukan hanya saat runtime
- jika nilai `NEXT_PUBLIC_*` berubah, wajib `up -d --build`
- `PORT` adalah port di dalam container
- `FRONTEND_PORT` adalah binding port host; kalau full lewat Traefik sebenarnya tetap boleh `3000`

## 5. Build dan jalankan frontend

Untuk VPS kamu, pakai perintah ini:

```bash
docker-compose -f compose.prod.yaml --env-file .env.production up -d --build
```

Perintah ini akan:

- build image Next.js production
- membuat container frontend
- menghubungkan container ke network Traefik
- memasang label Traefik untuk domain dan SSL

## 6. Verifikasi setelah deploy

Cek status container:

```bash
docker-compose -f compose.prod.yaml --env-file .env.production ps
```

Cek log frontend:

```bash
docker-compose -f compose.prod.yaml --env-file .env.production logs --tail 100 frontend
```

Cek dari dalam server:

```bash
curl http://127.0.0.1:3000/
```

Cek apakah container masuk ke network Traefik:

```bash
docker inspect crm_piposmart_frontend_1 --format '{{json .NetworkSettings.Networks}}'
```

Cek label Traefik:

```bash
docker inspect crm_piposmart_frontend_1 --format '{{json .Config.Labels}}'
```

Cek dari domain publik:

```bash
curl https://crm.piposmart.com
```

Kalau browser sudah bisa membuka `https://crm.piposmart.com`, berarti deploy frontend berhasil.

## 7. Update release berikutnya

Saat ada perubahan source code frontend:

```bash
cd /opt/crm-piposmart
git pull
docker-compose -f compose.prod.yaml --env-file .env.production up -d --build
```

Ini workflow normal harian:

1. Di lokal, push perubahan ke repo frontend

   ```bash
   git add .
   git commit -m "update frontend"
   git push public main
   ```
2. Di VPS, ambil update

   ```bash
   cd /opt/crm-piposmart
   git pull
   ```
3. Rebuild dan jalankan ulang

   ```bash
   docker-compose -f compose.prod.yaml --env-file .env.production up -d --build
   ```

## 8. Kalau hanya update `.env.production`

Perubahan env tidak otomatis masuk ke container yang sedang berjalan.

Setelah edit `.env.production`, jalankan ulang service:

```bash
docker-compose -f compose.prod.yaml --env-file .env.production up -d
```

Kalau yang berubah adalah `NEXT_PUBLIC_*`, wajib rebuild:

```bash
docker-compose -f compose.prod.yaml --env-file .env.production up -d --build
```

Contoh kasus:

- ganti `NEXT_PUBLIC_API_URL` -> wajib rebuild
- ganti `PORT` -> recreate container
- ganti `TRAEFIK_*` atau domain -> recreate, dan biasanya aman sekalian `--build`

## 9. Troubleshooting `ContainerConfig` di docker-compose lama

Pada VPS yang masih memakai `docker-compose 1.29.2`, kadang recreate container gagal dengan error:

```text
KeyError: 'ContainerConfig'
```

Kalau ini terjadi, jangan tebak nama container. Cari dulu:

```bash
docker ps -a --format '{{.ID}} {{.Names}}' | grep crm_piposmart_frontend
```

Setelah itu hapus container yang benar dari hasil command tadi:

```bash
docker rm -f <nama-atau-id-container>
```

Contoh:

```bash
docker rm -f crm_piposmart_frontend_1
```

Lalu jalankan lagi:

```bash
docker-compose -f compose.prod.yaml --env-file .env.production up -d --build
```

Kalau error ini terjadi sesudah update env, alurnya:

1. Edit `.env.production`
2. Cari container frontend

   ```bash
   docker ps -a --format '{{.ID}} {{.Names}}' | grep crm_piposmart_frontend
   ```
3. Hapus container yang lama

   ```bash
   docker rm -f <nama-atau-id-container>
   ```
4. Jalankan ulang

   ```bash
   docker-compose -f compose.prod.yaml --env-file .env.production up -d --build
   ```
5. Verifikasi lagi

   ```bash
   docker-compose -f compose.prod.yaml --env-file .env.production ps
   docker-compose -f compose.prod.yaml --env-file .env.production logs --tail 100 frontend
   ```

## 10. Troubleshooting umum

### Browser tidak bisa buka domain

Cek:

- DNS domain sudah mengarah ke VPS
- Traefik hidup
- frontend container ikut network Traefik
- label router domain benar

Command bantu:

```bash
docker ps
docker inspect crm_piposmart_frontend_1 --format '{{json .NetworkSettings.Networks}}'
docker inspect crm_piposmart_frontend_1 --format '{{json .Config.Labels}}'
```

### Frontend bisa dibuka lewat port lokal tapi tidak lewat domain

Biasanya masalah di:

- DNS
- network Traefik
- label router
- cert resolver Traefik

Kalau skema domain yang dipakai adalah subdomain seperti `crm.piposmart.com`, cukup fokuskan DNS ke subdomain itu. Tidak perlu `www.crm.piposmart.com` kecuali memang sengaja ingin dipakai juga.

### Frontend jalan tapi API gagal dipanggil

Biasanya penyebabnya:

- `NEXT_PUBLIC_API_URL` salah
- frontend belum di-build ulang setelah env diubah
- backend belum mengizinkan origin frontend di CORS

Kalau kamu ganti `NEXT_PUBLIC_API_URL`, jangan lupa rebuild:

```bash
docker-compose -f compose.prod.yaml --env-file .env.production up -d --build
```

### Container frontend tidak muncul normal

Cek log:

```bash
docker-compose -f compose.prod.yaml --env-file .env.production logs frontend
```

## 11. Rollback cepat

Kalau perlu rollback ke commit lama:

```bash
cd /opt/crm-piposmart
git checkout <commit-atau-tag-lama>
docker-compose -f compose.prod.yaml --env-file .env.production up -d --build
```

## Catatan audit

- Jalur type-check CI sebaiknya memakai `npm run typecheck`, karena route types Next perlu di-generate lebih dulu sebelum pemeriksaan TypeScript penuh.
- `next build` saat ini sudah menjadi jalur utama image production dan panduan deploy ini mengikuti alur tersebut.
- `npm run lint` masih punya error dan warning yang sebaiknya dibereskan sebelum rilis final non-beta.
