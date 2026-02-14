import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { query, withTransaction } from "./db.js";
import {
  deleteManyByKeys,
  getPublicMediaUrl,
  getSignedReadUrl,
  uploadBuffer,
} from "./storage.js";
import { isAdminRequest, requireAdmin } from "./auth.js";
import { buildObjectKey, createHttpError, toHexColor } from "./utils.js";
import { resolveYandexDiskDirectUrl } from "./yadisk.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024,
  },
});

function corsOptions() {
  if (config.corsOrigins.includes("*")) {
    return { origin: true, credentials: false };
  }

  return {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(createHttpError(403, "Origin is not allowed by CORS"));
    },
  };
}

function parsePhotoFormat(value) {
  const format = String(value || "").trim();
  if (format === "single" || format === "group") {
    return format;
  }
  return null;
}

function parseVisibility(value) {
  const visibility = String(value || "").trim();
  if (visibility === "public" || visibility === "private") {
    return visibility;
  }
  return null;
}

function parseSourceType(value) {
  const source = String(value || "").trim();
  if (source === "upload" || source === "yadisk") {
    return source;
  }
  return "upload";
}

function requireText(value, name) {
  const text = String(value || "").trim();
  if (!text) {
    throw createHttpError(400, `${name} is required`);
  }
  return text;
}

function mapPhotoRow(row) {
  const assets = Array.isArray(row.assets) ? row.assets : [];
  const images = assets
    .sort((a, b) => Number(a.order_index) - Number(b.order_index))
    .map((asset) => getPublicMediaUrl(asset.object_key));

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    format: row.format,
    images,
    createdAt: row.created_at,
  };
}

async function listPhotosFromDb() {
  const result = await query(
    `
      SELECT
        w.id,
        w.title,
        w.description,
        w.format,
        w.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'object_key', a.object_key,
              'order_index', a.order_index
            ) ORDER BY a.order_index
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) AS assets
      FROM photo_works w
      LEFT JOIN photo_assets a ON a.work_id = w.id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `,
  );

  return result.rows.map(mapPhotoRow);
}

function mapCategoryRow(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

async function listCategoriesFromDb() {
  const result = await query(
    `SELECT id, name, color, created_at FROM video_categories ORDER BY name ASC`,
  );

  return result.rows.map(mapCategoryRow);
}

async function listVideosRows() {
  const result = await query(
    `
      SELECT
        v.id,
        v.title,
        v.description,
        v.category_id,
        v.visibility,
        v.password_hash,
        v.preview_key,
        v.source_type,
        v.source_link,
        v.video_key,
        v.created_at,
        c.name AS category_name,
        c.color AS category_color
      FROM videos v
      LEFT JOIN video_categories c ON c.id = v.category_id
      ORDER BY v.created_at DESC
    `,
  );

  return result.rows;
}

async function mapVideoRow(row, { admin }) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: {
      id: row.category_id,
      name: row.category_name || "Без категории",
      color: row.category_color || "#2f82ba",
    },
    visibility: row.visibility,
    isLocked: !admin && row.visibility === "private",
    sourceType: row.source_type,
    sourceLink: admin ? row.source_link : undefined,
    previewUrl: getPublicMediaUrl(row.preview_key),
    createdAt: row.created_at,
  };
}

async function ensureCategoryExists(client, categoryId) {
  const result = await client.query(
    `SELECT id, name, color FROM video_categories WHERE id = $1`,
    [categoryId],
  );
  return result.rows[0] || null;
}

async function resolveVideoPlaybackUrl(videoRow, { admin }) {
  if (videoRow.source_type === "yadisk") {
    if (!videoRow.source_link) {
      throw createHttpError(400, "Video source link is not set");
    }
    return resolveYandexDiskDirectUrl(videoRow.source_link);
  }

  if (!videoRow.video_key) {
    throw createHttpError(400, "Video object key is not set");
  }

  if (videoRow.visibility === "public" && !admin) {
    return getPublicMediaUrl(videoRow.video_key);
  }

  return getSignedReadUrl(videoRow.video_key, config.privateUrlTtlSec);
}

function buildApp() {
  if (!config.adminApiKey || config.adminApiKey === "dev-insecure-change-me") {
    throw new Error("Set ADMIN_API_KEY in environment before starting API");
  }

  const app = express();

  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", async (req, res, next) => {
    try {
      await query("SELECT 1");
      res.json({ status: "ok" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/check", requireAdmin, (req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/video-categories", async (req, res, next) => {
    try {
      const categories = await listCategoriesFromDb();
      res.json({ items: categories });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/video-categories", requireAdmin, async (req, res, next) => {
    try {
      const name = requireText(req.body.name, "name");
      const color = toHexColor(req.body.color);
      if (!color) {
        throw createHttpError(400, "Invalid color hex. Use #RRGGBB");
      }

      const result = await query(
        `
          INSERT INTO video_categories (name, color)
          VALUES ($1, $2)
          RETURNING id, name, color, created_at
        `,
        [name, color],
      );

      res.status(201).json({ item: mapCategoryRow(result.rows[0]) });
    } catch (error) {
      if (error?.code === "23505") {
        next(createHttpError(409, "Category with this name already exists"));
        return;
      }
      next(error);
    }
  });

  app.delete("/api/video-categories/:id", requireAdmin, async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await query(
        `DELETE FROM video_categories WHERE id = $1 RETURNING id, name, color, created_at`,
        [id],
      );

      if (!result.rowCount) {
        throw createHttpError(404, "Category not found");
      }

      res.json({ item: mapCategoryRow(result.rows[0]) });
    } catch (error) {
      if (error?.code === "23503") {
        next(createHttpError(409, "Cannot delete category while videos exist in it"));
        return;
      }
      next(error);
    }
  });

  app.get("/api/photos", async (req, res, next) => {
    try {
      const items = await listPhotosFromDb();
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/photos", requireAdmin, upload.array("files", config.maxPhotoFiles), async (req, res, next) => {
    const files = Array.isArray(req.files) ? req.files : [];

    try {
      const title = requireText(req.body.title, "title");
      const description = requireText(req.body.description, "description");
      const format = parsePhotoFormat(req.body.format);

      if (!format) {
        throw createHttpError(400, "Invalid photo format");
      }

      if (!files.length) {
        throw createHttpError(400, "At least one image file is required");
      }

      if (format === "single" && files.length !== 1) {
        throw createHttpError(400, "Single photo work requires exactly one image");
      }

      if (format === "group" && files.length < 2) {
        throw createHttpError(400, "Group photo work requires at least two images");
      }

      const work = await withTransaction(async (client) => {
        const createWork = await client.query(
          `
            INSERT INTO photo_works (title, description, format)
            VALUES ($1, $2, $3)
            RETURNING id, title, description, format, created_at
          `,
          [title, description, format],
        );

        const workRow = createWork.rows[0];
        const uploadedKeys = [];

        try {
          for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            if (!file.mimetype.startsWith("image/")) {
              throw createHttpError(400, "All files in photo upload must be images");
            }

            const key = buildObjectKey(`photos/${workRow.id}`, file.originalname);
            await uploadBuffer({
              key,
              buffer: file.buffer,
              mimeType: file.mimetype,
            });

            uploadedKeys.push(key);

            await client.query(
              `
                INSERT INTO photo_assets (work_id, object_key, order_index, mime_type)
                VALUES ($1, $2, $3, $4)
              `,
              [workRow.id, key, i, file.mimetype],
            );
          }
        } catch (error) {
          await deleteManyByKeys(uploadedKeys);
          throw error;
        }

        const assetsResult = await client.query(
          `
            SELECT id, object_key, order_index
            FROM photo_assets
            WHERE work_id = $1
            ORDER BY order_index ASC
          `,
          [workRow.id],
        );

        return mapPhotoRow({
          ...workRow,
          assets: assetsResult.rows,
        });
      });

      res.status(201).json({ item: work });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/photos/:id", requireAdmin, async (req, res, next) => {
    try {
      const { id } = req.params;

      const deleted = await withTransaction(async (client) => {
        const getAssets = await client.query(
          `SELECT object_key FROM photo_assets WHERE work_id = $1`,
          [id],
        );

        const removeWork = await client.query(
          `DELETE FROM photo_works WHERE id = $1 RETURNING id, title, description, format, created_at`,
          [id],
        );

        if (!removeWork.rowCount) {
          throw createHttpError(404, "Photo work not found");
        }

        return {
          row: removeWork.rows[0],
          keys: getAssets.rows.map((row) => row.object_key),
        };
      });

      await deleteManyByKeys(deleted.keys);

      res.json({
        item: {
          id: deleted.row.id,
          title: deleted.row.title,
          description: deleted.row.description,
          format: deleted.row.format,
          createdAt: deleted.row.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/videos", async (req, res, next) => {
    try {
      const admin = isAdminRequest(req);
      const rows = await listVideosRows();
      const items = await Promise.all(rows.map((row) => mapVideoRow(row, { admin })));
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/videos", requireAdmin, upload.fields([
    { name: "video", maxCount: 1 },
    { name: "preview", maxCount: 1 },
  ]), async (req, res, next) => {
    const files = req.files || {};

    try {
      const title = requireText(req.body.title, "title");
      const description = requireText(req.body.description, "description");
      const categoryId = requireText(req.body.categoryId, "categoryId");
      const visibility = parseVisibility(req.body.visibility);
      const sourceType = parseSourceType(req.body.sourceType);
      const sourceLink = String(req.body.sourceLink || "").trim();
      const password = String(req.body.password || "").trim();

      if (!visibility) {
        throw createHttpError(400, "Invalid visibility");
      }

      if (visibility === "private" && !password) {
        throw createHttpError(400, "Password is required for private video");
      }

      const previewFile = files.preview?.[0] || null;
      const videoFile = files.video?.[0] || null;

      if (!previewFile) {
        throw createHttpError(400, "Preview image is required");
      }

      if (!previewFile.mimetype.startsWith("image/")) {
        throw createHttpError(400, "Preview must be an image file");
      }

      if (sourceType === "upload") {
        if (!videoFile) {
          throw createHttpError(400, "Video file is required for upload source");
        }

        if (!videoFile.mimetype.startsWith("video/")) {
          throw createHttpError(400, "Uploaded video must be a video file");
        }
      }

      if (sourceType === "yadisk" && !sourceLink) {
        throw createHttpError(400, "Yandex Disk public link is required for yadisk source");
      }

      if (sourceType === "yadisk") {
        await resolveYandexDiskDirectUrl(sourceLink);
      }

      const item = await withTransaction(async (client) => {
        const category = await ensureCategoryExists(client, categoryId);
        if (!category) {
          throw createHttpError(404, "Video category not found");
        }

        const uploadedKeys = [];

        try {
          const previewKey = buildObjectKey(`videos/previews/${categoryId}`, previewFile.originalname);
          await uploadBuffer({
            key: previewKey,
            buffer: previewFile.buffer,
            mimeType: previewFile.mimetype,
          });
          uploadedKeys.push(previewKey);

          let videoKey = null;
          if (sourceType === "upload" && videoFile) {
            videoKey = buildObjectKey(`videos/files/${categoryId}`, videoFile.originalname);
            await uploadBuffer({
              key: videoKey,
              buffer: videoFile.buffer,
              mimeType: videoFile.mimetype,
            });
            uploadedKeys.push(videoKey);
          }

          const passwordHash = visibility === "private" ? await bcrypt.hash(password, 12) : null;

          const created = await client.query(
            `
              INSERT INTO videos (
                title,
                description,
                category_id,
                visibility,
                password_hash,
                preview_key,
                source_type,
                source_link,
                video_key
              )
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
              RETURNING
                id,
                title,
                description,
                category_id,
                visibility,
                password_hash,
                preview_key,
                source_type,
                source_link,
                video_key,
                created_at
            `,
            [
              title,
              description,
              categoryId,
              visibility,
              passwordHash,
              previewKey,
              sourceType,
              sourceType === "yadisk" ? sourceLink : null,
              videoKey,
            ],
          );

          return mapVideoRow(
            {
              ...created.rows[0],
              category_name: category.name,
              category_color: category.color,
            },
            { admin: true },
          );
        } catch (error) {
          await deleteManyByKeys(uploadedKeys);
          throw error;
        }
      });

      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/videos/:id/play", async (req, res, next) => {
    try {
      const { id } = req.params;
      const admin = isAdminRequest(req);

      const found = await query(
        `
          SELECT
            v.id,
            v.visibility,
            v.password_hash,
            v.source_type,
            v.source_link,
            v.video_key
          FROM videos v
          WHERE v.id = $1
        `,
        [id],
      );

      const video = found.rows[0];
      if (!video) {
        throw createHttpError(404, "Video not found");
      }

      if (!admin && video.visibility === "private") {
        const password = String(req.body?.password || "").trim();
        if (!password) {
          throw createHttpError(401, "Password is required for private video");
        }

        const valid = await bcrypt.compare(password, video.password_hash || "");
        if (!valid) {
          throw createHttpError(401, "Invalid password");
        }
      }

      const streamUrl = await resolveVideoPlaybackUrl(video, { admin });

      res.json({
        streamUrl,
        expiresInSec:
          video.source_type === "upload" && (video.visibility === "private" || admin)
            ? config.privateUrlTtlSec
            : null,
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/videos/:id", requireAdmin, async (req, res, next) => {
    try {
      const { id } = req.params;

      const deleted = await withTransaction(async (client) => {
        const result = await client.query(
          `
            DELETE FROM videos
            WHERE id = $1
            RETURNING id, preview_key, video_key, source_type
          `,
          [id],
        );

        if (!result.rowCount) {
          throw createHttpError(404, "Video not found");
        }

        return result.rows[0];
      });

      const keysToDelete = [deleted.preview_key];
      if (deleted.source_type === "upload") {
        keysToDelete.push(deleted.video_key);
      }
      await deleteManyByKeys(keysToDelete);

      res.json({
        item: {
          id: deleted.id,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: `Upload too large. Max file size is ${config.maxUploadMb} MB`,
        });
        return;
      }

      res.status(400).json({ error: `Upload error: ${error.message}` });
      return;
    }

    const status = error?.status || 500;
    const message =
      status >= 500
        ? "Internal server error"
        : error?.message || "Request failed";

    if (status >= 500) {
      // eslint-disable-next-line no-console
      console.error(error);
    }

    res.status(status).json({ error: message });
  });

  return app;
}

export { buildApp };
