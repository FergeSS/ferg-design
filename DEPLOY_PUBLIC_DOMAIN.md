# Публикация Ferg Design на домен (без своего сервера)

Ниже рабочая схема, где ничего не нужно поднимать вручную на VPS.

## Рекомендуемый стек

- Frontend (статические `index.html`/`admin.html`): **Cloudflare Pages**
- API + PostgreSQL: **Railway**
- Хранение фото/видео: **Yandex Object Storage**
- Домен и DNS: **Cloudflare** (или любой регистратор)

## 1) Где взять сервер, если своего нет

Самый простой вариант:
1. Зарегистрироваться в **Railway**
2. Создать там:
- `PostgreSQL` сервис
- `Web Service` для папки `server/`

Railway даст публичный URL API (например `https://ferg-api.up.railway.app`).

Альтернативы: Render, Fly.io, DigitalOcean App Platform.

## 2) Подготовка Object Storage (Яндекс)

1. В Yandex Cloud создай bucket (например `ferg-media`).
2. Включи публичный доступ только к нужным объектам/папкам по твоей политике.
3. Создай сервисный аккаунт и статические ключи доступа.
4. Запиши значения:
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

## 3) Поднять API на Railway

В `server/` должен быть деплой из текущего проекта.

### Переменные окружения в Railway

Обязательно задай:

```env
NODE_ENV=production
PORT=8787
DATABASE_URL=<подставит Railway Postgres>
ADMIN_API_KEY=<длинный-случайный-ключ>
CORS_ORIGIN=https://<твой-домен>

S3_ENDPOINT=https://storage.yandexcloud.net
S3_REGION=ru-central1
S3_BUCKET=<твой-bucket>
S3_ACCESS_KEY_ID=<твой-key-id>
S3_SECRET_ACCESS_KEY=<твой-secret>
S3_FORCE_PATH_STYLE=false
PUBLIC_MEDIA_BASE_URL=https://storage.yandexcloud.net/<твой-bucket>
PRIVATE_URL_TTL_SEC=900

MAX_UPLOAD_MB=250
MAX_PHOTO_FILES=20
```

Если нужно несколько доменов для CORS, перечисли через запятую:

```env
CORS_ORIGIN=https://fergdesign.com,https://www.fergdesign.com
```

### Инициализация БД

После первого деплоя выполни в Railway shell:

```bash
npm run db:init
```

## 4) Поднять frontend на Cloudflare Pages

1. Подключи GitHub репозиторий.
2. Build command: не нужен (или пусто).
3. Publish directory: `/` (корень).
4. Дождись выдачи домена вида `*.pages.dev`.

## 5) Привязка фронта к API

Есть 2 рабочих способа:

### Вариант A (рекомендуется): один домен через reverse proxy

- Делай `https://fergdesign.com` для frontend
- Проксируй `/api/*` на Railway API
- Тогда в `index.html` и `admin.html` можно оставить:

```html
<meta name="ferg-api-base" content="">
```

### Вариант B: отдельный API домен

- Например frontend `https://fergdesign.com`, API `https://api.fergdesign.com`
- В `admin.html` при первом входе укажи `API URL` вручную
- Или сразу пропиши в HTML:

```html
<meta name="ferg-api-base" content="https://api.fergdesign.com">
```

## 6) Домен и SSL

1. Добавь домен в Cloudflare.
2. Укажи NS у регистратора на Cloudflare.
3. В Cloudflare Pages добавь `Custom domain`.
4. Включи `Always Use HTTPS`.

SSL у Cloudflare выдаётся автоматически.

## 7) Безопасность продакшена

1. Никогда не храни `ADMIN_API_KEY` в `app.js`/`index.html`/`admin.html`.
2. В админке ключ вводится вручную и хранится только в `sessionStorage`.
3. Включи ограничения CORS на твой домен (не `*` в проде).
4. Регулярно ротируй `ADMIN_API_KEY` и S3-ключи.

## 8) Чеклист перед релизом

1. `GET /health` отвечает `ok`.
2. Фото загружаются и открываются на публичной странице.
3. Видео (upload + Я.Диск) воспроизводятся.
4. Private видео запрашивает пароль и открывается только после проверки.
5. Удаление фото/видео/категорий работает из админки.
6. На мобильном интерфейс не ломается.

## 9) Стоимость (ориентир)

- Cloudflare Pages: обычно бесплатный старт
- Railway: платно по ресурсам
- Yandex Object Storage: оплата за хранение/трафик
- Домен: стоимость регистратора

