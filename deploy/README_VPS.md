# VPS setup (Caddy + systemd)

These files are prepared for:
- domain: `fergdesign.ru` (+ `www`)
- app dir: `/opt/ferg`
- static files dir: `/var/www/ferg-design`
- local API: `127.0.0.1:8787`

## 1) Copy project and install deps

```bash
sudo mkdir -p /opt/ferg
sudo chown -R "$USER":"$USER" /opt/ferg
cd /opt/ferg
git clone https://github.com/FergeSS/ferg-design.git .
npm --prefix server ci
```

## 2) Configure env and DB

Create `server/.env` and set real values for:
- `DATABASE_URL`
- `ADMIN_API_KEY`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Then start Postgres and init schema:

```bash
cd /opt/ferg
docker compose up -d
npm --prefix server run db:init
```

## 3) Publish frontend files

```bash
cd /opt/ferg
./deploy/sync-frontend.sh
```

## 4) Enable API service

```bash
sudo cp /opt/ferg/deploy/ferg-api.service /etc/systemd/system/ferg-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now ferg-api
sudo systemctl status ferg-api --no-pager
```

## 5) Enable Caddy

```bash
sudo cp /opt/ferg/deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
sudo systemctl status caddy --no-pager
```

## 6) DNS

Set A-records to your VPS public IP:
- `@` -> VPS IP
- `www` -> VPS IP

## 7) Smoke checks

```bash
curl -sS http://127.0.0.1:8787/health
curl -I https://fergdesign.ru
curl -I https://fergdesign.ru/api/photos
```
