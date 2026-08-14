# Deploy Frontend ke VPS Ubuntu

Dokumen ini untuk rilis frontend `1.0 beta` via Docker di VPS Ubuntu.

## Prasyarat

- Ubuntu 22.04/24.04
- Docker Engine + Docker Compose Plugin
- Domain frontend sudah mengarah ke VPS jika ingin dipasang di belakang reverse proxy

## 1. Clone project

```bash
git clone <repo-frontend-anda> crm_piposmart
cd crm_piposmart
```

## 2. Siapkan env production

```bash
cp .env.production.example .env.production
```

Wajib isi:

- `NEXT_PUBLIC_API_URL`

Catatan:

- Nilai `NEXT_PUBLIC_API_URL` di-inline saat build image. Kalau URL backend berubah, image frontend harus dibuild ulang.

## 3. Build dan jalankan

```bash
docker compose -f compose.prod.yaml --env-file .env.production up -d --build
```

## 4. Verifikasi

```bash
docker compose -f compose.prod.yaml --env-file .env.production ps
docker compose -f compose.prod.yaml --env-file .env.production logs -f frontend
curl http://127.0.0.1:3000/
```

## 5. Update release berikutnya

```bash
git pull
docker compose -f compose.prod.yaml --env-file .env.production up -d --build
```

## Catatan audit

- Jalur type-check CI sekarang sebaiknya memakai `npm run typecheck`, karena route types Next harus di-generate dulu sebelum `tsc --noEmit`.
- `next build` saat ini lolos, tetapi `npm run lint` masih punya error dan warning yang perlu dibereskan sebelum rilis final/non-beta.
