# Ferg Design API

Backend для хранения фото/видео вне браузера:
- метаданные в PostgreSQL;
- фото/превью/видео-файлы в Yandex Object Storage;
- приватные видео через пароль + временная signed URL.

## 1) Подготовка

1. Запусти Postgres:

```bash
docker compose up -d postgres
```

2. Установи зависимости API:

```bash
npm --prefix server install
```

3. Создай `.env`:

```bash
cp server/.env.example server/.env
```

4. Заполни `server/.env` своими значениями (особенно `S3_*`, `DATABASE_URL`, `ADMIN_API_KEY`).

## 2) Инициализация БД

```bash
npm --prefix server run db:init
```

Команда выполняет SQL-схему из `server/sql/schema.sql` через Node (без отдельной установки `psql`).

## 3) Запуск API

```bash
npm --prefix server run dev
```

API будет доступен на `http://localhost:8787`.

Примечание по CORS:
- `CORS_ORIGIN` поддерживает список через запятую.
- Для локальной разработки удобно указать сразу несколько портов, например:
  - `CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:8080`

## Основные эндпоинты

- `GET /health`
- `GET /api/admin/check` - admin
- `GET /api/photos`
- `POST /api/photos` (`multipart/form-data`, поле `files[]`) - admin
- `DELETE /api/photos/:id` - admin

- `GET /api/video-categories`
- `POST /api/video-categories` - admin
- `DELETE /api/video-categories/:id` - admin

- `GET /api/videos`
- `POST /api/videos` (`multipart/form-data`, поля `video`, `preview`) - admin
- `POST /api/videos/:id/play` (для private требуется `password`)
- `DELETE /api/videos/:id` - admin

Admin доступ:
- передай заголовок `x-admin-key: <ADMIN_API_KEY>`

## Формат загрузки видео

`POST /api/videos` принимает поля формы:
- `title` (string)
- `description` (string)
- `categoryId` (uuid)
- `visibility` (`public` | `private`)
- `password` (string, обязательно для `private`)
- `sourceType` (`upload` | `yadisk`)
- `sourceLink` (обязательно для `sourceType=yadisk`)
- `preview` (image file, обязательно)
- `video` (video file, обязательно для `sourceType=upload`)

## Приватные видео

Для private видео:
1. Создай/загрузи видео с `visibility=private`.
2. Открой через `POST /api/videos/:id/play` с `password`.
3. API вернет `streamUrl` (временная signed ссылка).
