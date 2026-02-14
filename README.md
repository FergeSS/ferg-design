# Ferg Design

Портфолио для Photoshop с разделением ролей:
- `index.html` - публичная страница (только просмотр);
- `admin.html` - админка (загрузка и управление контентом).

## Что реализовано

- стеклянный интерфейс в сине-голубой палитре;
- фото-портфолио (`single` / `group`);
- неравномерная плитка для фото;
- видео-портфолио с категориями и цветом секций;
- приватные видео по паролю;
- поддержка видео через файл и через публичную ссылку Яндекс Диска;
- превью для видео;
- отдельный API (PostgreSQL + Object Storage), без хранения медиа в памяти браузера.

## Архитектура

- Frontend: статические `index.html` / `admin.html` / `app.js` / `styles.css`.
- Backend API: `server/` (Express + PostgreSQL + Yandex Object Storage).
- Медиа (фото, превью, видео): в Object Storage.
- Метаданные (категории, описания, связи): в PostgreSQL.

## Локальный запуск

### 1) API

```bash
docker compose up -d postgres
npm --prefix server install
cp server/.env.example server/.env
npm run api:db:init
npm run api:dev
```

По умолчанию API: `http://localhost:8787`.

### 2) Frontend

```bash
npm run dev
```

Скрипт проверяет свободные порты (`3000`, `3001`, `5173`, `8080`, `4173`, `5000`) и стартует на первом доступном.

## Вход в админку

1. Открой `admin.html`.
2. В секции `Подключение админки` укажи:
- `API URL` (например, `http://localhost:8787`);
- `Admin API Key` (значение `ADMIN_API_KEY` из `server/.env`).
3. Нажми `Подключить`.

Ключ сохраняется только в `sessionStorage` текущей вкладки.

## Настройка API base URL

Frontend читает API URL в таком порядке:
1. значение из `localStorage` (`fergDesignApiBaseUrl`);
2. `<meta name="ferg-api-base" content="...">` в HTML;
3. fallback: `http://localhost:8787` на `localhost`.

## Деплой на публичный домен

Полная инструкция вынесена в:
- `DEPLOY_PUBLIC_DOMAIN.md`

## API docs

- `server/README.md`

## Защита от утечки ключей

- Включены git-hooks через Husky:
  - `pre-commit`: `npm run secrets:scan:staged`
  - `pre-push`: `npm run secrets:scan`
- Сканер: `scripts/scan-secrets.mjs`
